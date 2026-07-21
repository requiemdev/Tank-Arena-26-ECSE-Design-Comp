import { readFile } from 'node:fs/promises';
import Fastify from 'fastify';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { GameEngine } from './gameEngine.js';
import { isClientType, isPlayerSlot, type PlayerSlot } from './types.js';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = '0.0.0.0';
const CONTROLLER_HTML_URL = new URL('../public/controller.html', import.meta.url);
const LEADERBOARD_HTML_URL = new URL('../public/leaderboard.html', import.meta.url);

export interface EdgeServerOptions {
  gameEngine?: GameEngine;
  logger?: boolean;
}

export function buildServer(options: EdgeServerOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? false
  });
  const gameEngine = options.gameEngine ?? new GameEngine();
  const wss = new WebSocketServer({
    server: app.server,
    path: '/connect'
  });

  app.get('/health', async () => ({
    ok: true,
    status: gameEngine.getState().status
  }));

  app.get('/', async (_request, reply) => reply.redirect('/controller'));

  app.get('/controller', async (_request, reply) => {
    const html = await readFile(CONTROLLER_HTML_URL, 'utf8');
    return reply.type('text/html; charset=utf-8').send(html);
  });

  app.get('/state', async () => gameEngine.getPublicState());

  app.get('/leaderboard', async (_request, reply) => {
    const html = await readFile(LEADERBOARD_HTML_URL, 'utf8');

    return reply
        .type('text/html; charset=utf-8')
        .send(html);
});

  app.get('/api/leaderboard', async () => {

    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );


    const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('created_at', {
            ascending:false
        })
        .limit(50);


    if(error){
        throw error;
    }


    return data;

});

  app.post('/start', async (_request, reply) => {
    const started = gameEngine.startCountdown();
    return reply.code(started ? 202 : 409).send({ //202 accepted, 409 conflict
      started,
      state: gameEngine.getPublicState()
    });
  });

  app.post('/reset', async () => {
    gameEngine.resetEngine();
    return {
      state: gameEngine.getPublicState()
    };
  });

  wss.on('connection', (socket, request) => {
    const url = new URL(request.url ?? '/connect', `http://${request.headers.host ?? 'localhost'}`);
    const type = url.searchParams.get('type');
    const player = url.searchParams.get('player');
    const username = url.searchParams.get('username') ?? undefined;

    if (!isClientType(type)) {
      socket.close(1008, 'query param type must be controller, tank, or spectator');
      return;
    }

    if (type === 'spectator') {
      routeSpectator(gameEngine, socket);
      return;
    }

    if (!isPlayerSlot(player)) {
      socket.close(1008, 'query param player must be p1 or p2');
      return;
    }

    if (type === 'controller') {
      routeController(gameEngine, socket, player, username);
      return;
    }

    routeTank(gameEngine, socket, player, username);
  });

  app.addHook('onClose', (_instance, done) => {
    wss.close(() => {
      done();
    });
  });

  return app;
}

function routeController(gameEngine: GameEngine, socket: WebSocket, player: PlayerSlot, username?: string): void {
  if (!gameEngine.attachController(player, socket, username)) {
    socket.close(1008, `${player} controller is already connected`);
    return;
  }

  console.info(`${player} controller connected${username ? ` as ${username}` : ''}`);

  socket.on('message', (data) => {
    const payload = rawDataToString(data);
    if (handleControlMessage(gameEngine, payload, player, socket)) {
      return;
    }

    gameEngine.handleControllerInput(player, payload);
  });

  socket.on('close', () => {
    console.warn(`${player} controller disconnected`);
    gameEngine.disconnectController(player, socket);
  });

  socket.on('error', (error) => {
    console.warn(`${player} controller socket error:`, error);
  });
}

function routeTank(gameEngine: GameEngine, socket: WebSocket, player: PlayerSlot, username?: string): void {
  if (!gameEngine.attachTank(player, socket, username)) {
    socket.close(1008, `${player} tank is already connected`);
    return;
  }

  console.info(`${player} tank connected${username ? ` as ${username}` : ''}`);

  socket.on('message', (data) => {
    const payload = rawDataToString(data);
    if (!handleControlMessage(gameEngine, payload, player, socket)) {
      socket.send(JSON.stringify({ type: 'ack', source: 'tank', received: true }));
    }
  });

  socket.on('close', () => {
    console.warn(`${player} tank disconnected`);
    gameEngine.disconnectTank(player, socket);
  });

  socket.on('error', (error) => {
    console.warn(`${player} tank socket error:`, error);
  });
}

function routeSpectator(gameEngine: GameEngine, socket: WebSocket): void {
  gameEngine.addSpectator(socket);

  socket.on('message', (data) => {
    handleControlMessage(gameEngine, rawDataToString(data), undefined, socket);
  });

  socket.on('close', () => {
    gameEngine.removeSpectator(socket);
  });

  socket.on('error', (error) => {
    console.warn('spectator socket error:', error);
  });
}

function handleControlMessage(
  gameEngine: GameEngine,
  payload: string,
  defaultPlayer?: PlayerSlot,
  socket?: WebSocket
): boolean {
  const message = parseControlMessage(payload);
  if (!message) {
    return false;
  }

  switch (message.type) {
    case 'start':
      gameEngine.startCountdown();
      return true;
    case 'reset':
      gameEngine.resetEngine();
      return true;
    case 'ready':
      if (defaultPlayer) {
        gameEngine.setPlayerReady(defaultPlayer, message.ready);
      }
      return true;
    case 'hit': {
      const target = message.target ?? defaultPlayer;
      if (!target) {
        return true;
      }
      gameEngine.registerHit(target, message.direction);
      return true;
    }
    case 'state':
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'state', state: gameEngine.getPublicState() }));
      }
      return true;
  }
}

function parseControlMessage(payload: string):
  | { type: 'start' }
  | { type: 'reset' }
  | { type: 'ready'; ready: boolean }
  | { type: 'state' }
  | { type: 'hit'; target?: PlayerSlot; direction?: string }
  | null {
  try {
    const data: unknown = JSON.parse(payload);
    if (!data || typeof data !== 'object') {
      return null;
    }

    const record = data as Record<string, unknown>;
    if (record.type === 'start' || record.type === 'reset' || record.type === 'state') {
      return { type: record.type };
    }

    if (record.type === 'ready') {
      return { type: 'ready', ready: record.ready !== false };
    }

    if (record.type === 'hit') {
      const target = isPlayerSlot(record.target) ? record.target : undefined;
      const direction = typeof record.direction === 'string' ? record.direction : undefined;
      return { type: 'hit', target, direction };
    }

    return null;
  } catch {
    return null;
  }
}

function rawDataToString(data: RawData): string {
  if (typeof data === 'string') {
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8');
  }

  return Buffer.from(data).toString('utf8');
}

async function shutdown(
  app: ReturnType<typeof buildServer>,
  stopQueueWorker: () => void,
  signal: NodeJS.Signals
): Promise<void> {
  app.log.info({ signal }, 'shutting down edge server');
  stopQueueWorker();
  await app.close();
}

export async function startServer(): Promise<void> {
  const { enqueueMatchResult, startQueueWorker, stopQueueWorker } = await import('./queueWorker.js');
  const app = buildServer({
    gameEngine: new GameEngine(enqueueMatchResult)
  });

  process.once('SIGINT', (signal) => {
    void shutdown(app, stopQueueWorker, signal);
  });

  process.once('SIGTERM', (signal) => {
    void shutdown(app, stopQueueWorker, signal);
  });

  startQueueWorker();

  try {
    await app.listen({
      port: PORT,
      host: HOST
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

import { pathToFileURL } from 'node:url';

if(import.meta.url === pathToFileURL(process.argv[1]).href){
  await startServer();
}

// if (import.meta.url === `file://${process.argv[1]}`) {
//   await startServer();
// }
