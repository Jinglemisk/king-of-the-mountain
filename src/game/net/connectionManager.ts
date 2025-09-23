import { updateHeartbeat } from './roomService';
import { onAuthChange, getCurrentUser } from './firebase';

export class ConnectionManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private visibilityChangeHandler: (() => void) | null = null;
  private roomCode: string | null = null;
  private isActive: boolean = false;
  private authUnsubscribe: (() => void) | null = null;

  constructor() {
    this.setupVisibilityHandler();
    this.setupAuthListener();
  }

  private setupVisibilityHandler(): void {
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        this.pauseHeartbeat();
      } else {
        this.resumeHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private setupAuthListener(): void {
    this.authUnsubscribe = onAuthChange((user) => {
      if (!user && this.isActive) {
        // User signed out, stop heartbeat
        this.stop();
      }
    });
  }

  start(roomCode: string): void {
    if (this.isActive && this.roomCode === roomCode) {
      return; // Already running for this room
    }

    this.stop(); // Stop any existing heartbeat
    this.roomCode = roomCode;
    this.isActive = true;

    // Send initial heartbeat
    this.sendHeartbeat();

    // Start regular heartbeat (every 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  stop(): void {
    this.isActive = false;
    this.roomCode = null;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private pauseHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private resumeHeartbeat(): void {
    if (this.isActive && this.roomCode && !this.heartbeatInterval) {
      // Send immediate heartbeat on resume
      this.sendHeartbeat();

      // Restart regular heartbeat
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, 30000);
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.roomCode || !this.isActive) {
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      return;
    }

    try {
      await updateHeartbeat(this.roomCode);
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
      // Don't stop on error - connection might be temporarily lost
    }
  }

  destroy(): void {
    this.stop();

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
  }

  isConnected(): boolean {
    return this.isActive && this.heartbeatInterval !== null;
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }
}

// Singleton instance
let connectionManagerInstance: ConnectionManager | null = null;

export function getConnectionManager(): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager();
  }
  return connectionManagerInstance;
}

export function destroyConnectionManager(): void {
  if (connectionManagerInstance) {
    connectionManagerInstance.destroy();
    connectionManagerInstance = null;
  }
}