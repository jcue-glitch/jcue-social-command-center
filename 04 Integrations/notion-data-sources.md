# Notion Data Sources

Parent page:

- JCue Social Metrics Hub: https://www.notion.so/366dde2970ae808fb66cc29f48128261

Databases:

- Content Pieces: https://www.notion.so/741bd33134614b91a12f08d3a02add5e
  - Data source: `collection://5e2a3d2d-b7a5-4a99-91c7-87b107748e54`
- Performance Snapshots: https://www.notion.so/b8e4b04c4f8f45a1826a522403e21fae
  - Data source: `collection://9a0cc689-0f6f-4b51-9805-45e6d6bb5902`
- Trend + Research Signals: https://www.notion.so/1af94bcfae6545ffbb93422fe45a7e03
  - Data source: `collection://2b9f053f-2f38-4d1f-93f8-8061e003ab34`
- Outliers + Learnings: https://www.notion.so/2b2469b092dc4274b3da457a03c62309
  - Data source: `collection://b5252bc5-4b17-4e55-bf61-b5957432fde5`

## Daily Metrics Flow

1. Sync recent posts into Content Pieces.
2. Capture 24h, 48h, and 7d metric snapshots in Performance Snapshots.
3. Mark unusually strong or weak results in Outliers + Learnings.
4. Feed reusable patterns back into the 7am JCue brief.

## First Platform

YouTube is connected first. The next implementation step is a local sync that reads `.youtube/latest_metrics.json` or calls the YouTube bridge, then writes recent Shorts and snapshots into Notion.

## First Sync

Completed on 2026-05-20 JST:

- Imported 12 recent YouTube videos into Content Pieces.
- Imported 12 baseline YouTube performance rows into Performance Snapshots.
- Added 3 initial Outliers + Learnings:
  - Highest baseline views came from casual menswear framing.
  - Perfection theme showed strong engagement density.
  - Quiet-life topic drew comments despite lower reach.

The first sync used `Snapshot Window = Manual` because these were historical baseline metrics, not true 24h / 48h / 7d snapshots.

## Next Sync Behavior

For new videos, use the following snapshot windows:

- `24h`: first morning after the post has had roughly one day to circulate.
- `48h`: second-day momentum check.
- `7d`: settled performance check.

For each daily run:

1. Read recent YouTube videos from `.youtube/latest_metrics.json` or the local bridge.
2. Find videos posted yesterday in Asia/Tokyo.
3. Create or update the Content Piece.
4. Add a Performance Snapshot with the correct window.
5. Compare against baseline and prior same-format posts.
6. Add an Outliers + Learnings row only when something is meaningfully stronger, weaker, or strategically useful.
