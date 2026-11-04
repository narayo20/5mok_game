import Peer, { type DataConnection } from 'peerjs';
import type { PlayerType } from '../game/renju';

export type NetworkRole = 'host' | 'client' | null;

export type GameMessage =
  | { type: 'READY'; role: 'host' | 'client'; playerName?: string }
  | { type: 'MOVE'; row: number; col: number; player: PlayerType; moveNumber: number }
  | { type: 'UNDO_REQUEST' }
  | { type: 'UNDO_RESPONSE'; accepted: boolean }
  | { type: 'REMATCH_REQUEST' }
  | { type: 'REMATCH_RESPONSE'; accepted: boolean }
  | { type: 'RESIGN'; player: PlayerType }
  | { type: 'EMOTE'; emote: string; label?: string }
  | { type: 'PING'; ts: number }
  | { type: 'PONG'; ts: number };

export interface P2PCallbacks {
  onConnected?: (role: NetworkRole) => void;
  onDisconnected?: () => void;
  onMessage?: (msg: GameMessage) => void;
  onError?: (err: string) => void;
  onPingUpdate?: (ms: number) => void;
}

export class P2PManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private role: NetworkRole = null;
  private callbacks: P2PCallbacks = {};
  private pingInterval: number | null = null;
  public roomCode: string = '';

  constructor(callbacks: P2PCallbacks) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: P2PCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 4자리 난수 룸 코드 생성 (e.g. 7824)
   */
  public static generateRoomCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private getFullPeerId(code: string): string {
    return `renju-omok-p2p-${code.trim()}`;
  }

  /**
   * 방 만들기 (Host)
   */
  public hostRoom(code: string): Promise<string> {
    this.disconnect();
    this.roomCode = code;
    this.role = 'host';

    return new Promise((resolve, reject) => {
      try {
        const peerId = this.getFullPeerId(code);
        this.peer = new Peer(peerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ],
          },
        });

        this.peer.on('open', () => {
          resolve(code);
        });

        this.peer.on('connection', (connection) => {
          this.conn = connection;
          this.setupConnectionHandlers();
        });

        this.peer.on('error', (err: any) => {
          console.error('Peer host error:', err);
          this.callbacks.onError?.(`P2P 연결 오류: ${err.type || err.message}`);
          reject(err);
        });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * 방 참가하기 (Client)
   */
  public joinRoom(code: string): Promise<void> {
    this.disconnect();
    this.roomCode = code;
    this.role = 'client';

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer({
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ],
          },
        });

        this.peer.on('open', () => {
          const hostPeerId = this.getFullPeerId(code);
          const connection = this.peer!.connect(hostPeerId, {
            reliable: true,
          });

          this.conn = connection;
          this.setupConnectionHandlers();
          resolve();
        });

        this.peer.on('error', (err: any) => {
          console.error('Peer join error:', err);
          this.callbacks.onError?.(`방에 접속할 수 없습니다: ${err.type || err.message}`);
          reject(err);
        });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  private setupConnectionHandlers() {
    if (!this.conn) return;

    this.conn.on('open', () => {
      this.callbacks.onConnected?.(this.role);
      this.startPingLoop();
    });

    this.conn.on('data', (data) => {
      const msg = data as GameMessage;
      if (msg.type === 'PING') {
        this.send({ type: 'PONG', ts: msg.ts });
      } else if (msg.type === 'PONG') {
        const rtt = Date.now() - msg.ts;
        this.callbacks.onPingUpdate?.(rtt);
      } else {
        this.callbacks.onMessage?.(msg);
      }
    });

    this.conn.on('close', () => {
      this.stopPingLoop();
      this.callbacks.onDisconnected?.();
    });

    this.conn.on('error', (err) => {
      this.callbacks.onError?.(`통신 에러: ${err}`);
    });
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'PING', ts: Date.now() });
      }
    }, 3000);
  }

  private stopPingLoop() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public isConnected(): boolean {
    return this.conn !== null && this.conn.open;
  }

  public getRole(): NetworkRole {
    return this.role;
  }

  public send(msg: GameMessage): boolean {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
        return true;
      } catch (e) {
        console.error('Failed to send message:', e);
      }
    }
    return false;
  }

  public disconnect() {
    this.stopPingLoop();
    if (this.conn) {
      try {
        this.conn.close();
      } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.role = null;
  }
}
