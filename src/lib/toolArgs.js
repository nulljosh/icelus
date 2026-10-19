import { DEFAULT_COLS, DEFAULT_ROWS } from './engine.js';

// Argument checks shared by tools.js and editProject.js. ToolError is what callers turn into a 400.
// A 100x50 grid of astral-plane characters is ~40KB; 200KB is generous and still bounded.
export const MAX_TEXT = 200_000;
export const MAX_COLS = 500;
export const MAX_ROWS = 500;

export class ToolError extends Error {}

export const int = (v, name, { min, max, fallback }) => {
  if (v === undefined || v === null) {
    if (fallback !== undefined) return fallback;
    throw new ToolError(`${name} is required`);
  }
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n)) throw new ToolError(`${name} must be a whole number, got ${JSON.stringify(v)}`);
  if (n < min || n > max) throw new ToolError(`${name} must be between ${min} and ${max}, got ${n}`);
  return n;
};

export const text = (v) => {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new ToolError('text must be a string');
  // stampComponent indexes a grid sized from this, so an unbounded string is an
  // unbounded allocation on a public endpoint.
  if (v.length > MAX_TEXT) throw new ToolError(`text exceeds ${MAX_TEXT} characters`);
  return v;
};

export const dimensions = (args) => ({
  cols: int(args.cols, 'cols', { min: 1, max: MAX_COLS, fallback: DEFAULT_COLS }),
  rows: int(args.rows, 'rows', { min: 1, max: MAX_ROWS, fallback: DEFAULT_ROWS }),
});

