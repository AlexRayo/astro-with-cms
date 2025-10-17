// api/auth/index.js
const crypto = require('crypto');

module.exports = (req, res) => {
  // generar state y guardarlo temporalmente en cookie (short-lived)
  const state = crypto.randomBytes(16).toString('hex');
  const clientId = process.env.GITHUB_CLIENT_ID;
  const base = `https://${process.env.VERCEL_URL || req.headers.host}`;

  // cookie segura (httpOnly) con duración corta (e.g., 5 min)
  res.setHeader('Set-Cookie', `decap_oauth_state=${state}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax; Secure`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${base}/api/auth/callback`,
    scope: 'repo', // ajusta permisos (public_repo, repo, etc.)
    state
  });

  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
  res.end();
};
