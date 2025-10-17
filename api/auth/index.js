// api/auth/index.js
import crypto from 'crypto';

export default function handler(req, res) {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error('Missing GITHUB_CLIENT_ID env var');
      res.status(500).send('Server misconfigured: missing client id');
      return;
    }

    // <-- CAMBIO: usar AUTH_BASE_URL si está definido, si no fallback a Vercel
    const base = process.env.AUTH_BASE_URL || `https://${process.env.VERCEL_URL || req.headers.host}`;
    // --------------------------------------------------------------

    res.setHeader('Set-Cookie', `decap_oauth_state=${state}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax; Secure`);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${base}/api/auth/callback`,
      scope: 'public_repo',
      state
    });

    console.log('redirect_uri ->', `${base}/api/auth/callback`);

    res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
    res.end();
  } catch (err) {
    console.error('auth/index error:', err);
    res.status(500).send('Internal server error');
  }
}
