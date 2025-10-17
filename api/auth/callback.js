// api/auth/callback.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { code, state: returnedState } = req.query || {};
  const cookies = (req.headers.cookie || '').split(';').map(c => c.trim()).reduce((acc, cur) => {
    const [k,v] = cur.split('=');
    acc[k] = v;
    return acc;
  }, {});
  const savedState = cookies['decap_oauth_state'];

  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    res.status(400).send('Invalid OAuth state or missing code.');
    return;
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenJson = await tokenRes.json();

  // tokenJson = { access_token, token_type, scope } OR { error, error_description }
  if (tokenJson.error) {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<h1>Auth error</h1><pre>${JSON.stringify(tokenJson)}</pre>`);
    return;
  }

  // Devuelve un HTML que postMessage el token al popup parent (decap espera este patrón).
  // Esto es el mismo comportamiento que otras implementaciones community.
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <script>
      (function(){
        const token = ${JSON.stringify(tokenJson)};
        // postMessage al opener y cerrar ventanas
        if (window.opener) {
          window.opener.postMessage(token, location.origin);
          window.close();
        } else {
          document.body.innerText = 'Authentication complete — you can close this window.';
        }
      })();
    </script>
  `);
};
