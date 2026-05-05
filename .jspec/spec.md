# Playlist Organiser — Spec

## Purpose

A web app that connects to a user's Spotify account, pulls every track from all their playlists, triages each one via Claude API into one of seven mood/energy categories, then lets the user create those seven new playlists directly in Spotify.

---

## Scope

### In scope
- Spotify OAuth login
- Fetching all of the user's playlists and every track within them (deduped)
- Sending each track (title + artist + optionally genre/audio features) to Claude API for categorisation
- Displaying the seven resulting playlists in the UI with their assigned tracks
- Creating any or all of the seven playlists in the user's Spotify account

### Out of scope
- Manual re-triage or overriding Claude's decisions
- Non-Spotify music sources
- Editing playlist names or descriptions after creation
- Handling podcast episodes or local files
- User accounts / persistence beyond the session

---

## The Seven Categories

See [triage.md](triage.md) for the full category definitions, decision framework, and Claude prompt strategy.

| # | Name | One-line summary |
|---|------|-----------------|
| 1 | **Lock In** | Focus. Medium–low energy, neutral valence. Texture of concentration. |
| 2 | **Drive** | Momentum. High energy, forward-moving. Workouts, hype, running. |
| 3 | **Glow** | Social brightness. Medium–high energy, positive. The "everything's alright" register. |
| 4 | **Unwind** | Wind-down. Low energy, warm. Evenings in, permission to stop. |
| 5 | **Feels** | Emotional weight. Any energy, dark/complex valence. Music you engage with intentionally. |
| 6 | **Edge** | Heavy intensity. High energy, dark. Confrontational, menacing, not just sad. |
| 7 | **Night** | After midnight. Medium energy, atmospheric. Belongs after the world goes quiet. |

---

## Features

1. **Spotify auth** — OAuth 2.0 PKCE flow; no backend secrets needed
2. **Track ingestion** — fetch all playlists → all tracks → deduplicate by Spotify track ID
3. **Claude triage** — each track sent to Claude API with title, artist, and any available metadata; Claude returns one of the seven category names
4. **Results view** — display all seven playlists with track counts and scrollable track lists
5. **Playlist creation** — per-category buttons to create the playlist in Spotify; confirmation on success

---

## Functional Requirements

- Must handle users with large libraries (hundreds of tracks) without timing out
- Triage must process tracks in batches to stay within Claude API rate limits
- Duplicate tracks across playlists appear in only one output playlist
- UI shows live progress during ingestion and triage phases
- Created playlists are named exactly: "Lock In", "Drive", "Glow", "Unwind", "Feels", "Edge", "Night"

---

## Non-Functional Requirements

- **Stack**: Next.js (App Router), TypeScript, shadcn/ui, Tailwind CSS
- **AI**: Claude API (Anthropic SDK) for triage
- **Auth**: Spotify OAuth 2.0 with PKCE (client-side only; no backend required for auth)
- **Deployment**: Vercel (target)
- **No database**: all state is in-memory / client session

---

## Rev 2 — UI / UX Requirements

### Theme
- Dark background, purple as primary colour throughout
- Modern, minimal — big clear components, generous spacing

### Landing page
- Full-screen centred: app name + single "Connect to Spotify" button
- Nothing else

### App layout
- Constrained max-width (not full bleed), centred
- Remove page title and section labels ("Your Playlists", "Playlist Organiser")
- Three vertical sections in order: playlists → triage progress → category grid → add button

### Playlist section
- Shows total track count across all playlists as a single line above the grid
- Grid capped at 3×3 (9 cards); remainder hidden behind "Show X more" inline toggle
- Each card: cover image + track count only (no playlist name)
- Skeleton loading cards while playlists are being fetched (no fetch progress bar)

### Triage section
- Single progress bar below the playlist grid, visible only during triage phase

### Category grid
- 7 cards in a row (or wrapping grid on small screens)
- Each card: gradient background + representative emoji + category name + track count
- Click card → track list expands below the grid (same as current)

### Add to Spotify
- Single "Add all to Spotify" button below the category grid
- Creates all non-empty category playlists in sequence
- Indeterminate progress bar visible while in flight
- Button becomes "All added ✓" on completion
- No per-card create buttons
