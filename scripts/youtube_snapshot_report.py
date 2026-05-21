#!/usr/bin/env python3
"""Create a Notion-ready YouTube metrics snapshot report from the local cache."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import pathlib
import sys


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE_PATH = PROJECT_ROOT / ".youtube" / "latest_metrics.json"
EXPORT_DIR = PROJECT_ROOT / "exports"


def read_json(path: pathlib.Path) -> dict:
    if not path.exists():
        raise SystemExit(f"Missing {path}. Run the YouTube bridge and Sync Metrics first.")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def parse_date(value: str) -> dt.datetime:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


def window_for(published_at: dt.datetime, today: dt.date) -> str:
    age_days = max(0, (today - published_at.date()).days)
    if age_days <= 1:
        return "24h"
    if age_days == 2:
        return "48h"
    if age_days <= 7:
        return "7d"
    return "Manual"


def engagement_rate(video: dict) -> float:
    views = int(video.get("viewCount") or 0)
    if views <= 0:
        return 0.0
    interactions = int(video.get("likeCount") or 0) + int(video.get("commentCount") or 0)
    return round((interactions / views) * 100, 2)


def build_rows(cache: dict, today: dt.date) -> list[dict]:
    rows = []
    for video in cache.get("recentVideos", []):
        published = parse_date(video["publishedAt"])
        rows.append(
            {
                "name": video.get("title") or video.get("id"),
                "platform": "YouTube Shorts",
                "content_type": "Short-form Video",
                "platform_content_id": video.get("id"),
                "content_url": f"https://www.youtube.com/watch?v={video.get('id')}",
                "post_date": published.date().isoformat(),
                "posted_at": published.isoformat(),
                "snapshot_date": today.isoformat(),
                "snapshot_window": window_for(published, today),
                "views": int(video.get("viewCount") or 0),
                "likes": int(video.get("likeCount") or 0),
                "comments": int(video.get("commentCount") or 0),
                "engagement_rate": engagement_rate(video),
            }
        )
    return rows


def write_csv(path: pathlib.Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "name",
        "platform",
        "content_type",
        "platform_content_id",
        "content_url",
        "post_date",
        "posted_at",
        "snapshot_date",
        "snapshot_window",
        "views",
        "likes",
        "comments",
        "engagement_rate",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def write_markdown(path: pathlib.Path, rows: list[dict], cache: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    analytics = cache.get("analytics", {})
    channel = cache.get("channel", {})
    top_views = sorted(rows, key=lambda row: row["views"], reverse=True)[:5]
    top_engagement = sorted(rows, key=lambda row: row["engagement_rate"], reverse=True)[:5]
    lines = [
        "# YouTube Snapshot Report",
        "",
        f"Generated from local cache synced at `{cache.get('syncedAt', 'unknown')}`.",
        "",
        f"Channel: {channel.get('title', 'Unknown')} ({channel.get('subscriberCount', 0)} subscribers)",
        f"Analytics window: {analytics.get('startDate', 'n/a')} to {analytics.get('endDate', 'n/a')}",
        f"Window totals: {analytics.get('views', 0)} views, {analytics.get('estimatedMinutesWatched', 0)} minutes watched, {analytics.get('averageViewPercentage', 0)}% average viewed.",
        "",
        "## Highest Views",
        "",
    ]
    for row in top_views:
        lines.append(f"- {row['views']} views - {row['name']} ({row['content_url']})")
    lines.extend(["", "## Highest Engagement Density", ""])
    for row in top_engagement:
        lines.append(f"- {row['engagement_rate']}% - {row['name']} ({row['views']} views)")
    lines.extend(
        [
            "",
            "## Notion Mapping",
            "",
            "- Content Pieces: create/update rows by `Platform Content ID`.",
            "- Performance Snapshots: add one row per video per snapshot window.",
            "- Outliers + Learnings: create rows only for meaningful high/low signals.",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=dt.date.today().isoformat(), help="Snapshot date in YYYY-MM-DD.")
    args = parser.parse_args()
    today = dt.date.fromisoformat(args.date)
    cache = read_json(CACHE_PATH)
    rows = build_rows(cache, today)
    csv_path = EXPORT_DIR / f"youtube-snapshot-{today.isoformat()}.csv"
    md_path = EXPORT_DIR / f"youtube-snapshot-{today.isoformat()}.md"
    write_csv(csv_path, rows)
    write_markdown(md_path, rows, cache)
    print(f"Wrote {csv_path}")
    print(f"Wrote {md_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
