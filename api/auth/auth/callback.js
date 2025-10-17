export default async function handler(req, res) {
    try {
        const { code, state: returnedState } = req.query || {};
        const cookies = (req.headers.cookie || '')
            .split(';')
            .map(c => c.trim())
            .reduce((acc, cur) => {
            const eq = cur.indexOf('=');
            if (eq === -1)
                return acc;
            const k = cur.slice(0, eq);
            const v = cur.slice(eq + 1);
            acc[k] = decodeURIComponent(v);
            return acc;
        }, {});
        const savedState = cookies['decap_oauth_state'];
        if (!code || !returnedState || !savedState || returnedState !== savedState) {
            console.error('OAuth state mismatch or missing code', { code, returnedState, savedState });
            res.status(400).send('Invalid OAuth state or missing code.');
            return;
        }
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
            res.status(500).send('Server misconfigured: missing GitHub credentials');
            return;
        }
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code
            })
        });
        const tokenJson = await tokenRes.json();
        if (tokenJson.error) {
            console.error('GitHub token error', tokenJson);
            res.setHeader('Content-Type', 'text/html');
            res.end(`<h1>Auth error</h1><pre>${JSON.stringify(tokenJson)}</pre>`);
            return;
        }
        res.setHeader('Content-Type', 'text/html');
        res.end(`
      <script>
        (function(){
          const token = ${JSON.stringify(tokenJson)};
          if (window.opener) {
            window.opener.postMessage(token, location.origin);
            window.close();
          } else {
            document.body.innerText = 'Authentication complete — you can close this window.';
          }
        })();
      </script>
    `);
    }
    catch (err) {
        console.error('auth/callback error:', err);
        res.status(500).send('Internal server error');
    }
}
