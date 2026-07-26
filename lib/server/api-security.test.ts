import { describe, expect, it } from 'vitest';
import { cleanString, hashValue, normalizePhone } from './validation';

describe('server input security', () => {
  it('normalizes Vietnamese phone numbers consistently', () => {
    expect(normalizePhone('+84 888 999 545')).toBe('0888999545');
    expect(normalizePhone('0888.999.545')).toBe('0888999545');
  });

  it('rejects malformed phone numbers', () => {
    expect(() => normalizePhone('123')).toThrow('không hợp lệ');
  });

  it('bounds user input', () => {
    expect(cleanString('  Merci Studio  ', 'Tên', 50)).toBe('Merci Studio');
    expect(() => cleanString('12345', 'Tên', 3)).toThrow('vượt quá');
  });

  it('creates deterministic one-way hashes', () => {
    expect(hashValue('settings:0888999545')).toBe(hashValue('settings:0888999545'));
    expect(hashValue('settings:0888999545')).not.toBe(hashValue('settings:0877999545'));
  });
});
