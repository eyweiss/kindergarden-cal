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
