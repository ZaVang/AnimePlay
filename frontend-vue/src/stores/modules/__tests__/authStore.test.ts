/**
 * AuthStore Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Initial State', () => {
    it('should initialize with empty current user', () => {
      const authStore = useAuthStore();
      expect(authStore.currentUser).toBe('');
    });

    it('should not be logged in initially', () => {
      const authStore = useAuthStore();
      expect(authStore.isLoggedIn).toBe(false);
    });

    it('should have empty logs', () => {
      const authStore = useAuthStore();
      expect(authStore.logs).toEqual([]);
    });
  });

  describe('Login', () => {
    it('should set current user on valid login', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');
      expect(authStore.currentUser).toBe('testuser');
      expect(authStore.isLoggedIn).toBe(true);
    });

    it('should reject username with special characters', async () => {
      const authStore = useAuthStore();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      await authStore.login('test@user');

      expect(authStore.currentUser).toBe('');
      expect(alertSpy).toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('should reject empty username', async () => {
      const authStore = useAuthStore();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      await authStore.login('');

      expect(authStore.currentUser).toBe('');
      expect(alertSpy).toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('should accept alphanumeric usernames', async () => {
      const authStore = useAuthStore();
      await authStore.login('user123');
      expect(authStore.currentUser).toBe('user123');
    });
  });

  describe('Logout', () => {
    it('should clear current user', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');
      await authStore.logout();

      expect(authStore.currentUser).toBe('');
      expect(authStore.isLoggedIn).toBe(false);
    });

    it('should add logout log', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');
      await authStore.logout();

      expect(authStore.logs.some(log => log.message.includes('登出'))).toBe(true);
    });
  });

  describe('addLog', () => {
    it('should add log with correct type', () => {
      const authStore = useAuthStore();
      authStore.addLog('Test message', 'success');

      expect(authStore.logs).toHaveLength(1);
      expect(authStore.logs[0].message).toBe('Test message');
      expect(authStore.logs[0].type).toBe('success');
    });

    it('should add timestamp to log', () => {
      const authStore = useAuthStore();
      const beforeTime = Date.now();
      authStore.addLog('Test');
      const afterTime = Date.now();

      expect(authStore.logs[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(authStore.logs[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should default to info type', () => {
      const authStore = useAuthStore();
      authStore.addLog('Test');

      expect(authStore.logs[0].type).toBe('info');
    });

    it('should keep only last 50 logs', () => {
      const authStore = useAuthStore();

      for (let i = 0; i < 60; i++) {
        authStore.addLog(`Log ${i}`);
      }

      expect(authStore.logs).toHaveLength(50);
      expect(authStore.logs[0].message).toBe('Log 59'); // Most recent first
    });

    it('should add new logs to beginning', () => {
      const authStore = useAuthStore();
      authStore.addLog('First');
      authStore.addLog('Second');

      expect(authStore.logs[0].message).toBe('Second');
      expect(authStore.logs[1].message).toBe('First');
    });
  });

  describe('addExp', () => {
    it('should add experience points', () => {
      const authStore = useAuthStore();
      const initialExp = authStore.exp;
      authStore.addExp(100);

      expect(authStore.exp).toBe(initialExp + 100);
    });

    it('should not add exp when not logged in', () => {
      const authStore = useAuthStore();
      const initialExp = authStore.exp;
      authStore.addExp(100);

      expect(authStore.exp).toBe(initialExp); // Should not change
    });

    it('should level up when enough exp gained', () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');
      const initialLevel = authStore.level;

      authStore.addExp(10000); // Large amount to trigger level up

      expect(authStore.level).toBeGreaterThan(initialLevel);
    });

    it('should handle zero exp', () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');
      const initialExp = authStore.exp;

      authStore.addExp(0);
      expect(authStore.exp).toBe(initialExp);
    });

    it('should add log when gaining exp', () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');
      authStore.addExp(100);

      expect(authStore.logs.some(log => log.message.includes('100'))).toBe(true);
    });
  });

  describe('expToNextLevel', () => {
    it('should calculate exp needed for next level', () => {
      const authStore = useAuthStore();
      const expNeeded = authStore.expToNextLevel;

      expect(expNeeded).toBeGreaterThan(0);
      expect(typeof expNeeded).toBe('number');
    });

    it('should increase as level increases', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const expAtLevel1 = authStore.expToNextLevel;
      authStore.addExp(10000); // Level up
      const expAtHigherLevel = authStore.expToNextLevel;

      expect(expAtHigherLevel).toBeGreaterThan(expAtLevel1);
    });
  });

  describe('resetState', () => {
    it('should reset all state to initial values', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');
      authStore.addExp(500);
      authStore.addLog('Test log');

      authStore.resetState();

      expect(authStore.exp).toBe(0);
      expect(authStore.logs).toEqual([]);
    });
  });
});
