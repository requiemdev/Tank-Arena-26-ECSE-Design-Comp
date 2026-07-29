import { WebSocket } from 'ws';
import { parsePlayerInputs, type PlayerInputs, type PlayerSlot } from './types.js';

const EDGE_WS_URL = process.env.EDGE_WS_URL ?? 'ws://localhost:8080/connect';
const PLAYER = parsePlayer(process.env.PLAYER ?? 'p1');
const ROBOT_COMMAND_URL = process.env.ROBOT_COMMAND_URL;
const RECONNECT_MS = Number(process.env.RECONNECT_MS ?? 1000);

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

connect();

function connect(): void {
  const url = new URL(EDGE_WS_URL);
  url.searchParams.set('type', 'tank');
  url.searchParams.set('player', PLAYER);
  url.searchParams.set('username', process.env.ROBOT_NAME ?? `${PLAYER}-robot`);

  socket = new WebSocket(url);

  socket.on('open', () => {
    console.log(`Robot client connected to ${url.toString()}`);
  });

  socket.on('message', (data) => {
    void handleCommand(data.toString('utf8'));
  });

  socket.on('close', () => {
    console.warn(`Robot client disconnected; reconnecting in ${RECONNECT_MS}ms`);
    scheduleReconnect();
  });

  socket.on('error', (error) => {
    console.warn('Robot client socket error:', error);
  });
}

async function handleCommand(payload: string): Promise<void> {
  const input = parsePlayerInputs(payload);
  if (!input) {
    console.warn('Ignoring malformed robot command:', payload);
    return;
  }

  const robotCommandUrl = ROBOT_COMMAND_URL;
  if (!robotCommandUrl) {
    console.log('robot-command', JSON.stringify(input));
    return;
  }

  await postRobotCommand(robotCommandUrl, input);
}

async function postRobotCommand(robotCommandUrl: string, input: PlayerInputs): Promise<void> {
  try {
    const response = await fetch(robotCommandUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      console.warn(`Robot command endpoint returned ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to deliver robot command:', error);
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_MS);
}

function parsePlayer(value: string): PlayerSlot {
  if (value === 'p1' || value === 'p2') {
    return value;
  }

  throw new Error('PLAYER must be p1 or p2');
}
