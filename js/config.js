const MTEPOP_CONFIG = {
  appUrl: 'https://toon-blast.vercel.app',
  appName: 'MTE POP',
  inviteMessage: 'Join me on MTE POP — tap matching blocks to pop!',

  // OAuth — add your app credentials from each provider's developer console.
  // Redirect URI for Discord/X (paste exactly in Discord portal): https://toon-blast.vercel.app/auth/callback
  googleClientId: '',
  facebookAppId: '',
  xClientId: '',
  xClientSecret: '',
  discordClientId: '1348440616442265641',
  // Public bot username only (no @). Safe to commit.
  telegramBotUsername: 'mod_futuret3ch_bot',
  // 'deeplink' = shared multi-game bot. 'widget' = Login Widget (needs exclusive /setdomain).
  telegramAuthMode: 'deeplink',
  // Token NEVER goes in this file. Set in Vercel → Project → Settings → Environment Variables:
  //   TELEGRAM_BOT_TOKEN       — from @BotFather
  //   TELEGRAM_WEBHOOK_SECRET  — any random string you invent; your bot sends it as x-telegram-secret
  // Bot must handle /start mtepop_<code>_<sig> — see scripts/mtepop-bot-start-handler.js
  // Vercel env: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, optional DISCORD_CLIENT_SECRET
  // Discord portal → OAuth2 → enable Public Client (PKCE). Redirect: https://toon-blast.vercel.app/auth/callback

  // Demo sign-in fallback when IDs are empty (localhost only)
  demoAuth: false
};
