import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';
import { WebSocket, type RawData } from 'ws';
import { GameEngine } from '../src/gameEngine.js';
import { buildServer } from '../src/server.js';

describe('HTTP implementation', () => {
  it('reports service health and current game status', async (t) => {
    const engine = new GameEngine();
    const app = buildServer({ gameEngine: engine, logger: false });
    t.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      ok: true,
      status: 'LOBBY'
    });
  });

  it('serves the browser controller MVP', async (t) => {
    const app = buildServer({ logger: false });
    t.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: 'GET',
      url: '/controller'
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'] as string, /text\/html/);
    assert.match(response.body, /Tank Controller/);
    assert.match(response.body, /nipplejs/);
    assert.match(response.body, /countdownScreen/);
    assert.match(response.body, /FIRE_COOLDOWN_MS = 2000/);
    assert.match(response.body, /tankLinkIndicator/);
    assert.match(response.body, /<option value="p1">White Tank<\/option>/);
    assert.match(response.body, /<option value="p2">Black Tank<\/option>/);
    assert.doesNotMatch(response.body, /lastHitValue|Last hit from/);
  });

  it('serves the live spectator matchup view', async (t) => {
    const app = buildServer({ logger: false });
    t.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: 'GET',
      url: '/spectator'
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'] as string, /text\/html/);
    assert.match(response.body, /ECSE Tank Arena/);
    assert.match(response.body, /White Tank/);
    assert.match(response.body, /Black Tank/);
    assert.match(response.body, /Hull integrity/);
    assert.match(response.body, /Time remaining/);
    assert.match(response.body, /connect\?type=spectator/);
    assert.match(response.body, /state\.remainingSeconds/);
  });

  it('serves a fastest-games leaderboard without a date column', async (t) => {
    const app = buildServer({ logger: false });
    t.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: 'GET',
      url: '/leaderboard'
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'] as string, /text\/html/);
    assert.match(response.body, /Tank Arena Leaderboard/);
    assert.match(response.body, /<th scope="col">Players<\/th>/);
    assert.match(response.body, /<th scope="col">Winner<\/th>/);
    assert.match(response.body, /<th scope="col">Score<\/th>/);
    assert.match(response.body, /<th scope="col">Game duration<\/th>/);
    assert.match(response.body, /game_duration_seconds/);
    assert.doesNotMatch(response.body, /<th[^>]*>Date<\/th>|created_at/);
  });

  it('returns an empty leaderboard when Supabase is not configured', async (t) => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const app = buildServer({ logger: false });
    t.after(async () => {
      if (originalUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = originalUrl;
      if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
      await app.close();
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/leaderboard'
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), []);
  });

  it('starts countdown once and rejects duplicate start requests while in progress', async (t) => {
    const engine = new GameEngine();
    const app = buildServer({ gameEngine: engine, logger: false });
    t.after(async () => {
      engine.resetEngine();
      await app.close();
    });
    const socket = {
      readyState: 1,
      send() {}
    };
    engine.attachController('p1', socket as never);
    engine.attachController('p2', { ...socket } as never);
    engine.getState().players.p1.ready = true;
    engine.getState().players.p2.ready = true;

    const firstStart = await app.inject({
      method: 'POST',
      url: '/start'
    });
    const duplicateStart = await app.inject({
      method: 'POST',
      url: '/start'
    });

    assert.equal(firstStart.statusCode, 202);
    assert.equal(firstStart.json().started, true);
    assert.equal(firstStart.json().state.status, 'COUNTDOWN');
    assert.equal(duplicateStart.statusCode, 409);
    assert.equal(duplicateStart.json().started, false);
  });

  it('rejects start requests until both controller slots are ready', async (t) => {
    const engine = new GameEngine();
    const app = buildServer({ gameEngine: engine, logger: false });
    t.after(async () => {
      await app.close();
    });

    const response = await app.inject({
      method: 'POST',
      url: '/start'
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().started, false);
    assert.equal(response.json().state.status, 'LOBBY');
  });

  it('applies tank hit messages over the established websocket', async (t) => {
    const engine = new GameEngine();
    const app = buildServer({ gameEngine: engine, logger: false });
    await app.listen({ host: '127.0.0.1', port: 0 });
    engine.getState().status = 'ACTIVE';
    const address = app.server.address() as AddressInfo;
    const tankSocket = new WebSocket(`ws://127.0.0.1:${address.port}/connect?type=tank&player=p2`);
    t.after(async () => {
      engine.getState().status = 'LOBBY';
      await closeSocket(tankSocket);
      await app.close();
    });

    await waitForOpen(tankSocket);
    tankSocket.send(JSON.stringify({ type: 'hit', direction: 'front' }));
    await waitUntil(() => engine.getPublicState().players.p2.health === 80);
    const removedEndpointResponse = await app.inject({
      method: 'POST',
      url: '/hit/p2'
    });

    assert.equal(engine.getPublicState().players.p2.health, 80);
    assert.equal(engine.getPublicState().players.p2.lastHitDirection, 'front');
    assert.equal(engine.getPublicState().players.p1.score, 20);
    assert.equal(removedEndpointResponse.statusCode, 404);
  });

  it('notifies the other controller when a player disconnects during a match', async (t) => {
    const engine = new GameEngine();
    const app = buildServer({ gameEngine: engine, logger: false });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address() as AddressInfo;
    const p1Socket = new WebSocket(`ws://127.0.0.1:${address.port}/connect?type=controller&player=p1`);
    const p2Socket = new WebSocket(`ws://127.0.0.1:${address.port}/connect?type=controller&player=p2`);
    t.after(async () => {
      await closeSocket(p1Socket);
      await closeSocket(p2Socket);
      await app.close();
    });

    await Promise.all([waitForOpen(p1Socket), waitForOpen(p2Socket)]);
    p1Socket.send(JSON.stringify({ type: 'ready', ready: true }));
    p2Socket.send(JSON.stringify({ type: 'ready', ready: true }));
    await waitUntil(() => engine.getPublicState().status === 'COUNTDOWN');

    p1Socket.close();
    const state = await waitForStateStatus(p2Socket, 'ENDED');

    assert.equal(state.status, 'ENDED');
    assert.equal(state.players.p1.controllerConnected, false);
    assert.equal(state.players.p2.controllerConnected, true);
  });

  it('resets the game through the public route', async (t) => {
    const engine = new GameEngine();
    const app = buildServer({ gameEngine: engine, logger: false });
    t.after(async () => {
      await app.close();
    });
    const firstMatchId = engine.getState().matchId;
    engine.getState().status = 'ACTIVE';
    engine.registerHit('p2');

    const response = await app.inject({
      method: 'POST',
      url: '/reset'
    });

    assert.equal(response.statusCode, 200);
    assert.notEqual(response.json().state.matchId, firstMatchId);
    assert.equal(response.json().state.status, 'LOBBY');
    assert.equal(response.json().state.players.p1.score, 0);
    assert.equal(response.json().state.players.p2.health, 100);
  });
});

function waitForOpen(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
}

async function waitUntil(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }
}

function closeSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    socket.once('close', resolve);
    socket.close();
  });
}

function waitForStateStatus(socket: WebSocket, status: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('message', handleMessage);
      reject(new Error(`Timed out waiting for ${status} state`));
    }, 500);

    const handleMessage = (data: RawData) => {
      const message = JSON.parse(data.toString());
      if (message?.type === 'state' && message.state?.status === status) {
        clearTimeout(timeout);
        socket.off('message', handleMessage);
        resolve(message.state);
      }
    };

    socket.on('message', handleMessage);
  });
}
