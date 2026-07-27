import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import type { GameState, MatchResult, PlayerSlot } from './types.js';
import { parsePlayerInputs, publicGameState } from './types.js';

type MatchCompleteHandler = (matchData: MatchResult) => void | Promise<void>;
type TimerHandle = ReturnType<typeof setInterval>;

const DEFAULT_MATCH_SECONDS = 120;
const DEFAULT_COUNTDOWN_SECONDS = 3;
const STARTING_HEALTH = 100;
const HIT_DAMAGE = 20;

export class GameEngine {
  private readonly spectators = new Set<WebSocket>();
  private readonly onMatchComplete: MatchCompleteHandler;
  private readonly matchSeconds: number;
  private countdownInterval: TimerHandle | null = null;
  private matchInterval: TimerHandle | null = null;
  private state: GameState;
  private resultQueued = false;

  constructor(onMatchComplete: MatchCompleteHandler = () => undefined, matchSeconds = DEFAULT_MATCH_SECONDS) {
    this.onMatchComplete = onMatchComplete;
    this.matchSeconds = matchSeconds;
    this.state = this.createInitialState();
  }

  getState(): GameState {
    return this.state;
  }

  getPublicState(): ReturnType<typeof publicGameState> {
    return publicGameState(this.state);
  }

  resetEngine(): GameState {
    this.clearTimers();
    this.resultQueued = false;
    const previousPlayers = this.state?.players;
    this.state = this.createInitialState();

    if (previousPlayers) {
      this.state.players.p1.socket = previousPlayers.p1.socket;
      this.state.players.p1.controllerSocket = previousPlayers.p1.controllerSocket;
      this.state.players.p1.username = previousPlayers.p1.username;
      this.state.players.p2.socket = previousPlayers.p2.socket;
      this.state.players.p2.controllerSocket = previousPlayers.p2.controllerSocket;
      this.state.players.p2.username = previousPlayers.p2.username;
    }

    this.broadcastState();
    return this.state;
  }

  attachTank(player: PlayerSlot, socket: WebSocket, _deviceName?: string): boolean {
    const existingSocket = this.state.players[player].socket;
    if (existingSocket && existingSocket.readyState === WebSocket.OPEN) {
      return false;
    }

    this.state.players[player].socket = socket;
    this.broadcastState();
    return true;
  }

  attachController(player: PlayerSlot, socket: WebSocket, username?: string): boolean {
    const existingSocket = this.state.players[player].controllerSocket;
    if (existingSocket && existingSocket.readyState === WebSocket.OPEN) {
      return false;
    }

    this.state.players[player].controllerSocket = socket;
    this.state.players[player].ready = false;
    if (username) {
      this.state.players[player].username = username;
    }
    this.broadcastState();
    return true;
  }

  disconnectTank(player: PlayerSlot, socket?: WebSocket): void {
    if (socket && this.state.players[player].socket !== socket) {
      return;
    }

    this.state.players[player].socket = null;
    this.stopMatchForSafety(`${player} tank disconnected`);
    this.broadcastState();
  }

  disconnectController(player: PlayerSlot, socket?: WebSocket): void {
    if (socket && this.state.players[player].controllerSocket !== socket) {
      return;
    }

    this.state.players[player].controllerSocket = null;
    this.state.players[player].ready = false;
    this.stopMatchForSafety(`${player} controller disconnected`);
    this.broadcastState();
  }

  addSpectator(socket: WebSocket): void {
    this.spectators.add(socket);
    this.sendJson(socket, {
      type: 'state',
      state: this.getPublicState()
    });
  }

  removeSpectator(socket: WebSocket): void {
    this.spectators.delete(socket);
  }

  startCountdown(): boolean {
    if (this.state.status !== 'LOBBY' && this.state.status !== 'ENDED') {
      return false;
    }

    if (this.state.status === 'ENDED') {
      this.resetEngine();
    }

    if (!this.canStartMatch()) {
      return false;
    }

    this.clearTimers();
    this.state.status = 'COUNTDOWN';
    this.state.countdownSeconds = DEFAULT_COUNTDOWN_SECONDS;
    this.broadcastState();

    this.countdownInterval = setInterval(() => {
      this.state.countdownSeconds -= 1;

      if (this.state.countdownSeconds <= 0) {
        this.beginActiveMatch();
        return;
      }

      this.broadcastState();
    }, 1000);

    return true;
  }

  setPlayerReady(player: PlayerSlot, ready: boolean): boolean {
    if (this.state.status !== 'LOBBY' && this.state.status !== 'ENDED') {
      return false;
    }

    if (this.state.status === 'ENDED') {
      this.resetEngine();
    }

    if (!this.state.players[player].controllerSocket) {
      return false;
    }

    this.state.players[player].ready = ready;
    if (this.canStartMatch()) {
      this.startCountdown();
      return true;
    }

    this.broadcastState();
    return true;
  }

  handleControllerInput(player: PlayerSlot, payload: string): boolean {
    if (this.state.status !== 'ACTIVE') {
      return false;
    }

    const input = parsePlayerInputs(payload);
    if (!input) {
      return false;
    }

    const tankSocket = this.state.players[player].socket;
    if (!tankSocket || tankSocket.readyState !== WebSocket.OPEN) {
      return false;
    }

    tankSocket.send(JSON.stringify(input));
    return true;
  }

  registerHit(targetPlayer: PlayerSlot, direction?: string): void {
    if (this.state.status !== 'ACTIVE') {
      return;
    }

    const attacker = this.otherPlayer(targetPlayer);
    const target = this.state.players[targetPlayer];
    target.lastHitDirection = direction?.trim() || 'unknown';
    target.health = Math.max(0, target.health - HIT_DAMAGE);
    this.state.players[attacker].score += HIT_DAMAGE;

    if (target.health === 0) {
      this.endMatch(attacker);
      return;
    }

    this.broadcastState();
  }

  private beginActiveMatch(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    this.state.status = 'ACTIVE';
    this.state.countdownSeconds = 0;
    this.state.remainingSeconds = this.matchSeconds;
    this.broadcastState();

    this.matchInterval = setInterval(() => {
      this.state.remainingSeconds = Math.max(0, this.state.remainingSeconds - 1);

      if (this.state.remainingSeconds === 0) {
        this.endMatch(this.determineWinnerByScore());
        return;
      }

      this.broadcastState();
    }, 1000);
  }

  private endMatch(winner: PlayerSlot | null): void {
    if (this.state.status === 'ENDED') {
      return;
    }

    this.clearTimers();
    this.state.status = 'ENDED';
    this.state.winner = winner;
    this.state.players.p1.ready = false;
    this.state.players.p2.ready = false;
    this.broadcastState();
    this.queueResult();
  }

  private stopMatchForSafety(reason: string): void {
    if (this.state.status !== 'ACTIVE' && this.state.status !== 'COUNTDOWN') {
      return;
    }

    console.warn(`Force-stopping match: ${reason}`);
    if (this.state.status === 'COUNTDOWN') {
      this.clearTimers();
      this.state.status = 'ENDED';
      this.state.winner = null;
      this.state.players.p1.ready = false;
      this.state.players.p2.ready = false;
      this.broadcastState();
      return;
    }

    this.endMatch(this.determineWinnerByScore());
  }

  private queueResult(): void {
    const winner = this.state.winner;
    if (this.resultQueued || !winner) {
      return;
    }

    this.resultQueued = true;
    const matchData: MatchResult = {
      id: this.state.matchId,
      player1_name: this.state.players.p1.username,
      player2_name: this.state.players.p2.username,
      winner_name: this.state.players[winner].username,
      player1_score: this.state.players.p1.score,
      player2_score: this.state.players.p2.score,
      game_duration_seconds: Math.max(1, this.matchSeconds - this.state.remainingSeconds),
      created_at: new Date().toISOString()
    };

    try {
      const result = this.onMatchComplete(matchData);
      if (result && typeof result.then === 'function') {
        result.catch((error: unknown) => {
          console.warn('Failed to enqueue match result:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to enqueue match result:', error);
    }
  }

  private broadcastState(): void {
    const message = JSON.stringify({
      type: 'state',
      state: this.getPublicState()
    });

    for (const socket of this.getControllerSockets()) {
      this.sendJson(socket, message);
    }

    for (const socket of this.spectators) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        continue;
      }

      this.spectators.delete(socket);
    }
  }

  private sendJson(socket: WebSocket, payload: unknown): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
  }

  private getControllerSockets(): WebSocket[] {
    return Object.values(this.state.players)
      .map((player) => player.controllerSocket)
      .filter((socket): socket is WebSocket => Boolean(socket));
  }

  private canStartMatch(): boolean {
    return Object.values(this.state.players).every(
      (player) => player.controllerSocket !== null && player.ready
    );
  }

  private determineWinnerByScore(): PlayerSlot | null {
    const { p1, p2 } = this.state.players;
    if (p1.health !== p2.health) {
      return p1.health > p2.health ? 'p1' : 'p2';
    }

    if (p1.score !== p2.score) {
      return p1.score > p2.score ? 'p1' : 'p2';
    }

    return null;
  }

  private otherPlayer(player: PlayerSlot): PlayerSlot {
    return player === 'p1' ? 'p2' : 'p1';
  }

  private clearTimers(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    if (this.matchInterval) {
      clearInterval(this.matchInterval);
      this.matchInterval = null;
    }
  }

  private createInitialState(): GameState {
    return {
      matchId: randomUUID(),
      status: 'LOBBY',
      countdownSeconds: 0,
      remainingSeconds: this.matchSeconds,
      winner: null,
      players: {
        p1: {
          id: 'p1',
          username: 'Player 1',
          health: STARTING_HEALTH,
          score: 0,
          lastHitDirection: null,
          ready: false,
          socket: null,
          controllerSocket: null
        },
        p2: {
          id: 'p2',
          username: 'Player 2',
          health: STARTING_HEALTH,
          score: 0,
          lastHitDirection: null,
          ready: false,
          socket: null,
          controllerSocket: null
        }
      }
    };
  }
}
