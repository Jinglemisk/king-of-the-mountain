import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ConnectionManager } from '../connectionManager';
import { updateHeartbeat } from '../roomService';
import { getCurrentUser, onAuthChange } from '../firebase';

// Mock dependencies
vi.mock('../roomService', () => ({
  updateHeartbeat: vi.fn()
}));

vi.mock('../firebase', () => ({
  getCurrentUser: vi.fn(),
  onAuthChange: vi.fn()
}));

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let authCallback: ((user: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Capture auth change callback
    (onAuthChange as Mock).mockImplementation((callback) => {
      authCallback = callback;
      return () => { authCallback = null; };
    });

    (getCurrentUser as Mock).mockReturnValue({ uid: 'test-user' });
    (updateHeartbeat as Mock).mockResolvedValue(undefined);

    connectionManager = new ConnectionManager();
  });

  afterEach(() => {
    connectionManager.destroy();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should send initial heartbeat immediately', async () => {
      connectionManager.start('ABC123');

      expect(updateHeartbeat).toHaveBeenCalledWith('ABC123');
      expect(updateHeartbeat).toHaveBeenCalledTimes(1);
    });

    it('should send heartbeat every 30 seconds', async () => {
      connectionManager.start('ABC123');

      // Initial heartbeat
      expect(updateHeartbeat).toHaveBeenCalledTimes(1);

      // Advance 30 seconds
      vi.advanceTimersByTime(30000);
      expect(updateHeartbeat).toHaveBeenCalledTimes(2);

      // Advance another 30 seconds
      vi.advanceTimersByTime(30000);
      expect(updateHeartbeat).toHaveBeenCalledTimes(3);
    });

    it('should restart heartbeat if room code changes', () => {
      connectionManager.start('ABC123');
      expect(updateHeartbeat).toHaveBeenCalledTimes(1);

      connectionManager.start('XYZ789');
      expect(updateHeartbeat).toHaveBeenCalledTimes(2);
      expect(updateHeartbeat).toHaveBeenLastCalledWith('XYZ789');
    });

    it('should not send duplicate heartbeats for same room', () => {
      connectionManager.start('ABC123');
      connectionManager.start('ABC123');

      expect(updateHeartbeat).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should stop sending heartbeats', () => {
      connectionManager.start('ABC123');
      connectionManager.stop();

      vi.advanceTimersByTime(60000);
      expect(updateHeartbeat).toHaveBeenCalledTimes(1); // Only initial heartbeat
    });

    it('should clear room code', () => {
      connectionManager.start('ABC123');
      expect(connectionManager.getRoomCode()).toBe('ABC123');

      connectionManager.stop();
      expect(connectionManager.getRoomCode()).toBeNull();
    });
  });

  describe('visibility handling', () => {
    it('should pause heartbeat when document becomes hidden', () => {
      connectionManager.start('ABC123');
      expect(updateHeartbeat).toHaveBeenCalledTimes(1);

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Heartbeat should be paused
      vi.advanceTimersByTime(30000);
      expect(updateHeartbeat).toHaveBeenCalledTimes(1); // Still only initial
    });

    it('should resume heartbeat when document becomes visible', () => {
      connectionManager.start('ABC123');

      // Hide document
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Show document
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Should send immediate heartbeat on resume
      expect(updateHeartbeat).toHaveBeenCalledTimes(2);
    });
  });

  describe('auth handling', () => {
    it('should stop heartbeat when user signs out', () => {
      connectionManager.start('ABC123');
      expect(connectionManager.isConnected()).toBe(true);

      // Simulate sign out
      if (authCallback) {
        authCallback(null);
      }

      expect(connectionManager.isConnected()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should continue sending heartbeats even if one fails', async () => {
      (updateHeartbeat as Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(undefined);

      connectionManager.start('ABC123');

      // First heartbeat fails
      await vi.runAllTimersAsync();

      // Advance and check that heartbeat continues
      vi.advanceTimersByTime(30000);
      expect(updateHeartbeat).toHaveBeenCalledTimes(2);
    });

    it('should not send heartbeat if user is not authenticated', () => {
      (getCurrentUser as Mock).mockReturnValue(null);

      connectionManager.start('ABC123');
      expect(updateHeartbeat).not.toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return true when actively sending heartbeats', () => {
      connectionManager.start('ABC123');
      expect(connectionManager.isConnected()).toBe(true);
    });

    it('should return false when stopped', () => {
      connectionManager.start('ABC123');
      connectionManager.stop();
      expect(connectionManager.isConnected()).toBe(false);
    });

    it('should return false when never started', () => {
      expect(connectionManager.isConnected()).toBe(false);
    });
  });
});