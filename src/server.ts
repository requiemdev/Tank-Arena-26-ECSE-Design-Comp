import Fastify from 'fastify';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { GameEngine } from './gameEngine.js';
import { enqueueMatchResult, startQueueWorker, stopQueueWorker } from './queueWorker.js';
import { isClientType, isPlayerSlot, type PlayerSlot } from './types.js';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = '0.0.0.0';

const app = Fastify({
  logger: true
});
const gameEngine = new GameEngine(enqueueMatchResult);
const wss = new WebSocketServer({
  server: app.server,
  path: '/connect'
});

app.get('/health', async () => ({
  ok: true,
  status: gameEngine.getState().status
}));

app.get('/state', async () => gameEngine.getPublicState());

app.post('/start', async (_request, reply) => {
  const started = gameEngine.startCountdown();
  return reply.code(started ? 202 : 409).send({
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

app.post<{ Params: { player: string } }>('/hit/:player', async (request, reply) => {
  const { player } = request.params;
  if (!isPlayerSlot(player)) {
    return reply.code(400).send({ error: 'player must be p1 or p2' });
  }

  gameEngine.registerHit(player);
  return reply.code(202).send({
    state: gameEngine.getPublicState()
  });
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
    routeSpectator(socket);
    return;
  }

  if (!isPlayerSlot(player)) {
    socket.close(1008, 'query param player must be p1 or p2');
    return;
  }

  if (type === 'controller') {
    routeController(socket, player, username);
    return;
  }

  routeTank(socket, player, username);
});

function routeController(socket: WebSocket, player: PlayerSlot, username?: string): void {
  gameEngine.attachController(player, socket, username);

  socket.on('message', (data) => {
    const payload = rawDataToString(data);
    if (handleControlMessage(payload, player)) {
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

function routeTank(socket: WebSocket, player: PlayerSlot, username?: string): void {
  gameEngine.attachTank(player, socket, username);

  socket.on('message', (data) => {
    const payload = rawDataToString(data);
    if (!handleControlMessage(payload, player)) {
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

function routeSpectator(socket: WebSocket): void {
  gameEngine.addSpectator(socket);

  socket.on('message', (data) => {
    handleControlMessage(rawDataToString(data));
  });

  socket.on('close', () => {
    gameEngine.removeSpectator(socket);
  });

  socket.on('error', (error) => {
    console.warn('spectator socket error:', error);
  });
}

function handleControlMessage(payload: string, defaultPlayer?: PlayerSlot): boolean {
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
    case 'hit': {
      const target = message.target ?? defaultPlayer;
      if (!target) {
        return true;
      }
      gameEngine.registerHit(target);
      return true;
    }
    case 'state':
      return true;
  }
}

function parseControlMessage(payload: string):
  | { type: 'start' }
  | { type: 'reset' }
  | { type: 'state' }
  | { type: 'hit'; target?: PlayerSlot }
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

    if (record.type === 'hit') {
      const target = isPlayerSlot(record.target) ? record.target : undefined;
      return { type: 'hit', target };
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

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, 'shutting down edge server');
  stopQueueWorker();
  wss.close();
  await app.close();
}

process.once('SIGINT', (signal) => {
  void shutdown(signal);
});

process.once('SIGTERM', (signal) => {
  void shutdown(signal);
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
