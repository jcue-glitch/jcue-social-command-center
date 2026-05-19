# JCue Project

Personal social media agent workspace for Jimmy Cue.

## What Lives Here

- `social-command-center` - phone-friendly local dashboard for daily briefs, content ideas, copy, captions, hooks, posting schedule, trend radar, manual metrics, PNG cover creation, and exports.
- `00 Agent System` - operating model, automation prompt, API needs, and handoff rules.
- `01 Strategy` - creator positioning, platform strategy, visual direction, and long-form YouTube direction.
- `02 Daily Briefs` - daily content packs and generated briefs.
- `03 Research` - approved research source lists, including Substack Radar.

## Open The Dashboard

Open:

`/Users/jcuellar/Documents/New project/JCue Project/social-command-center/index.html`

The dashboard is static and does not need npm, a build step, or external CDN assets. For live YouTube metrics, run the local bridge instead:

```bash
python3 scripts/youtube_local_server.py --port 4178
```

Then open:

`http://127.0.0.1:4178/social-command-center/`

## Access From Your Phone Away From Wi-Fi

Use a hosted static deployment for everyday phone access. See [REMOTE_ACCESS.md](REMOTE_ACCESS.md).

The short version:

- Deploy `social-command-center` to Cloudflare Pages, Netlify, or Vercel.
- Add a login/access-control layer if the brief or metrics are private.
- Keep `.youtube/*` local. Do not deploy OAuth files or tokens.
- Add the hosted URL to your phone home screen.

## Current Scope

Daily at 7am JST, the agent should deliver:

- 1 static photo/carousel concept.
- 3 short-form video ideas for TikTok, Reels, and Shorts.
- 1-2 story posts.
- Hooks, 3-5 second retention bridges, captions, keywords, hashtags, edit notes, and posting schedule.
- A biweekly long-form YouTube suggestion for life, thoughts, creative direction, and wabi-sabi philosophy.

## Daily Dashboard Updates

The stable creator strategy lives in:

`social-command-center/data/social-plan.js`

The additive creator/brand system context lives in:

`01 Strategy/jcue-creator-brand-system-context-v2.md`

The active short-form copy style system lives in:

`01 Strategy/jcue-copy-style-system-v1.md`

The daily trend-informed brief lives in:

`social-command-center/data/daily-updates.js`

The dashboard uses the active Tokyo-date object in `daily-updates.js` as the daily brief, falling back to the nearest prior update when needed. The 7am automation is configured to research current sources, apply the additive brand context, update this file, run syntax checks, and summarize the changes.

Substack Radar source list:

`03 Research/substack-radar-sources.md`

Substack is an additive research lane for slower cultural signals, thoughtful language, and possible written posts. It should inform the daily perspective alongside TikTok/Reels/Shorts trends, search behavior, articles, blogs, news, Reddit/X conversations, and similar creator patterns.

## Data Status

Platform metrics are manual by default. YouTube can now connect through the local bridge.

## YouTube API Setup

1. In Google Cloud, enable YouTube Data API v3 and YouTube Analytics API.
2. Create an OAuth client that allows this redirect URI: `http://127.0.0.1:4178/oauth2callback`.
3. Download the OAuth client JSON and save it as `.youtube/oauth_client.json`. A placeholder shape is in `.youtube/oauth_client.example.json`.
4. Run `python3 scripts/youtube_local_server.py --port 4178`.
5. In the dashboard, open YouTube API, click Check Bridge, then Connect YouTube.
6. After Google consent returns to the local callback, click Sync Metrics.

Requested read-only scopes:

- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/yt-analytics.readonly`

Local private files:

- `.youtube/oauth_client.json` - Google OAuth client credentials.
- `.youtube/token.json` - local OAuth access and refresh token.
- `.youtube/latest_metrics.json` - cached YouTube metrics for the dashboard.

These are ignored by `.gitignore`.
