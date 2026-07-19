import type { WebSocket } from 'ws';

export type PlayerSlot = 'p1' | 'p2';

export type GameStatus = 'LOBBY' | 'COUNTDOWN' | 'ACTIVE' | 'ENDED';

export interface PlayerState {
  id: PlayerSlot;
  username: string;
  health: number;
  score: number;
  ready: boolean;
  socket: WebSocket | null;
  controllerSocket: WebSocket | null;
}

export interface GameState {
  matchId: string;
  status: GameStatus;
  countdownSeconds: number;
  remainingSeconds: number;
  winner: PlayerSlot | null;
  players: {
    p1: PlayerState;
    p2: PlayerState;
  };
}

export interface PlayerInputs {
  throttle: number;
  steering: number;
  turret?: number;
  fire?: boolean;
  left?: boolean;
  right?: boolean;
  seq?: number;
  ts?: number;
}

export interface MatchResult {
  id: string;
  player1_name: string;
  player2_name: string;
  winner_name: string;
  player1_score: number;
  player2_score: number;
  created_at: string;
}

export type ClientType = 'controller' | 'tank' | 'spectator';

export function isPlayerSlot(value: unknown): value is PlayerSlot {
  return value === 'p1' || value === 'p2';
}

export function isClientType(value: unknown): value is ClientType {
  return value === 'controller' || value === 'tank' || value === 'spectator';
}

export function parsePlayerInputs(payload: string): PlayerInputs | null {
  try {
    const data: unknown = JSON.parse(payload);
    if (!data || typeof data !== 'object') {
      return null;
    }

    const input = data as Record<string, unknown>;
    if (input.left === true && input.right === true) {
      return null;
    }

    if (typeof input.throttle !== 'number' || typeof input.steering !== 'number') {
      return parseNippleInputs(input);
    }

    return {
      throttle: clampAxis(input.throttle),
      steering: clampAxis(input.steering),
      turret: typeof input.turret === 'number' ? input.turret : undefined,
      fire: typeof input.fire === 'boolean' ? input.fire : undefined,
      left: typeof input.left === 'boolean' ? input.left : undefined,
      right: typeof input.right === 'boolean' ? input.right : undefined,
      seq: typeof input.seq === 'number' ? input.seq : undefined,
      ts: typeof input.ts === 'number' ? input.ts : undefined
    };
  } catch {
    return null;
  }
}

function parseNippleInputs(input: Record<string, unknown>): PlayerInputs | null {
  const nestedData = isRecord(input.data) ? input.data : undefined;
  const eventData = nestedData ?? input;
  const vector = isRecord(eventData.vector) ? eventData.vector : null;

  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number') {
    return null;
  }

  return {
    throttle: clampAxis(vector.y),
    steering: clampAxis(vector.x),
    fire: typeof input.fire === 'boolean' ? input.fire : undefined,
    left: typeof input.left === 'boolean' ? input.left : undefined,
    right: typeof input.right === 'boolean' ? input.right : undefined,
    seq: typeof input.seq === 'number' ? input.seq : undefined,
    ts: typeof input.ts === 'number' ? input.ts : undefined
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export function publicGameState(state: GameState): Omit<GameState, 'players'> & {
  players: Record<
    PlayerSlot,
    Omit<PlayerState, 'socket' | 'controllerSocket'> & {
      controllerConnected: boolean;
      tankConnected: boolean;
    }
  >;
} {
  return {
    matchId: state.matchId,
    status: state.status,
    countdownSeconds: state.countdownSeconds,
    remainingSeconds: state.remainingSeconds,
    winner: state.winner,
    players: {
      p1: {
        id: state.players.p1.id,
        username: state.players.p1.username,
        health: state.players.p1.health,
        score: state.players.p1.score,
        ready: state.players.p1.ready,
        controllerConnected: state.players.p1.controllerSocket !== null,
        tankConnected: state.players.p1.socket !== null
      },
      p2: {
        id: state.players.p2.id,
        username: state.players.p2.username,
        health: state.players.p2.health,
        score: state.players.p2.score,
        ready: state.players.p2.ready,
        controllerConnected: state.players.p2.controllerSocket !== null,
        tankConnected: state.players.p2.socket !== null
      }
    }
  };
}
