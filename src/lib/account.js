// Accounts through jaybulb-api (api.jaybulb.com): email and password, a display name, sign out, delete.
// Signed out is first class: every feature works without an account, and any auth failure just leaves
// you signed out. VITE_API_URL points QA at a local jaybulb-api.
import { createClient } from './spark.js';

export const API_URL = (import.meta.env?.VITE_API_URL || 'https://api.jaybulb.com').replace(/\/+$/, '');
let client = null;
export const account = () => (client ??= createClient(API_URL));

export const NAME_MAX = 40;
export const cleanName = name => String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
export const displayName = user => cleanName(user?.user_metadata?.display_name) || user?.email?.split('@')[0] || '';
export const validEmail = email => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email ?? '').trim());
export const validPassword = password => String(password ?? '').length >= 8;

// The server's English reasons, as translation keys the panel can show.
export function authProblem(error) {
  if (!error) return null;
  if (error.status === 0) return 'auth_offline';
  if (error.status === 429) return 'auth_slow';
  if (/invalid login/i.test(error.message)) return 'auth_wrong';
  if (/not confirmed/i.test(error.message)) return 'auth_unconfirmed';
  if (/expired|already used/i.test(error.message)) return 'auth_link_expired';
  return 'auth_failed';
}
