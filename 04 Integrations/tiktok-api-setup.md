# TikTok API Setup

Status: pending TikTok Developer app access.

TikTok should be connected through official Login Kit + Display API / Video List access. Do not scrape the site or store TikTok tokens in the public dashboard.

## Goal

Pull recent TikTok posts into Notion so the 7am brief can compare yesterday's TikTok performance with YouTube, and later Instagram.

Target Notion flow:

1. TikTok `/v2/video/list/` returns recent public videos.
2. New videos become Content Pieces.
3. Daily metrics become Performance Snapshots.
4. Strong or weak posts become Outliers + Learnings.

## Useful Metrics

TikTok video objects can include:

- `id`
- `create_time`
- `share_url`
- `video_description`
- `duration`
- `title`
- `like_count`
- `comment_count`
- `share_count`
- `view_count`

TikTok does not provide the same analytics depth as YouTube Analytics through this basic path. Treat this as useful performance metadata, not full creator analytics.

## Required TikTok Products

Add these to the TikTok Developer app:

- Login Kit
- Display API / video list access

Required scopes:

- `user.info.basic`
- `video.list`

## Redirect URI

TikTok web Login Kit requires HTTPS redirect URIs. Desktop apps can support HTTP or HTTPS redirect URIs, but the app setup still has to match TikTok's current product configuration.

Preferred future callback:

```text
https://jcue-social-command-center.jcue.workers.dev/api/tiktok/callback
```

Local development fallback, only if TikTok accepts it for the selected app type:

```text
http://127.0.0.1:4179/oauth/tiktok/callback
```

## Private Local Files

When we build the connector, store private credentials locally:

```text
.tiktok/oauth_client.json
.tiktok/token.json
.tiktok/latest_metrics.json
```

Never commit these files to GitHub.

## Setup Steps

1. Go to TikTok for Developers.
2. Create an app for `JCue Social Command Center`.
3. Add Login Kit.
4. Request `user.info.basic` and `video.list`.
5. Add the redirect URI TikTok accepts.
6. Copy the Client Key and Client Secret.
7. Store them locally in `.tiktok/oauth_client.json`.
8. Authorize `@jimmycue`.
9. Sync recent videos into Notion.

## Official References

- Login Kit overview: https://developers.tiktok.com/doc/login-kit-overview
- Login Kit for Web: https://developers.tiktok.com/doc/login-kit-web
- Login Kit for Desktop: https://developers.tiktok.com/doc/login-kit-desktop/
- User access token management: https://developers.tiktok.com/doc/oauth-user-access-token-management
- List videos: https://developers.tiktok.com/doc/tiktok-api-v2-video-list/
- Query videos: https://developers.tiktok.com/doc/tiktok-api-v2-video-query/
