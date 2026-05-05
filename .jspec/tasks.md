# Tasks

## Stage 1 — Project scaffold & tooling
- [x] 1.1 Initialise Next.js 15 app with TypeScript and App Router (`create-next-app`)
- [x] 1.2 Install and configure shadcn/ui and Tailwind CSS4
- [x] 1.3 Install ESLint + Prettier; add `.eslintrc` and `.prettierrc`; wire into `package.json` scripts
- [x] 1.4 Add `.env.local` with placeholder `ANTHROPIC_API_KEY`; add `.env.local` to `.gitignore`
- [x] 1.5 Add core type definitions (`Track`, `Playlist`, `CategoryPlaylist`, `CategoryName`, `AppState`) in `types/index.ts`
- [x] 1.6 Demo: `npm run dev` starts without errors; `npm run lint` passes

## Stage 2 — Spotify OAuth (PKCE)
- [x] 2.1 Implement PKCE helpers in `lib/spotify.ts`: `generateCodeVerifier`, `generateCodeChallenge`, `buildAuthUrl`
- [x] 2.2 Build `ConnectButton` component; clicking it redirects to Spotify auth
- [x] 2.3 Handle OAuth callback on the main page: extract `code`, exchange for token, store in state and `localStorage`
- [x] 2.4 Show connected state indicator (top-right) after successful auth; show "Connect Spotify" centred before auth
- [x] 2.5 Demo: click Connect, authorise in Spotify, land back on app with connected indicator shown

## Stage 3 — Fetch all playlists and tracks
- [x] 3.1 Implement `fetchAllPlaylists(token)` with pagination (limit 50, follow `next`)
- [x] 3.2 Implement `fetchAllTracks(token, playlistId)` with pagination (limit 50, follow `next`)
- [x] 3.3 Add exponential backoff wrapper for all Spotify fetch calls (respect `Retry-After` on 429)
- [x] 3.4 On connect, auto-trigger full fetch; deduplicate tracks by Spotify ID
- [x] 3.5 Build `PlaylistCard` component (collapsed: cover, name, track count)
- [x] 3.6 Build `PlaylistGrid` component (responsive: 2 col mobile → 4 col desktop)
- [x] 3.7 Render original playlists in top half of page as they load; show `ProgressBar` during fetch phase
- [x] 3.8 Demo: connect account, watch playlists populate in top grid with correct names, covers, and track counts

## Stage 4 — Claude triage
- [x] 4.1 Create `app/api/triage/route.ts`; accepts batch of tracks, calls Claude Haiku 4.5 with cached system prompt (7 category definitions), returns `[{ id, category }]`
- [x] 4.2 Implement `lib/triage.ts`: sends all 50 tracks in a single prompt (BATCH_SIZE=50, CONCURRENCY=1)
- [x] 4.3 After fetch completes, auto-start triage; update progress bar (`X / total triaged`)
- [x] 4.4 Build the 7 category cards in bottom half; populate in real time as results return
- [x] 4.5 Demo: after playlists load, watch bottom grid populate with tracks sorted into 7 categories; progress bar fills to completion

## Stage 5 — Expand / collapse and playlist creation
- [x] 5.1 Click a category card toggles a scrollable track list panel below the grid
- [x] 5.2 "Create in Spotify" button sits directly on each card (visible once triage is done)
- [x] 5.3 `createSpotifyPlaylist` in `lib/spotify.ts` uses Feb 2026 endpoints (`POST /me/playlists`, `POST /playlists/{id}/items`, batched at 100 URIs)
- [x] 5.4 On button click: creates playlist, adds all tracks, button updates to "✓ Created"; indeterminate progress bar shown while in flight; errors shown inline
- [x] 5.5 Demo: triage completes, click "Create in Spotify" on any category, confirm playlist appears in Spotify library

## Stage 7 — Mobile responsive

- [ ] 7.1 Playlist grid: 2 columns on mobile (`grid-cols-2`), 3 on tablet and up — show 4 cards by default, +N more
- [ ] 7.2 Category cards: 2 columns on mobile, 4 on tablet (`sm:grid-cols-4`), 7 on desktop (`lg:grid-cols-7`) — already partially set, verify and tighten
- [ ] 7.3 Category card content: shrink emoji and text at small sizes so nothing overflows or wraps awkwardly
- [ ] 7.4 Expanded track list panel: artist name moves below track name on mobile (stacked layout) instead of side by side
- [ ] 7.5 Landing page: ensure heading, description, and button stack cleanly at 375px width; adjust `paddingTop` so button stays near vertical centre on small screens
- [ ] 7.6 Touch targets: ensure all interactive elements are at least 44px tall on mobile (connect button, category cards, show-more, disconnect, add-all)
- [ ] 7.7 Horizontal overflow: confirm no element causes horizontal scroll at 375px — add `overflow-x-hidden` to body if needed
- [ ] 7.8 Demo: run through full flow on a 375px viewport (browser devtools mobile simulation); all content readable and tappable, no overflow

## Stage 6 — UI overhaul (Rev 2)
- [ ] 6.1 Dark + purple theme: override shadcn CSS variables in `globals.css`; verify all existing components pick up the new colours
- [ ] 6.2 Landing page: full-screen centred layout, app name + single purple "Connect to Spotify" button; remove everything else
- [ ] 6.3 App layout: wrap content in `max-w-4xl mx-auto`, add top-right disconnect button, remove page title and all section headings
- [ ] 6.4 Playlist section — skeleton loading: show 9 skeleton cards during fetch instead of fetch progress bar; display "X tracks across Y playlists" count line above grid
- [ ] 6.5 Playlist section — 3×3 cap with show-more: render first 9, hide the rest behind an inline "Show N more" toggle; each card shows cover image + track count only
- [ ] 6.6 Category cards: replace solid colour block with gradient + emoji per category (see design.md table); keep click-to-expand track list
- [ ] 6.7 Remove per-card "Create in Spotify" buttons; add single "Add all to Spotify" button below category grid; on click, create all non-empty playlists in sequence with indeterminate progress bar; button becomes "All added ✓"
- [ ] 6.8 Demo: full flow — dark purple UI, skeleton loads, triage bar fills, category cards look polished, single add button works
