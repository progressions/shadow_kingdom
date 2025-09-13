# Deploy to Fly.io

This repo can be deployed as a single container on Fly.io that serves:
- Static site (index.html, src/, assets/)
- Save API (`/api/save`), with persistent storage via a Fly volume

## Prerequisites
- `flyctl` installed and logged in: `brew install flyctl && fly auth login`
- A Fly organization (default is fine)

## One-time setup

1. Choose an app name (replace `shadow-kingdom-g` as needed):
   - Edit `fly.toml`: set `app = "your-unique-name"` and (optionally) `primary_region`
2. Create a volume for persistent saves:
   - `fly volumes create shadow_kingdom_data --size 1 --region iad`
3. Set the save API secret (optional, recommended):
   - `fly secrets set SAVE_API_KEY=your-long-random-secret`

## Deploy

- `fly deploy`

This builds the Dockerfile, starts a machine, mounts the volume at `/data`, and serves on `https://<app>.fly.dev`.

## Configuration

- Port and paths
  - App listens on `PORT=8080`
  - Static files served from `/app` (repo root copied into container)
  - Saves persisted at `DATA_PATH=/data/saves.json`
- Health check
  - `GET /healthz` is configured in `fly.toml`
- Volume
  - Defined in `[[mounts]]`, source `shadow_kingdom_data` → `/data`

## Client integration

- Same-origin (recommended): `index.html` already sets `window.SAVE_API_URL = ''` when served over http/https, so the game calls `/api/save` on the same origin and does NOT expose a secret.
  - With `SAVE_API_KEY` set server-side, cross-origin calls still require the secret, but same-origin browser calls are allowed without it.
  - The client sends `x-user-id` automatically (generated and stored locally per player).

- Cross-origin (optional): If hosting the static site separately, set in the page:
  ```html
  <script>
    window.SAVE_API_URL = 'https://your-unique-name.fly.dev';
    // Avoid exposing secrets in public clients; if you set SAVE_API_KEY server-side,
    // cross-origin callers will need to proxy or include it server-to-server.
  </script>
  ```

## Useful commands

- Tail logs: `fly logs`
- Open app: `fly open`
- Scale machine size: `fly scale show` / `fly scale vm shared-cpu-1x` / `fly scale memory 256`
- Deploy again: `fly deploy`

## Notes

- The image includes the assets by default. If you need smaller images, consider hosting heavy videos elsewhere or pruning in a custom Docker build.
- Local dev remains simple: open `index.html` in a browser; or run `node server/server.js` to serve both static and API at `http://localhost:8080`.
