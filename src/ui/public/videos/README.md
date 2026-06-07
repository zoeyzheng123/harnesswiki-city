# Demo videos

Drop two short-form (9:16 vertical) clips here so the dashboard's
"Output: baseline vs best" comparison can play them:

- `gen-1.mp4` — generation 1, the baseline output
- `gen-5.mp4` — generation 5, the best output

Vite serves this folder at the site root, so they resolve at `/videos/gen-1.mp4`
and `/videos/gen-5.mp4` (wired in `src/ui/lib/videos.ts`). Until the files exist,
the player shows a graceful poster fallback with the concept's hook, so nothing
looks broken.

Keep them short (the harness produces ~30s short-form). Whether to commit the
binaries or keep them local is a team call; `.mp4` is not gitignored by default.
