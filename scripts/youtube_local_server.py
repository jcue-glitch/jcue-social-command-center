#!/usr/bin/env python3
"""Local static server plus YouTube OAuth/analytics bridge for the JCue dashboard."""

from __future__ import annotations

import argparse
import datetime as dt
import http.server
import json
import os
import pathlib
import secrets
import socketserver
import sys
import urllib.error
import urllib.parse
import urllib.request


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
YOUTUBE_DIR = PROJECT_ROOT / ".youtube"
CLIENT_PATH = YOUTUBE_DIR / "oauth_client.json"
TOKEN_PATH = YOUTUBE_DIR / "token.json"
CACHE_PATH = YOUTUBE_DIR / "latest_metrics.json"

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]


def read_json(path: pathlib.Path) -> dict:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: pathlib.Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, sort_keys=True)


def load_client() -> dict:
    data = read_json(CLIENT_PATH)
    client = data.get("web") or data.get("installed") or data
    client_id = client.get("client_id") or os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = client.get("client_secret") or os.environ.get("YOUTUBE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError(
            "Missing YouTube OAuth client. Save Google OAuth client JSON at .youtube/oauth_client.json."
        )
    return {"client_id": client_id, "client_secret": client_secret}


def redirect_uri(port: int) -> str:
    return f"http://127.0.0.1:{port}/oauth2callback"


def build_auth_url(port: int) -> str:
    client = load_client()
    state = secrets.token_urlsafe(24)
    write_json(YOUTUBE_DIR / "oauth_state.json", {"state": state, "createdAt": dt.datetime.utcnow().isoformat()})
    query = {
        "client_id": client["client_id"],
        "redirect_uri": redirect_uri(port),
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{AUTH_URL}?{urllib.parse.urlencode(query)}"


def post_form(url: str, data: dict) -> dict:
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    return request_json(request)


def get_json(url: str, access_token: str) -> dict:
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})
    return request_json(request)


def request_json(request: urllib.request.Request) -> dict:
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = {"error": body}
        raise RuntimeError(json.dumps(parsed)) from error


def exchange_code(code: str, port: int) -> dict:
    client = load_client()
    token = post_form(
        TOKEN_URL,
        {
            "code": code,
            "client_id": client["client_id"],
            "client_secret": client["client_secret"],
            "redirect_uri": redirect_uri(port),
            "grant_type": "authorization_code",
        },
    )
    token["createdAt"] = dt.datetime.utcnow().isoformat()
    write_json(TOKEN_PATH, token)
    return token


def token_expired(token: dict) -> bool:
    created = token.get("createdAt")
    if not created:
        return True
    created_at = dt.datetime.fromisoformat(created)
    expires_in = int(token.get("expires_in", 0))
    return dt.datetime.utcnow() >= created_at + dt.timedelta(seconds=max(0, expires_in - 90))


def refresh_token(token: dict) -> dict:
    refresh = token.get("refresh_token")
    if not refresh:
        raise RuntimeError("No refresh token found. Reconnect YouTube and approve offline access.")
    client = load_client()
    updated = post_form(
        TOKEN_URL,
        {
            "client_id": client["client_id"],
            "client_secret": client["client_secret"],
            "refresh_token": refresh,
            "grant_type": "refresh_token",
        },
    )
    updated["refresh_token"] = refresh
    updated["createdAt"] = dt.datetime.utcnow().isoformat()
    write_json(TOKEN_PATH, updated)
    return updated


def access_token() -> str:
    token = read_json(TOKEN_PATH)
    if not token:
        raise RuntimeError("YouTube is not connected yet.")
    if token_expired(token):
        token = refresh_token(token)
    return token["access_token"]


def query(params: dict) -> str:
    return urllib.parse.urlencode(params, doseq=True)


def fetch_channel(token: str) -> dict:
    url = "https://www.googleapis.com/youtube/v3/channels?" + query(
        {"part": "snippet,statistics,contentDetails", "mine": "true"}
    )
    data = get_json(url, token)
    items = data.get("items") or []
    if not items:
        raise RuntimeError("No YouTube channel returned for this Google account.")
    item = items[0]
    stats = item.get("statistics", {})
    snippet = item.get("snippet", {})
    return {
        "id": item.get("id"),
        "title": snippet.get("title"),
        "thumbnail": ((snippet.get("thumbnails") or {}).get("default") or {}).get("url"),
        "subscriberCount": int(stats.get("subscriberCount", 0)),
        "viewCount": int(stats.get("viewCount", 0)),
        "videoCount": int(stats.get("videoCount", 0)),
        "uploadsPlaylist": (((item.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads")),
    }


def fetch_recent_videos(token: str, uploads_playlist: str, max_results: int = 12) -> list[dict]:
    if not uploads_playlist:
        return []
    playlist_url = "https://www.googleapis.com/youtube/v3/playlistItems?" + query(
        {
            "part": "snippet,contentDetails",
            "playlistId": uploads_playlist,
            "maxResults": max_results,
        }
    )
    playlist = get_json(playlist_url, token)
    ids = [
        (item.get("contentDetails") or {}).get("videoId")
        for item in playlist.get("items", [])
        if (item.get("contentDetails") or {}).get("videoId")
    ]
    if not ids:
        return []
    videos_url = "https://www.googleapis.com/youtube/v3/videos?" + query(
        {"part": "snippet,statistics,contentDetails", "id": ",".join(ids), "maxResults": max_results}
    )
    videos = get_json(videos_url, token)
    return [
        {
            "id": item.get("id"),
            "title": (item.get("snippet") or {}).get("title"),
            "publishedAt": (item.get("snippet") or {}).get("publishedAt"),
            "viewCount": int((item.get("statistics") or {}).get("viewCount", 0)),
            "likeCount": int((item.get("statistics") or {}).get("likeCount", 0)),
            "commentCount": int((item.get("statistics") or {}).get("commentCount", 0)),
        }
        for item in videos.get("items", [])
    ]


def fetch_analytics(token: str, days: int) -> dict:
    end = dt.date.today() - dt.timedelta(days=1)
    start = end - dt.timedelta(days=max(1, days - 1))
    metrics = [
        "views",
        "estimatedMinutesWatched",
        "averageViewDuration",
        "averageViewPercentage",
        "likes",
        "comments",
        "shares",
        "subscribersGained",
    ]
    url = "https://youtubeanalytics.googleapis.com/v2/reports?" + query(
        {
            "ids": "channel==MINE",
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "metrics": ",".join(metrics),
            "dimensions": "day",
            "sort": "day",
        }
    )
    data = get_json(url, token)
    rows = data.get("rows") or []
    totals = {
        "days": days,
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "views": 0,
        "estimatedMinutesWatched": 0,
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "subscribersGained": 0,
        "averageViewDuration": 0,
        "averageViewPercentage": 0,
    }
    durations = []
    percentages = []
    for row in rows:
        totals["views"] += int(row[1] or 0)
        totals["estimatedMinutesWatched"] += int(row[2] or 0)
        durations.append(float(row[3] or 0))
        percentages.append(float(row[4] or 0))
        totals["likes"] += int(row[5] or 0)
        totals["comments"] += int(row[6] or 0)
        totals["shares"] += int(row[7] or 0)
        totals["subscribersGained"] += int(row[8] or 0)
    if durations:
        totals["averageViewDuration"] = round(sum(durations) / len(durations), 1)
    if percentages:
        totals["averageViewPercentage"] = round(sum(percentages) / len(percentages), 1)
    return totals


def build_metrics(days: int) -> dict:
    token = access_token()
    channel = fetch_channel(token)
    analytics = fetch_analytics(token, days)
    recent = fetch_recent_videos(token, channel.get("uploadsPlaylist") or "")
    recent_view_counts = [video["viewCount"] for video in recent if isinstance(video.get("viewCount"), int)]
    avg_views = round(sum(recent_view_counts) / len(recent_view_counts)) if recent_view_counts else analytics["views"]
    result = {
        "channel": channel,
        "analytics": analytics,
        "recentVideos": recent,
        "dashboardMetric": {
            "followers": channel["subscriberCount"],
            "avgViews": avg_views,
            "retention": analytics["averageViewPercentage"],
            "saves": analytics["likes"],
            "shares": analytics["shares"],
        },
        "syncedAt": dt.datetime.utcnow().isoformat() + "Z",
    }
    write_json(CACHE_PATH, result)
    return result


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    def json_response(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def text_response(self, status: int, text: str) -> None:
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        try:
            if parsed.path == "/api/youtube/status":
                latest = read_json(CACHE_PATH)
                configured = CLIENT_PATH.exists() or (
                    os.environ.get("YOUTUBE_CLIENT_ID") and os.environ.get("YOUTUBE_CLIENT_SECRET")
                )
                authorized = TOKEN_PATH.exists()
                self.json_response(
                    200,
                    {
                        "configured": bool(configured),
                        "authorized": bool(authorized),
                        "latest": latest or None,
                        "message": "YouTube bridge is connected." if authorized else "YouTube bridge is running. OAuth is not connected yet.",
                    },
                )
                return
            if parsed.path == "/api/youtube/auth-url":
                self.json_response(200, {"authUrl": build_auth_url(self.server.server_address[1])})
                return
            if parsed.path == "/api/youtube/metrics":
                days = int((params.get("days") or ["28"])[0])
                self.json_response(200, build_metrics(days))
                return
            if parsed.path == "/oauth2callback":
                state_doc = read_json(YOUTUBE_DIR / "oauth_state.json")
                incoming_state = (params.get("state") or [""])[0]
                if state_doc.get("state") and incoming_state != state_doc.get("state"):
                    self.text_response(400, "<h1>OAuth state mismatch</h1><p>Close this tab and reconnect from the dashboard.</p>")
                    return
                code = (params.get("code") or [""])[0]
                if not code:
                    self.text_response(400, "<h1>Missing authorization code</h1><p>Reconnect from the dashboard.</p>")
                    return
                exchange_code(code, self.server.server_address[1])
                self.text_response(
                    200,
                    "<h1>YouTube connected</h1><p>You can return to the JCue dashboard and click Sync Metrics.</p>",
                )
                return
            super().do_GET()
        except Exception as error:
            self.json_response(500, {"message": str(error)})


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the JCue dashboard with a local YouTube API bridge.")
    parser.add_argument("--port", type=int, default=4178)
    args = parser.parse_args()
    YOUTUBE_DIR.mkdir(parents=True, exist_ok=True)
    with socketserver.TCPServer(("", args.port), Handler) as server:
        print(f"Serving JCue dashboard with YouTube bridge at http://127.0.0.1:{args.port}/social-command-center/")
        server.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
