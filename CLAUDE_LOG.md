# Claude Session Log

## 2026-09-04 — Vacation calendar integrated into the app

**Done**
- Added `lib/vacations.ts`: the ה'תשפ"ז / 2026–27 vacation schedule from
  `לוח_חופשות_גן_תשפז.ics`, hand-transcribed into a typed `VACATIONS` array
  (trilingual he/en/ru, `end` exclusive per iCal convention). Entries are tagged
  `break` (closed), `camp` (קייטנה — optional day camp during a break), or
  `note` (open with a schedule change, e.g. Memorial Day early dismissal).
  `getVacationsForDate(date)` returns every entry covering a date, breaks first.
- `pages/index.tsx`: each weekday card now renders its vacation badges under the
  holiday line (🏖️ break / ⛺ camp / 🕯️ note), title shown in the active language;
  the "—" empty marker is suppressed when a vacation covers the day; vacation
  titles (Hebrew) are added to the read-aloud output.
- `styles/Home.module.css`: added `.vacation` / `.camp` / `.vacationNote` badge
  styles + mobile font-size rule.
- `npx tsc --noEmit` passes.

**Notes / pending**
- Weekly view only shows a vacation when the current-or-next week overlaps it
  (same behavior as `lib/holidays.ts`). No full-calendar/list view was added.
- `lib/holidays.ts` still holds 2025–26 (ה'תשפ"ו) dates and is now stale for the
  2026–27 school year — not touched this session; update separately if wanted.

## 2026-09-05 20:12 — Diagnosed "Fetch failed" when saving on /admin (גננת)

**Investigated (no code changed)**
- Symptom: saving on the admin page shows "⚠️ fetch failed". Source: `pages/api/data.ts`
  POST branch calls `@upstash/redis` `redis.set()`, which does a `fetch()` to the
  configured KV REST URL; that fetch throws `TypeError: fetch failed`, which the
  handler returns as `{ ok: false, error: "fetch failed" }`.
- Root cause: the Upstash Redis database is gone. `KV_REST_API_URL` in `.env.local`
  is `https://key-alien-126923.upstash.io`, and `nslookup` returns NXDOMAIN /
  `curl` returns HTTP 000. Free-tier Upstash DBs are deleted after long inactivity.
  Same dead host is presumably configured in Vercel project env, so the deployed
  site is broken the same way.
- Secondary: `.env.local` has duplicate keys — placeholder `KV_REST_API_URL=your_vercel_kv_url`
  / `KV_REST_API_TOKEN=your_vercel_kv_token` on lines 1–2, real (dead) values on
  lines 6–7. dotenv last-wins so the real values are the ones in effect; the
  placeholder lines are just cruft to delete.
- No `.data/gan-data.json` exists (local file fallback never used because KV vars are set).

**Pending — user decision**
- Fix A (real fix): provision a new Upstash Redis (Vercel → Storage / Marketplace),
  update `KV_REST_API_URL` + `KV_REST_API_TOKEN` in Vercel env AND `.env.local`, redeploy.
- Fix B (local-only quick test): comment out / remove the `KV_REST_API_*` vars in
  `.env.local` so the API falls back to writing `.data/gan-data.json`. Not valid on
  Vercel (read-only FS) — deployed site still needs Fix A.
- SECURITY: `.env.local` (incl. a live `ANTHROPIC_API_KEY`) was printed to the
  terminal during this session — consider rotating that key.

## 2026-09-05 20:20 — Migrated /api/data storage from Upstash Redis to Vercel Blob

**Done**
- `npm i @vercel/blob` (v2.8.0), `npm uninstall @upstash/redis`.
- `pages/api/data.ts` rewritten to use Vercel Blob instead of Upstash Redis:
  - Storage detection is now `!!process.env.BLOB_READ_WRITE_TOKEN`; `getRedisConfig()`
    and `REDIS_KEY` deleted, replaced by `BLOB_FILE = "gan-data.json"`.
  - GET: `get(BLOB_FILE, { access: "private", useCache: false })`, then
    `new Response(result.stream).json()`. Returns `EMPTY` when the blob doesn't
    exist yet (`result === null`) or on a 304. `useCache: false` reads from origin
    storage so the parents' board never serves a stale copy after a save.
  - POST: `put(BLOB_FILE, json, { access: "private", allowOverwrite: true,
    addRandomSuffix: false, contentType: "application/json" })`.
  - The existing local-file fallback (`.data/gan-data.json`) and the
    `!token && onVercel` guard are unchanged, so `npm run dev` still works with
    no token configured.
- Notes on the SDK that shaped the above (v2.8.0 types):
  - `addRandomSuffix` defaults to false for `put`, but is set explicitly — with a
    random suffix every save would create a NEW blob instead of overwriting.
  - `cacheControlMaxAge` cannot be set below 60s, so it is NOT used; `useCache: false`
    on the read side is the correct fix for staleness.
  - `access: "private"` works on both `put` and `get`; `get` sets the auth header
    automatically. Chosen over "public" so the blob URL isn't world-readable.
- `.env.local` cleaned: removed all 7 `KV_*` / `REDIS_*` lines (dead Upstash DB,
  plus the duplicate `your_vercel_kv_*` placeholders). `ANTHROPIC_API_KEY` and
  `NEXT_PUBLIC_ADMIN_PIN` kept.
- `npx tsc --noEmit` passes. No `upstash`/`REDIS`/`KV_REST` refs remain in source.

**Pending — user must do**
- Add `BLOB_READ_WRITE_TOKEN` to `.env.local` (copy from Vercel dashboard →
  Storage → the Blob store → `.env.local` tab). Vercel CLI is not installed, so
  `vercel env pull` is unavailable. Until then local dev uses `.data/gan-data.json`.
- Verify `BLOB_READ_WRITE_TOKEN` exists in the Vercel project env for Production
  (the Blob integration normally adds it when the store is linked), and delete the
  stale `KV_*` / `REDIS_*` vars there.
- Then: restart dev, save on /admin, confirm "✓ נשמר!" and that a reload persists.
  Commit + deploy and repeat on the live site.

**Gotcha found**
- `.gitignore` covers `.env.local` but NOT `.env.local.bak` — a backup file made
  during this session was untracked-but-committable. It was deleted. Consider
  widening the ignore pattern to `.env*`.

## 2026-09-05 21:05 — Blob auth + access-mode fixes

**Done**
- Fixed "Vercel Blob: OIDC is enabled for this project, but not for the
  development environment". Cause: `resolveBlobAuth()` in @vercel/blob checks
  `options.token` FIRST, then falls to OIDC when an OIDC token is discoverable
  AND `BLOB_STORE_ID` is set. The user's `.env.local` has `BLOB_STORE_ID`, so the
  SDK chose OIDC and never read `BLOB_READ_WRITE_TOKEN`.
  Fix: pass `token: process.env.BLOB_READ_WRITE_TOKEN` explicitly on both the
  `get` and `put` calls. Safe in prod — if the var is absent the value is
  `undefined`, the token branch is skipped, and the SDK falls back to OIDC.
- Verified the whole round-trip locally against the dev server: POST returned
  `{ok:true}`, GET returned the data, and Hebrew survived intact
  (`'בדיקה' === 'בדיקה'`). An earlier `?????` result was the Windows shell
  mangling the curl argument, NOT a data bug. Test data was cleared afterwards.
- Probed the store directly: `access:"private"` succeeds, `access:"public"` fails
  with "Cannot use public access on a private store". So the store reached by the
  token in `.env.local` (`store_ZGRJJaQsDTDMZCjK`) is PRIVATE.
- Production reported the MIRROR error ("Cannot use private access on a public
  store"), which implies production reaches a DIFFERENT, public store.
  Fix: `BLOB_ACCESS` env var, defaulting to "private"; set `BLOB_ACCESS=public`
  in Vercel if the production store is public.

**Pending / unresolved**
- NOT verified: anything about production. The Vercel MCP tools return 403
  Forbidden for team_TAEWh7W1RU6cp3deybrtUkxs, so runtime errors and deployment
  lists were unavailable. The two-store conclusion is an INFERENCE from the
  contradictory error messages, not confirmed.
- User to check Vercel → Storage: how many Blob stores exist and which is linked.
  If only ONE store exists, the two-store inference is wrong and this needs
  re-diagnosing rather than papering over with BLOB_ACCESS.
- Then either set `BLOB_ACCESS=public` in Vercel (quick), or repoint production at
  the private store and drop the var (cleaner).
- SECURITY (still open): `ANTHROPIC_API_KEY` and `BLOB_READ_WRITE_TOKEN` were both
  printed to the terminal during these sessions — rotate both.
- Old kindergarten data from the dead Upstash DB is unrecoverable; board starts empty.

## 2026-09-05 21:30 — Blob access mode now self-detected (replaces BLOB_ACCESS knob)

**Done**
- Production `GET /api/data` returned `"Vercel Blob: Failed to fetch blob: 400
  Bad Request"` — the read path on a `.private.` URL, proving the live build was
  still on `private` and that `BLOB_ACCESS=public` had not taken effect.
- Rewrote `pages/api/data.ts` so the code learns the store's mode instead of
  needing config:
  - GET: `head(BLOB_FILE, { token })` takes no access mode; its returned `url`
    contains `.private.` or `.public.`, which sets module-level `blobAccess`.
    `BlobNotFoundError` → return EMPTY. Then `get()` with the derived mode.
  - POST: try `put` with the current `blobAccess`; on the API's
    "Cannot use X access on a Y store" error, flip the mode and retry once.
  - `BLOB_ACCESS` env var now only seeds the first guess (default private);
    setting it in Vercel is harmless but no longer necessary.
- Live-tested against the real (private) store, deliberately starting with the
  WRONG mode: put(public) → mismatch → retry put(private) OK; head URL →
  `.private.`; get read Hebrew back intact; board reset to empty. `tsc` passes.
- Committed and pushed (user had approved pushing this fix).

**Pending**
- Production still unverified by me (Vercel API 403 for this team). After the
  deploy finishes, test `/admin` save on the live site.
- Still unknown whether prod and local use one store or two — no longer blocks
  anything, but worth a look in Vercel → Storage.
- SECURITY: rotate `ANTHROPIC_API_KEY` and `BLOB_READ_WRITE_TOKEN` (both printed
  to terminal during debugging).

## 2026-09-05 21:45 — PRODUCTION VERIFIED WORKING

**Done**
- Deploy of 98105a8 went live (~20:52). Polled prod `GET /api/data` until the
  `error` field disappeared.
- Prod READ: returns real data with no error. Prod WRITE: idempotent test —
  read, POST identical payload back, re-read → `200 {ok:true}`, no error,
  response byte-identical, Hebrew intact. The mismatch-retry self-heal ran in
  prod (store is public; code defaults private, flipped, succeeded).
- Two-store inference CONFIRMED: local token → private, empty store
  (store_ZGRJJaQsDTDMZCjK); production → public store holding data.

**Correction to earlier entries**
- The board is NOT empty in production and the data is NOT all lost. The prod
  Blob store already held a full week of content dated May 2026 (Shavuot week:
  notes 9.5 / 11.5, stars גיל/סול). Origin unknown — the store predates this
  session despite the "blob store created" message. It is STALE (May), so the
  teacher must update it, but she is not starting from zero.

**Pending (user)**
- Test /admin save in the browser on the live site (API path is verified).
- Rotate ANTHROPIC_API_KEY and BLOB_READ_WRITE_TOKEN (printed to terminal).
- Optional tidy: local .env.local points at a different (private, empty) store
  than production. Fine for dev/prod separation; align if single-store is wanted.
- This log entry is local-only (not committed) to avoid a no-op deploy.

## 2026-09-05 22:10 — Fixed mobile horizontal overflow on the parents' board

**Cause**
- Not box-sizing (globals.css already sets border-box). CSS Grid's bare `1fr`
  means `minmax(auto, 1fr)`, and the `auto` minimum refuses to shrink a track
  below its content's min-content width. Long Hebrew event strings therefore
  pushed `.calendarGrid` wider than the viewport, and the excess cascaded up
  through `.leftCol` → `.layout`. Being RTL, the overflow spilled off the LEFT
  edge — matching the screenshot (שני / חמישי and the stars text clipped).

**Done (styles/Home.module.css)**
- `.layout`, `.calendarGrid` (7-col, 3-col, and the 860px 1-col case) all now use
  `minmax(0, 1fr)` instead of `1fr`.
- `min-width: 0` added to `.leftCol`, `.rightCol`, `.dayCard`, `.starItem`.
- `overflow-wrap: anywhere` on the text classes (.event/.holiday/.vacation/.camp/
  .vacationNote/.reminderEntry/.remindersLabel/.noteText/.starName/.empty).
- New `@media (max-width: 430px)`: calendar drops to 2 columns and bumps several
  font sizes back up — at 3 columns a ~390px phone gives each card only ~120px.
- `npm run build` succeeds; verified in the emitted CSS bundle: 5×`minmax(0,1fr)`,
  0 remaining bare `repeat(N,1fr)`, the 430px 2-col block present.

**Caveat**
- NOT visually verified — no browser/screenshot tool available in this session.
  The CSS reasoning and bundle inspection are solid but the phone rendering is
  unconfirmed until the user looks. If 2 columns reads as too wide/short, the
  430px block is the single place to change.

## 2026-09-05 22:40 — Clickable links in parents' notes

**Done**
- New `lib/linkify.tsx`: splits note text into plain strings + `<a>` React
  elements. Returns React NODES, never HTML, so note text cannot inject markup
  (verified: `<script>` renders escaped). Pattern only accepts `http(s)://` or
  `www.`, so a `javascript:` href is unmatchable.
  - Trailing sentence punctuation is excluded from the link but kept in the text.
  - Bare `www.x` gets an `https://` href while still displaying as typed.
  - Links carry `target="_blank" rel="noopener noreferrer"` and `dir="ltr"`.
- `pages/index.tsx`: notes now render `linkify(tx(note.text), styles.noteLink)`.
- `styles/Home.module.css`: `.noteLink` — indigo, underlined,
  `unicode-bidi: isolate` (an LTR url inside RTL Hebrew is otherwise visually
  reordered) and `overflow-wrap: anywhere` (a long url must not widen the card).
- `pages/api/translate.ts`: prompt now tells the model to copy URLs, emails and
  phone numbers through character-for-character. Without this a link could be
  mangled when a parent switches to EN/RU, since linkify runs on translated text.
- Unit-tested 7 cases through renderToStaticMarkup (Hebrew + url, trailing dot,
  bare www, no url, two urls, parens, script tag). `tsc` and `npm run build` pass.

**Not done / caveats**
- Only NOTES are linkified. Calendar events and reminders are still plain text —
  trivial to extend with the same helper if the teacher puts links there.
- Not visually verified (no browser in session); rendering confirmed only via
  server-rendered markup.
- The translate guard is a prompt instruction, not a guarantee — a model can
  still deviate. Worth spot-checking a note with a link in EN/RU.
