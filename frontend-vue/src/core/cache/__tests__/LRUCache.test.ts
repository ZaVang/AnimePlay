/**
 * LRUCache Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../LRUCache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('should clear individual keys via clear and re-add', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.has('a')).toBe(true);
      cache.clear();
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used item when capacity is exceeded', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should update access order on get', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a'); // 'a' becomes most recently used
      cache.set('d', 4); // Should evict 'b', not 'a'

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should update access order on set', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.set('a', 10); // Update 'a', becomes most recently used
      cache.set('d', 4); // Should evict 'b'

      expect(cache.get('a')).toBe(10);
      expect(cache.has('b')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('a', 1);
      cache.get('a'); // hit
      cache.get('b'); // miss
      cache.get('a'); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
    });

    it('should calculate correct hit rate', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      cache.get('a'); // hit
      cache.get('a'); // hit
      cache.get('c'); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe('66.67%');
    });

    it('should handle zero total accesses', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe('0%');
    });

    it('should reset statistics', () => {
      cache.set('a', 1);
      cache.get('a');
      cache.get('b');

      cache.resetStats();
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe('0%');
    });
  });

  describe('Size Management', () => {
    it('should report correct size', () => {
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });

    it('should not exceed max size', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);
      cache.set('e', 5);

      expect(cache.size).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle size 1 cache', () => {
      const smallCache = new LRUCache<string, number>(1);
      smallCache.set('a', 1);
      smallCache.set('b', 2);

      expect(smallCache.has('a')).toBe(false);
      expect(smallCache.has('b')).toBe(true);
    });

    it('should handle undefined and null values', () => {
      const cache = new LRUCache<string, any>(3);
      cache.set('a', undefined);
      cache.set('b', null);

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeNull();
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(true);
    });

    it('should handle updating existing key', () => {
      cache.set('a', 1);
      cache.set('a', 2);

      expect(cache.get('a')).toBe(2);
      expect(cache.size).toBe(1);
    });
  });
});
