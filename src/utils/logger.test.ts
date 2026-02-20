import { describe, it, expect, vi } from 'vitest';
import * as log from './logger.js';

describe('logger', () => {
  describe('info', () => {
    it('writes to console.log with cyan icon', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.info('hello');
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('hello');
      expect(spy.mock.calls[0][0]).toContain('ℹ');
    });
  });

  describe('success', () => {
    it('writes to console.log with green icon', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.success('done');
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('done');
      expect(spy.mock.calls[0][0]).toContain('✔');
    });
  });

  describe('warn', () => {
    it('writes to console.error with yellow icon', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      log.warn('careful');
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('careful');
      expect(spy.mock.calls[0][0]).toContain('⚠');
    });
  });

  describe('error', () => {
    it('writes to console.error with red icon', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      log.error('fail');
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('fail');
      expect(spy.mock.calls[0][0]).toContain('✖');
    });
  });

  describe('step', () => {
    it('writes to console.log with arrow icon', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.step('doing stuff');
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('doing stuff');
      expect(spy.mock.calls[0][0]).toContain('→');
    });
  });

  describe('hint', () => {
    it('writes to console.log with hint icon', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.hint('try this');
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('try this');
    });
  });

  describe('header', () => {
    it('writes to console.log with bold formatting', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      log.header('Title');
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('Title');
    });
  });
});
