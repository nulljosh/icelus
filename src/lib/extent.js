// Min and max by loop. Math.min(...xs) passes every value as an argument and throws past a few hundred
// thousand (a wand fill over a big canvas, a text of 200,000 lines). No imports, so any module can use it.
export const minOf = xs => xs.reduce((m, x) => (x < m ? x : m), Infinity);
export const maxOf = xs => xs.reduce((m, x) => (x > m ? x : m), -Infinity);
