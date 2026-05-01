# Remote Phone Access

You can access the JCue dashboard away from home Wi-Fi, but the right setup depends on how private you need it to be.

## Recommended: Hosted Static Dashboard

Deploy only the `social-command-center` folder to a static host such as Cloudflare Pages, Netlify, or Vercel.

This works well because the dashboard is plain HTML, CSS, and JavaScript. It does not require a server unless you want live YouTube API analytics.

What to upload:

- `social-command-center/index.html`
- `social-command-center/styles.css`
- `social-command-center/app.js`
- `social-command-center/data/social-plan.js`
- `social-command-center/manifest.webmanifest`
- `social-command-center/service-worker.js`
- `social-command-center/assets/icon.svg`
- `social-command-center/_headers` when the host supports it

Do not upload:

- `.youtube/oauth_client.json`
- `.youtube/token.json`
- `.youtube/latest_metrics.json`
- private exports or screenshots

## Privacy Note

A normal static deploy is reachable by anyone with the URL unless you add protection. If the dashboard contains private analytics, plans, or personal notes, use a login layer such as Cloudflare Access, Netlify password protection, or a private network/VPN.

## Temporary Alternative: Tunnel To Your Mac

A tunnel can expose your local dashboard while your Mac is awake. This is useful for quick testing, but it is not my recommended daily setup.

Important: do not expose the local YouTube OAuth bridge publicly unless you add authentication first.

## Add To Phone

After deployment:

1. Open the hosted URL in your phone browser.
2. Use Share > Add to Home Screen.
3. The app can cache the static dashboard for offline reading after the first load.

## Deployment Sources

- Cloudflare Pages supports static assets through Git, direct upload, or CLI.
- Netlify supports manual drag-and-drop deploys and Git-based continuous deploys.
- Cloudflare Tunnel can expose a local server through an outbound connection, but should be paired with access controls for private dashboards.
