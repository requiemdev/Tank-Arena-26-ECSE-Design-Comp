import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WebSocket } from 'ws';
import {
  isClientType,
  isPlayerSlot,
  parsePlayerInputs,
  publicGameState,
  type GameState
} from '../src/types.js';

describe('type guards', () => {
  it('accept only supported player slots', () => {
    assert.equal(isPlayerSlot('p1'), true);
    assert.equal(isPlayerSlot('p2'), true);
    assert.equal(isPlayerSlot('p3'), false);
    assert.equal(isPlayerSlot(undefined), false);
  });

  it('accept only supported client types', () => {
    assert.equal(isClientType('controller'), true);
    assert.equal(isClientType('tank'), true);
    assert.equal(isClientType('spectator'), true);
    assert.equal(isClientType('admin'), false);
    assert.equal(isClientType(null), false);
  });
});

describe('parsePlayerInputs', () => {
  it('parses required controls and optional telemetry', () => {
    assert.deepEqual(
      parsePlayerInputs(
        JSON.stringify({
          throttle: 0.75,
          steering: -0.25,
          turret: 15,
          fire: true,
          left: true,
          right: false,
          seq: 42,
          ts: 1_800_000
        })
      ),
      {
        throttle: 0.75,
        steering: -0.25,
        turret: 15,
        fire: true,
        left: true,
        right: false,
        seq: 42,
        ts: 1_800_000
      }
    );
  });

  it('normalizes raw nippleJS joystick move data into server controls', () => {
    assert.deepEqual(
      parsePlayerInputs(
        JSON.stringify({
          vector: {
            x: -0.4,
            y: 0.8
          },
          direction: {
            x: 'left',
            y: 'up',
            angle: 'up'
          }
        })
      ),
      {
        throttle: 0.8,
        steering: -0.4,
        fire: undefined,
        left: undefined,
        right: undefined,
        seq: undefined,
        ts: undefined
      }
    );
  });

  it('normalizes nested nippleJS event payloads and clamps vector values', () => {
    assert.deepEqual(
      parsePlayerInputs(
        JSON.stringify({
          type: 'move',
          data: {
            vector: {
              x: 1.25,
              y: -1.5
            },
            direction: {
              x: 'right',
              y: 'down',
              angle: 'down'
            }
          },
          fire: true,
          left: false,
          right: true,
          seq: 7,
          ts: 1_800_001
        })
      ),
      {
        throttle: -1,
        steering: 1,
        fire: true,
        left: false,
        right: true,
        seq: 7,
        ts: 1_800_001
      }
    );
  });

  it('rejects malformed or incomplete payloads', () => {
    assert.equal(parsePlayerInputs('{'), null);
    assert.equal(parsePlayerInputs('null'), null);
    assert.equal(parsePlayerInputs(JSON.stringify({ throttle: 1 })), null);
    assert.equal(parsePlayerInputs(JSON.stringify({ throttle: '1', steering: 0 })), null);
  });
});

describe('publicGameState', () => {
  it('removes socket objects while retaining connection flags', () => {
    const tankSocket = { readyState: WebSocket.OPEN };
    const controllerSocket = { readyState: WebSocket.OPEN };
    const state: GameState = {
      matchId: 'match-1',
      status: 'ACTIVE',
      countdownSeconds: 0,
      remainingSeconds: 90,
      winner: null,
      players: {
        p1: {
          id: 'p1',
          username: 'Ada',
          health: 100,
          score: 10,
          ready: true,
          socket: tankSocket as WebSocket,
          controllerSocket: controllerSocket as WebSocket
        },
        p2: {
          id: 'p2',
          username: 'Grace',
          health: 80,
          score: 0,
          ready: false,
          socket: null,
          controllerSocket: null
        }
      }
    };

    const publicState = publicGameState(state);

    assert.equal(publicState.players.p1.tankConnected, true);
    assert.equal(publicState.players.p1.controllerConnected, true);
    assert.equal(publicState.players.p1.ready, true);
    assert.equal(publicState.players.p2.tankConnected, false);
    assert.equal(publicState.players.p2.controllerConnected, false);
    assert.equal(publicState.players.p2.ready, false);
    assert.equal('socket' in publicState.players.p1, false);
    assert.equal('controllerSocket' in publicState.players.p1, false);
  });
});
