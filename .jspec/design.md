# Design

## Technology Choices

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Specified; ideal for client-heavy app |
| Language | TypeScript | Specified |
| UI | shadcn/ui + Tailwind CSS | Specified |
| AI | Claude Haiku 4.5 via Anthropic SDK | Fast, cheap, sufficient for classification |
| Auth | Spotify OAuth 2.0 PKCE | Client-side only; no backend needed |
| State | React state + localStorage cache | No database; session-based with reload resilience |
| Deployment | Vercel | Specified |

---

## Project Layout

```
playlistOrginizer/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Main app page
│   └── api/
│       └── triage/
│           └── route.ts      # Server route — holds Anthropic API key server-side
├── components/
│   ├── ConnectButton.tsx     # Spotify OAuth trigger
│   ├── PlaylistGrid.tsx      # Reusable grid for both sections
│   ├── PlaylistCard.tsx      # Expandable card (cover, name, track count, track list)
│   └── ProgressBar.tsx       # Live progress during fetch + triage phases
├── lib/
│   ├── spotify.ts            # Spotify API client (PKCE, fetch playlists, tracks, create)
│   └── triage.ts             # Batched Claude triage logic
├── types/
│   └── index.ts              # Track, Playlist, Category types
├── .env.local                # ANTHROPIC_API_KEY (never exposed to client)
└── .jspec/                   # Gitignored
```

---

## User Flow

```
1. Landing page
   └── "Connect Spotify" button (PKCE redirect)

2. Callback → token stored in memory/localStorage
   └── Auto-starts ingestion immediately (no extra click)

3. Ingestion phase (top half animates in progressively)
   ├── Fetch all playlists (paginated, 50/req)
   └── For each playlist, fetch all tracks (paginated, 50/req)
       → Deduplicate by Spotify track ID
       → Show original playlists as cards as they load

4. Triage phase (bottom half)
   ├── Batches of 15 songs → POST /api/triage → Claude Haiku
   ├── Progress bar shows X / total triaged
   └── Cards in bottom half populate in real time as batches return

5. Results
   ├── Top half: original playlists (read-only, collapsed by default)
   └── Bottom half: 7 category playlists (collapsed by default)
       └── Click card → expands to show track list

6. Creation
   └── Each category card has "Create in Spotify" button
       → POST to Spotify, adds all tracks
       → Button changes to "Created ✓"
```

---

## Theme

- **Background**: dark (near-black)
- **Primary**: purple (`hsl(270 60% 60%)` range)
- **Cards**: slightly lighter dark surface (`bg-card`)
- Applied via shadcn CSS variable overrides in `globals.css`

---

## UI Layout (Rev 2)

```
┌─────────────────────────────────────────┐  max-w-4xl centred
│                              [Disconnect]│
├─────────────────────────────────────────┤
│  347 tracks across 12 playlists          │  ← total count, no heading
│  ┌────┐ ┌────┐ ┌────┐                  │
│  │    │ │    │ │    │  (skeleton while  │  3×3, cover + count only
│  │ 23 │ │ 17 │ │ 41 │   loading)       │
│  └────┘ └────┘ └────┘                  │
│  ┌────┐ ┌────┐ ┌────┐                  │
│  │    │ │    │ │    │                  │
│  └────┘ └────┘ └────┘                  │
│  ┌────┐ ┌────┐ ┌────┐                  │
│  │    │ │    │ │    │                  │
│  └────┘ └────┘ └────┘                  │
│                  [Show 4 more ↓]        │
├─────────────────────────────────────────┤
│  ░░░░░░░░░░░░░░░  32 / 50 triaged       │  ← only during triage
├─────────────────────────────────────────┤
│  ┌────────┐┌────────┐┌────────┐...      │  7 category cards
│  │🎯      ││⚡      ││✨      │        │
│  │gradient││gradient││gradient│        │
│  │Lock In ││Drive   ││Glow    │        │
│  │23 trk  ││17 trk  ││12 trk  │        │
│  └────────┘└────────┘└────────┘        │
├─────────────────────────────────────────┤
│  [▶ Add all to Spotify]                 │  ← single button, bottom
└─────────────────────────────────────────┘
```

**Category card gradients + emojis:**
| Category | Emoji | Gradient |
|----------|-------|----------|
| Lock In  | 🎯    | indigo-600 → purple-700 |
| Drive    | ⚡    | orange-500 → red-600 |
| Glow     | ✨    | yellow-400 → pink-500 |
| Unwind   | 🌿    | emerald-500 → teal-600 |
| Feels    | 💜    | violet-500 → purple-800 |
| Edge     | 🖤    | zinc-700 → zinc-900 |
| Night    | 🌙    | blue-800 → indigo-950 |

**Expanded track list** (below category grid when card clicked):
```
┌───────────────────────────────────────┐
│ 🎯 Lock In — 43 tracks               │
│ ─────────────────────────────────────│
│ Tycho — Awake                         │
│ Bonobo — Kong                         │
│ ...                          [scroll] │
└───────────────────────────────────────┘
```

---

## Components

### `PlaylistCard`
- Props: `playlist { name, coverUrl, tracks[], status }`
- Collapsed: cover image, name, track count
- Expanded: scrollable track list + optional "Create in Spotify" button (category cards only)
- Click anywhere on card header to toggle expand/collapse

### `PlaylistGrid`
- Responsive grid: 2 cols mobile → 4 cols desktop
- Accepts array of playlists, renders `PlaylistCard` for each

### `ProgressBar`
- Two phases: "Fetching playlists…" and "Triaging tracks…"
- Shows `X / total` count + animated fill

### `ConnectButton`
- Pre-auth: "Connect Spotify" (prominent, centered)
- Post-auth: small connected indicator top-right

---

## Spotify API Client (`lib/spotify.ts`)

- PKCE helpers: `generateCodeVerifier()`, `generateCodeChallenge()`, `buildAuthUrl()`
- `fetchAllPlaylists(token)` — paginates until `next` is null
- `fetchAllTracks(token, playlistId)` — paginates until `next` is null
- `createPlaylist(token, userId, name)` → playlist ID
- `addTracksToPlaylist(token, playlistId, uris[])` — batches 100 URIs per request
- Exponential backoff wrapper around all fetch calls (respects `Retry-After`)

---

## Triage (`lib/triage.ts` + `app/api/triage/route.ts`)

**Client** (`lib/triage.ts`):
- Splits tracks into batches of 15
- POSTs each batch to `/api/triage`
- Fires batches with concurrency limit of 3 (avoids hammering the route)
- Returns `Map<trackId, category>`

**Server route** (`app/api/triage/route.ts`):
- Holds `ANTHROPIC_API_KEY` server-side (never on client)
- Calls Claude Haiku 4.5 with cached system prompt (7 category definitions)
- Input per song: `id | title | artist | album`
- Returns JSON array: `[{ id, category }]`
- Category constrained to exactly one of the 7 names via structured output / strict JSON prompt

---

## Data Flow

```
Spotify token (localStorage)
  → fetchAllPlaylists()
  → fetchAllTracks() × N playlists
  → deduplicate by track ID
  → batch into groups of 15
  → POST /api/triage (×N batches, concurrency 3)
  → Claude Haiku returns [{ id, category }]
  → build 7 category arrays
  → render in bottom grid
  → on "Create": Spotify createPlaylist + addTracks
```

---

## State Shape

```typescript
type AppState = {
  phase: 'idle' | 'connecting' | 'fetching' | 'triaging' | 'done'
  spotifyToken: string | null
  userId: string | null
  originalPlaylists: Playlist[]      // top grid
  allTracks: Track[]                 // deduplicated master list
  categoryPlaylists: CategoryPlaylist[] // bottom grid, 7 items
  progress: { done: number; total: number }
  created: Set<CategoryName>         // which category playlists have been created
}
```

---

## Testing Strategy

- Unit tests on `spotify.ts` pagination logic and deduplication
- Unit tests on batch splitting in `triage.ts`
- Integration test on `/api/triage` route with mocked Anthropic SDK
- Manual E2E: connect real Spotify account, verify all playlists load, triage produces sensible results

## Deployment

- Vercel: zero-config for Next.js
- `ANTHROPIC_API_KEY` set as Vercel environment variable (server-only)
- Spotify app registered at developer.spotify.com with redirect URI pointing to Vercel domain
