import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logger from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('calls console.info with [INFO] tag', () => {
    logger.info('test message');
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      'test message'
    );
  });

  it('calls console.warn with [WARN] tag', () => {
    logger.warn('test warning');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]'),
      'test warning'
    );
  });

  it('calls console.error with [ERROR] tag', () => {
    logger.error('test error');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      'test error'
    );
  });
});
