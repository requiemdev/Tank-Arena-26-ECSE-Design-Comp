import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WebSocket } from 'ws';
import { GameEngine } from '../src/gameEngine.js';
import type { MatchResult } from '../src/types.js';

interface FakeSocket {
  readyState: number;
  sent: string[];
  send(message: string): void;
}

function createOpenSocket(): WebSocket & FakeSocket {
  const socket: FakeSocket = {
    readyState: WebSocket.OPEN,
    sent: [],
    send(message: string) {
      socket.sent.push(message); 
    }
  };

  return socket as unknown as WebSocket & FakeSocket;
}

describe('GameEngine', () => {
  it('starts in a lobby state with default players and no winner', () => {
    const engine = new GameEngine();

    assert.match(engine.getState().matchId, /^[0-9a-f-]{36}$/i);
    assert.deepEqual(engine.getPublicState(), {
      matchId: engine.getState().matchId,
      status: 'LOBBY',
      countdownSeconds: 0,
      remainingSeconds: 120,
      winner: null,
      players: {
        p1: {
          id: 'p1',
          username: 'Player 1',
          health: 100,
          score: 0,
          lastHitDirection: null,
          ready: false,
          controllerConnected: false,
          tankConnected: false
        },
        p2: {
          id: 'p2',
          username: 'Player 2',
          health: 100,
          score: 0,
          lastHitDirection: null,
          ready: false,
          controllerConnected: false,
          tankConnected: false
        }
      }
    });
  });

  it('pushes the current state and live hit updates to spectators', () => {
    const engine = new GameEngine();
    const spectator = createOpenSocket();

    engine.addSpectator(spectator);

    const initialMessage = JSON.parse(spectator.sent[0] ?? '{}');
    assert.equal(initialMessage.type, 'state');
    assert.equal(initialMessage.state.status, 'LOBBY');
    assert.equal(initialMessage.state.players.p2.health, 100);

    engine.getState().status = 'ACTIVE';
    engine.registerHit('p2');

    const hitMessage = JSON.parse(spectator.sent[1] ?? '{}');
    assert.equal(hitMessage.type, 'state');
    assert.equal(hitMessage.state.status, 'ACTIVE');
    assert.equal(hitMessage.state.players.p2.health, 80);
    assert.equal(hitMessage.state.remainingSeconds, 120);

    engine.removeSpectator(spectator);
    engine.registerHit('p2');
    assert.equal(spectator.sent.length, 2);
  });

  it('forwards valid active controller input to the matching tank only', () => {
    const engine = new GameEngine();
    const p1Tank = createOpenSocket();
    const p2Tank = createOpenSocket();
    const payload = JSON.stringify({
      throttle: 1,
      steering: -0.5,
      fire: true,
      left: true,
      right: false
    });

    engine.attachTank('p1', p1Tank);
    engine.attachTank('p2', p2Tank);
    engine.getState().status = 'ACTIVE';

    assert.equal(engine.handleControllerInput('p1', payload), true);
    assert.deepEqual(p1Tank.sent, [payload]);
    assert.deepEqual(p2Tank.sent, []);

    assert.equal(engine.handleControllerInput('p1', JSON.stringify({ throttle: 1 })), false);
    assert.deepEqual(p1Tank.sent, [payload]);

    engine.getState().status = 'LOBBY';
    assert.equal(engine.handleControllerInput('p1', payload), false);
    assert.deepEqual(p1Tank.sent, [payload]);
  });

  it('forwards normalized nippleJS joystick input to the tank', () => {
    const engine = new GameEngine();
    const p1Tank = createOpenSocket();
    const payload = JSON.stringify({
      type: 'move',
      data: {
        vector: {
          x: 0.3,
          y: 0.75
        },
        direction: {
          x: 'right',
          y: 'up',
          angle: 'up'
        }
      }
    });

    engine.attachTank('p1', p1Tank);
    engine.getState().status = 'ACTIVE';

    assert.equal(engine.handleControllerInput('p1', payload), true);
    assert.deepEqual(JSON.parse(p1Tank.sent[0] ?? '{}'), {
      throttle: 0.75,
      steering: 0.3
    });
  });

  it('ends a match after lethal damage and queues a single result', () => {
    const results: MatchResult[] = [];
    const engine = new GameEngine((result) => {
      results.push(result);
    });
    const state = engine.getState();
    state.status = 'ACTIVE';
    state.players.p1.username = 'Ada';
    state.players.p2.username = 'Grace';
    state.players.p1.ready = true;
    state.players.p2.ready = true;
    state.remainingSeconds = 87;

    for (let hit = 0; hit < 5; hit += 1) {
      engine.registerHit('p2');
    }

    assert.equal(engine.getState().status, 'ENDED');
    assert.equal(engine.getState().winner, 'p1');
    assert.equal(engine.getState().players.p2.health, 0);
    assert.equal(engine.getState().players.p1.score, 100);
    assert.equal(engine.getState().players.p1.ready, false);
    assert.equal(engine.getState().players.p2.ready, false);
    assert.equal(results.length, 1);
    assert.deepEqual(
      {
        id: results[0]?.id,
        player1_name: results[0]?.player1_name,
        player2_name: results[0]?.player2_name,
        winner_name: results[0]?.winner_name,
        player1_score: results[0]?.player1_score,
        player2_score: results[0]?.player2_score,
        game_duration_seconds: results[0]?.game_duration_seconds
      },
      {
        id: engine.getState().matchId,
        player1_name: 'Ada',
        player2_name: 'Grace',
        winner_name: 'Ada',
        player1_score: 100,
        player2_score: 0,
        game_duration_seconds: 33
      }
    );
    assert.doesNotThrow(() => new Date(results[0]?.created_at ?? '').toISOString());

    engine.registerHit('p2');
    assert.equal(results.length, 1);
  });

  it('records the latest hit direction without changing hit damage', () => {
    const engine = new GameEngine();
    engine.getState().status = 'ACTIVE';

    engine.registerHit('p2', 'rear-left');

    assert.equal(engine.getPublicState().players.p2.health, 80);
    assert.equal(engine.getPublicState().players.p2.lastHitDirection, 'rear-left');
    assert.equal(engine.getPublicState().players.p1.score, 20);
  });

  it('resets match stats while preserving attached clients and usernames', () => {
    const engine = new GameEngine();
    const tank = createOpenSocket();
    const controller = createOpenSocket();
    const firstMatchId = engine.getState().matchId;

    engine.attachTank('p1', tank);
    engine.attachController('p1', controller, 'Ada');
    engine.getState().status = 'ACTIVE';
    engine.getState().players.p1.score = 20;
    engine.getState().players.p1.health = 70;

    engine.resetEngine();

    const publicState = engine.getPublicState();
    assert.notEqual(publicState.matchId, firstMatchId);
    assert.equal(publicState.status, 'LOBBY');
    assert.equal(publicState.players.p1.username, 'Ada');
    assert.equal(publicState.players.p1.score, 0);
    assert.equal(publicState.players.p1.health, 100);
    assert.equal(publicState.players.p1.lastHitDirection, null);
    assert.equal(publicState.players.p1.ready, false);
    assert.equal(publicState.players.p1.tankConnected, true);
    assert.equal(publicState.players.p1.controllerConnected, true);
  });

  it('keeps the controller player name when a tank supplies a device name', () => {
    const engine = new GameEngine();
    const controller = createOpenSocket();
    const tank = createOpenSocket();

    engine.attachController('p1', controller, 'Ada');
    engine.attachTank('p1', tank, 'esp32-tank');

    assert.equal(engine.getPublicState().players.p1.username, 'Ada');
  });

  it('automatically starts countdown once both connected controllers are ready', () => {
    const engine = new GameEngine();
    const p1Controller = createOpenSocket();
    const p2Controller = createOpenSocket();

    assert.equal(engine.startCountdown(), false);

    assert.equal(engine.attachController('p1', p1Controller), true);
    assert.equal(engine.setPlayerReady('p1', true), true);
    assert.equal(engine.startCountdown(), false);

    assert.equal(engine.attachController('p2', p2Controller), true);
    assert.equal(engine.setPlayerReady('p2', true), true);
    assert.equal(engine.getPublicState().status, 'COUNTDOWN');

    engine.resetEngine();
  });

  it('ends countdown without queuing a result when a controller disconnects', () => {
    const results: MatchResult[] = [];
    const engine = new GameEngine((result) => {
      results.push(result);
    });
    const p1Controller = createOpenSocket();
    const p2Controller = createOpenSocket();

    engine.attachController('p1', p1Controller);
    engine.attachController('p2', p2Controller);
    engine.setPlayerReady('p1', true);
    engine.setPlayerReady('p2', true);

    assert.equal(engine.getPublicState().status, 'COUNTDOWN');

    engine.disconnectController('p1', p1Controller);

    const publicState = engine.getPublicState();
    assert.equal(publicState.status, 'ENDED');
    assert.equal(publicState.winner, null);
    assert.equal(publicState.players.p1.controllerConnected, false);
    assert.equal(publicState.players.p1.ready, false);
    assert.equal(publicState.players.p2.controllerConnected, true);
    assert.equal(publicState.players.p2.ready, false);
    assert.equal(results.length, 0);
  });

  it('does not queue an active match stopped before a player loses', () => {
    const results: MatchResult[] = [];
    const engine = new GameEngine((result) => {
      results.push(result);
    });

    engine.getState().status = 'ACTIVE';
    engine.getState().players.p1.score = 20;
    engine.disconnectController('p2');

    assert.equal(engine.getPublicState().status, 'ENDED');
    assert.equal(engine.getPublicState().winner, 'p1');
    assert.equal(engine.getPublicState().players.p1.health, 100);
    assert.equal(engine.getPublicState().players.p2.health, 100);
    assert.equal(results.length, 0);
  });

  it('rejects duplicate live controllers and tanks for a player slot', () => {
    const engine = new GameEngine();

    assert.equal(engine.attachController('p1', createOpenSocket()), true);
    assert.equal(engine.attachController('p1', createOpenSocket()), false);
    assert.equal(engine.attachTank('p1', createOpenSocket()), true);
    assert.equal(engine.attachTank('p1', createOpenSocket()), false);
  });
});
