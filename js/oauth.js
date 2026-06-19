const OAuthHelper = (() => {
  const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  function redirectUri() {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file')) {
      return `${origin}/auth/callback`;
    }
    return `${MTEPOP_CONFIG.appUrl.replace(/\/$/, '')}/auth/callback`;
  }

  function randomString(len) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => CHARSET[b % CHARSET.length]).join('');
  }

  async function sha256Base64Url(str) {
    const data = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async function createPkce() {
    const verifier = randomString(64);
    const challenge = await sha256Base64Url(verifier);
    return { verifier, challenge };
  }

  function openPopup(url, state) {
    return new Promise((resolve, reject) => {
      const w = 520;
      const h = 720;
      const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open(
        url,
        'mtepop_oauth',
        `width=${w},height=${h},left=${left},top=${top},noopener=no`
      );

      if (!popup) {
        reject(new Error('Popup blocked — allow popups for this site'));
        return;
      }

      const cleanup = () => {
        clearInterval(poll);
        window.removeEventListener('message', onMessage);
      };

      const poll = setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error('Sign-in cancelled'));
        }
      }, 400);

      function onMessage(event) {
        const data = event.data;
        if (!data || data.type !== 'mtepop_oauth') return;
        if (data.state !== state) return;

        const allowed = new Set([window.location.origin]);
        try {
          allowed.add(new URL(MTEPOP_CONFIG.appUrl).origin);
        } catch { /* noop */ }
        if (!allowed.has(event.origin) && event.origin !== '*') return;

        cleanup();
        try { popup.close(); } catch { /* noop */ }

        if (data.error) reject(new Error(data.error));
        else if (!data.code) reject(new Error('No authorization code received'));
        else resolve(data);
      }

      window.addEventListener('message', onMessage);
    });
  }

  async function exchangeDiscordCode(code, verifier) {
    const clientId = MTEPOP_CONFIG.discordClientId;
    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(),
        code_verifier: verifier
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.error || 'Discord token failed');
    return data.access_token;
  }

  async function exchangeXCode(code, verifier) {
    const clientId = MTEPOP_CONFIG.xClientId;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
      client_id: clientId
    });

    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (MTEPOP_CONFIG.xClientSecret) {
      headers.Authorization = `Basic ${btoa(`${clientId}:${MTEPOP_CONFIG.xClientSecret}`)}`;
    }

    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.detail || data.error || 'X token failed');
    return data.access_token;
  }

  return {
    redirectUri,
    randomString,
    createPkce,
    openPopup,
    exchangeDiscordCode,
    exchangeXCode
  };
})();