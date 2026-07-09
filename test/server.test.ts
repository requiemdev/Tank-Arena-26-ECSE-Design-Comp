import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
  });

  it('starts countdown once and rejects duplicate start requests while in progress', async (t) => {
    const engine = new GameEngine();
    const app = buildServer({ gameEngine: engine, logger: false });
    t.after(async () => {
      engine.resetEngine();
      await app.close();
    });

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

  it('applies hit requests to valid players and rejects invalid player params', async (t) => {
    const engine = new GameEngine();
    const app = buildServer({ gameEngine: engine, logger: false });
    t.after(async () => {
      await app.close();
    });
    engine.getState().status = 'ACTIVE';

    const hitResponse = await app.inject({
      method: 'POST',
      url: '/hit/p2'
    });
    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/hit/p3'
    });

    assert.equal(hitResponse.statusCode, 202);
    assert.equal(hitResponse.json().state.players.p2.health, 90);
    assert.equal(hitResponse.json().state.players.p1.score, 10);
    assert.equal(invalidResponse.statusCode, 400);
    assert.deepEqual(invalidResponse.json(), {
      error: 'player must be p1 or p2'
    });
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
