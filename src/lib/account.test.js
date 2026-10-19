import { describe, it, expect } from 'vitest';
import { cleanName, displayName, validEmail, validPassword, authProblem } from './account.js';

describe('account helpers', () => {
  it('cleans display names', () => {
    expect(cleanName('  Ada   Lovelace ')).toBe('Ada Lovelace');
    expect(cleanName('x'.repeat(90))).toHaveLength(40);
    expect(displayName({ email: 'ada@example.com', user_metadata: {} })).toBe('ada');
    expect(displayName({ email: 'ada@example.com', user_metadata: { display_name: 'Ada' } })).toBe('Ada');
    expect(displayName(null)).toBe('');
  });
  it('checks email and password before sending', () => {
    expect(validEmail('a@b.co')).toBe(true);
    expect(validEmail('nope')).toBe(false);
    expect(validPassword('1234567')).toBe(false);
    expect(validPassword('12345678')).toBe(true);
  });
  it('maps server reasons to messages', () => {
    expect(authProblem({ status: 400, message: 'Invalid login credentials' })).toBe('auth_wrong');
    expect(authProblem({ status: 400, message: 'Email not confirmed' })).toBe('auth_unconfirmed');
    expect(authProblem({ status: 429, message: 'slow down' })).toBe('auth_slow');
    expect(authProblem({ status: 0, message: 'Failed to fetch' })).toBe('auth_offline');
    expect(authProblem({ status: 400, message: 'link expired or already used' })).toBe('auth_link_expired');
    expect(authProblem(null)).toBeNull();
  });
});
