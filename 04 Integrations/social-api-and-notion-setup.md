# Social API + Notion Setup

This guide is the connection map for turning the JCue Social Command Center into a metrics-informed content system.

The best setup is:

1. Keep the daily creative brief in the dashboard.
2. Store historical posts, metrics, research signals, and learnings in Notion.
3. Pull metrics from platform APIs where available.
4. Use manual entry as a fallback when an API is limited, gated, or waiting on app review.

## Notion Data Model

Create four Notion databases.

### Content Pieces

Use this for every planned or published post.

Recommended properties:

- Date
- Platform
- Content URL
- Platform Content ID
- Type
- Theme
- Hook
- Caption
- Source References
- Creator Search Topics
- Status
- Posted At
- Notes

### Performance Snapshots

Use this for daily or weekly metric captures.

Recommended properties:

- Snapshot Date
- Platform
- Content Piece relation
- Views
- Reach
- Watch Time
- Average View Duration
- Retention Percent
- Likes
- Comments
- Shares
- Saves
- Follows
- Clicks
- Notes

### Trend + Research Signals

Use this for articles, Substack posts, videos, search insights, Reddit/X conversations, and recurring audience language.

Recommended properties:

- Date
- Source Type
- Source URL
- Signal
- Theme
- Applied To
- Confidence
- Notes

### Outliers + Learnings

Use this for winners, underperformers, and reusable patterns.

Recommended properties:

- Date
- Content Piece relation
- Result
- Why It Won Or Lost
- Reusable Pattern
- Next Test
- Notes

## TikTok

1. Create or sign into a TikTok developer account.
2. Create a developer app.
3. Add Login Kit and Display API access.
4. Add a redirect URI for the future local connector, such as `http://127.0.0.1:4178/oauth/tiktok/callback`.
5. Authorize the Jimmy Cue TikTok account through OAuth.
6. Pull profile and recent video metadata into the dashboard or Notion.

Important limitation: TikTok's Display API is useful for basic profile and video data. Deeper analytics are more restricted, and TikTok Research API is not the normal creator analytics path.

## Instagram

1. Confirm the Instagram account is a professional account.
2. Connect the Instagram account to a Facebook Page.
3. Create a Meta developer app.
4. Add Instagram Platform / Graph API access.
5. Request the needed permissions for media and insights.
6. Complete app review if Meta requires it for the metrics we need.
7. Sync posts and insights into Notion.

Until app review is complete, manual metric entry is the most reliable fallback.

## YouTube

1. Create a Google Cloud project.
2. Enable YouTube Data API v3.
3. Enable YouTube Analytics API.
4. Configure the OAuth consent screen.
5. Create an OAuth client for a desktop or web app.
6. Add the redirect URI used by the local connector, such as `http://127.0.0.1:4178/oauth2callback`.
7. Download the OAuth client JSON and store it locally at `.youtube/oauth_client.json`.
8. Authorize with the Jimmy Cue YouTube account.

Recommended scopes:

- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/yt-analytics.readonly`

## Substack

Substack is best used as a research and writing radar, not as the only trend source.

1. Add approved public publications to `03 Research/substack-radar-sources.md`.
2. Prefer public RSS feeds when available, usually in the format `https://publication.substack.com/feed`.
3. For writers followed inside a private Substack account, provide public post URLs, publication URLs, exported emails, or forwarded posts.
4. Do not share a Substack password.
5. Treat source material as inspiration for themes, questions, and audience language. Do not summarize or copy a writer's voice.

Substack does not currently provide a broad public creator analytics API comparable to YouTube Analytics or Meta's Graph API.

## Notion Connection Options

Option A: Notion connector

1. Connect Notion in Codex when prompted.
2. Share the relevant Notion page or databases with the connector.
3. Provide the database links here so the dashboard sync script can target them later.

Option B: Notion API token

1. Create a Notion integration.
2. Share the target Notion page or databases with that integration.
3. Store the token locally outside the public repo.
4. Store database IDs locally outside the public repo.
5. Use a local sync script to write daily briefs and metric snapshots.

Never commit API tokens, OAuth client secrets, access tokens, or refresh tokens to GitHub.

## Official References

- TikTok Display API: https://developers.tiktok.com/doc/display-api-overview/
- TikTok Login Kit: https://developers.tiktok.com/doc/login-kit-web/
- TikTok Research API: https://developers.tiktok.com/products/research-api/
- Instagram Platform: https://developers.facebook.com/docs/instagram-platform/
- YouTube Data API v3: https://developers.google.com/youtube/v3
- YouTube Analytics API reports: https://developers.google.com/youtube/analytics/reference/reports/query
- Notion API: https://developers.notion.com/docs
- Substack RSS: https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication
