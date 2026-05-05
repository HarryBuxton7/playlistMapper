# Research Notes

## Spotify Web API

### Critical: February 2026 Breaking Changes
Spotify made major breaking changes in February 2026 that affect new apps:
- **Development Mode apps** (default for new apps) are heavily restricted
- **Batch track endpoints removed** — `GET /tracks?ids=...` no longer works; every track is a separate request
- `popularity`, `available_markets`, `linked_from` fields removed from track objects
- Playlist item structure changed: nested `items.items.item`; item details only available for playlists you own or collaborate on
- Search max results dropped from 50 → 10 per query in Development Mode

### Rate Limits
- Rolling 30-second window model; exact thresholds not published
- Exceeding returns HTTP 429 with `Retry-After` header
- Practical safe target: ~20 requests/second; implement exponential backoff

### Pagination
- Max `limit` = **50** per request for both playlists and tracks
- Offset-based; `next` field in response indicates more pages exist

### Audio Features — BLOCKED for this project
- Apps created **after November 27, 2024** have no default access to `GET /v1/audio-features/{id}`
- Extended access requires approval from Spotify (only available to established businesses)
- **Decision: we cannot use audio features.** Triage relies on track name + artist name + artist genres.

### Track Metadata Available
From the standard track object:
- `name`, `artists[].name`, `album.name`, `duration_ms`, `explicit`, `id`, `uri`
- **Genres are not on the track object** — must call `GET /v1/artists/{id}` separately per artist

### Fetching Artist Genres
- One extra request per unique artist to get genres
- Worth doing for a subsample or for artists not well-known to Claude; can be optional/progressive

### OAuth & Scopes
- **PKCE flow** is fully supported for client-side apps — no backend needed for auth
- Required scopes:
  - `playlist-read-private` — read user's private playlists
  - `playlist-read-collaborative` — read collaborative playlists
  - `playlist-modify-public` — create public playlists
  - `playlist-modify-private` — create private playlists

### Playlist Creation
- `POST /me/playlists` — standard, still works
- Each track added separately or in batches via `POST /playlists/{id}/tracks` (still supports arrays of up to 100 URIs)

### Gotchas for Large Libraries
- Must cache aggressively; a 500-track library across 10 playlists = ~100+ API calls just to fetch everything
- Use `snapshot_id` per playlist to detect changes and avoid unnecessary re-fetches
- Stagger requests to avoid 429s; respect `Retry-After`

---

## Claude API

### Recommended Model
- **Claude Haiku 4.5** — fast and cheap for classification; Sonnet 4.6 is overkill
- Haiku Tier 1: 50 RPM, 50k ITPM, 10k OTPM (sufficient for 500–1000 songs)

### Batching Strategy
- **Batch 15–20 songs per request** — optimal balance of throughput and simplicity
- Per request tokens: ~1,500 (system, cached) + ~1,200 (15 songs × ~80 tokens) + ~15 (output) ≈ 2,700 tokens
- 500 songs ÷ 15 = ~34 requests

### Prompt Caching
- Cache the system prompt containing the 7 category definitions
- Cache write = 1.25× base price (first request only); cache read = 0.1× base price (all subsequent)
- Cache TTL: 5 minutes (ephemeral) — sufficient for a single triage session
- Minimum cacheable block: 2,048 tokens (Sonnet) / 4,096 tokens (Haiku) — our system prompt must hit this; pad if needed

### Structured Output
- Use JSON structured output with an enum/Literal type to guarantee one of the 7 valid category names
- No retry loops needed; constrained decoding prevents invalid output
- Return format per batch: array of `{ id, category }` objects

### Batch API
- Exists and gives 50% cost discount, but processing is async (1–24 hours)
- **Not suitable** — users expect results in seconds, not hours
- Stick with real-time Messages API

### Cost Estimate
| Library size | Requests | Estimated cost (Haiku + caching) |
|---|---|---|
| 100 songs | ~7 | ~$0.002 |
| 500 songs | ~34 | ~$0.01 |
| 1,000 songs | ~67 | ~$0.02 |

Extremely cheap. Model choice and caching matter more for latency than cost at this scale.

### Recommended Pattern
```
System prompt (cached):
  - 7 category definitions (full descriptions)
  - Instruction: return JSON array [{ "id": "<track_id>", "category": "<name>" }]

User message per batch:
  - List of 15-20 songs: track_id | title | artist | genres (if available)

Response:
  - JSON array, one entry per song, category constrained to the 7 valid names
```

---

## Design Decisions Flowing From Research

1. **No audio features** — Claude triages on name + artist + genres only; this is sufficient given Claude's broad musical knowledge
2. **Artist genres are worth fetching** — one extra request per unique artist; queue these in parallel after initial track fetch
3. **Two-phase progress UX**: Phase 1 = fetching from Spotify (progress bar); Phase 2 = triaging with Claude (per-song or per-batch progress)
4. **Exponential backoff wrapper** needed around all Spotify API calls
5. **Session-only state** — no database, but consider `localStorage` snapshot caching so users don't re-fetch on reload
6. **PKCE client-side only** — no backend required; Anthropic API key entered by user or stored in `.env.local`
