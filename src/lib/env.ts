/** Throws at call time (not import time) so a missing key is a 500 on one route, not a dead build. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const hasEnv = (...names: string[]) => names.every((n) => !!process.env[n]);
