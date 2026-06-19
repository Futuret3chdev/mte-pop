import { completeSession } from '../_store.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'TELEGRAM_WEBHOOK_SECRET not configured on Vercel' });
    return;
  }

  const header = req.headers['x-telegram-secret'];
  if (header !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const code = String(body.code || '').trim();
  const id = Number(body.id);

  if (!code || !id) {
    res.status(400).json({ error: 'Missing code or id' });
    return;
  }

  const user = {
    id,
    username: body.username || '',
    first_name: body.first_name || '',
    last_name: body.last_name || ''
  };

  if (!completeSession(code, user)) {
    res.status(404).json({ error: 'Session not found or already used' });
    return;
  }

  res.status(200).json({ ok: true });
}