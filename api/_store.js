const TTL_MS = 10 * 60 * 1000;
const pending = new Map();

function prune() {
  const now = Date.now();
  for (const [code, entry] of pending) {
    if (now - entry.at > TTL_MS) pending.delete(code);
  }
}

export function createSession(code) {
  prune();
  pending.set(code, { status: 'pending', at: Date.now() });
}

export function completeSession(code, user) {
  prune();
  const entry = pending.get(code);
  if (!entry || entry.status !== 'pending') return false;
  pending.set(code, { status: 'ok', at: Date.now(), user });
  return true;
}

export function getSession(code) {
  prune();
  const entry = pending.get(code);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    pending.delete(code);
    return null;
  }
  return entry;
}