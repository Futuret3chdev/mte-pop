import { getSession } from '../_store.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const code = String(req.query?.code || '').trim();
  if (!code) {
    res.status(400).json({ error: 'Missing code' });
    return;
  }

  const entry = getSession(code);
  if (!entry) {
    res.status(404).json({ status: 'expired' });
    return;
  }

  if (entry.status === 'ok') {
    res.status(200).json({ status: 'ok', user: entry.user });
    return;
  }

  res.status(200).json({ status: 'pending' });
}