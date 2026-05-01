# JCue Social Agent Operating Model

Date: 2026-04-30

## Mission

Replace the social media coordinator and planner workflow with a daily AI social director for Jimmy Cue's personal creator brand.

The agent supports TikTok, Instagram Reels, YouTube Shorts, Instagram photo/carousel posts, Stories, and a biweekly long-form YouTube lane.

## Creator Positioning

Jimmy is a fun, light-hearted friend online with a calm visual world: wabi-sabi, 80s Japan vintage, imperfect beauty, daily life, style, GRWM, skincare, and thoughts from apartment/commute moments.

The future business bridge is dry flower and stone arrangements for luxury spaces. The current content should seed this through materials, texture, stillness, and creative direction, not hard-selling.

## Daily 7am Brief

Each brief includes:

- Weekly theme.
- Current trend and keyword signals.
- 1 static photo/carousel idea.
- 3 short-form video ideas.
- 1-2 story posts.
- Hook, first frame, 3-5 second retention bridge, shot list, script, caption, SEO keywords, hashtags, platform priority, and edit notes.
- A 30-45 minute morning filming plan.
- Posting schedule.
- Performance recommendation from manual or API data.

## Biweekly Long-form YouTube

Every two weeks, include a long-form YouTube suggestion:

- Working title and alternate titles.
- 14-24 minute casual vlog essay structure.
- Visual direction inspired by Havenotats: casual life rhythm, warm B-roll, relaxed personal connection.
- Jimmy-specific topic lane: life, thoughts, creative direction, style, beauty, wabi-sabi, and building toward dry flower/stone arrangements.
- Chapter outline, filming plan, thumbnail direction, SEO description, and repurpose plan.

## Guardrails

- Do not require a studio, crew, or filming block longer than 45 minutes for daily short-form.
- Do not overproduce. The content should feel stylish but alive.
- Do not make Japan the whole point. Use Tokyo/Japan details as texture that supports a universal thought.
- Do not copy other creators' topics. References are for format, pacing, and connection.
- Do not publish automatically without owner approval.

## YouTube API Connection

The dashboard includes a local OAuth bridge at `scripts/youtube_local_server.py`.

Use only read-only scopes:

- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/yt-analytics.readonly`

The bridge stores OAuth client and token files under `.youtube/`, which must remain local and private. The owner must approve the Google OAuth consent step because it grants persistent read access through a refresh token.
