# Deployment

How this project gets onto the live Valheim server + web stack. Read this before
redeploying — there are a few non-obvious gotchas that cost real time to discover.

## Architecture (three pieces, three places)

```
 Browser ──> SvelteKit wrapper (build/)        hosted on a web host (Vercel/Netlify/Pages)
                │ iframe src
                ▼
            Cloudflare Worker                  empty-dream-fe29.innkeeper1.workers.dev
                │ proxies HTTP + WebSocket      (code: patches-for-plugin/cloudflare-worker-proxy.js)
                ▼
            WebMap mod (HTTP server)            on the Valheim dedicated server (HostHavoc)
```

- **This repo is NOT a server mod.** The server mod is the `WebMap` BepInEx plugin
  (fork: `h0tw1r3/valheim-webmap`, v2.7.1). This repo holds (a) the web wrapper UI
  (`src/`, `build/`), and (b) customized web assets the plugin serves
  (`patches-for-plugin/index.html`, `patches-for-plugin/main.js`) + the proxy worker.
- The wrapper points its iframe at the **Worker**, not the server directly — because the
  wrapper is HTTPS and the map server is plain HTTP (mixed-content would be blocked).

## Current server (HostHavoc)

- IP: `198.73.57.160`
- Game / connect port: `27029`  (UDP — TCP probes to it always "fail", that's normal)
- Query port: `27030`
- FTP: `198.73.57.160:8823` (plain FTP, user `dean11`)
- WebMap HTTP port: `27031`  (HostHavoc-assigned; must be within their firewall range)
- DNS: `valheim.dean.lol` → A → `198.73.57.160` (**DNS-only / grey cloud**, see gotcha #1)

## Server-side install (BepInEx plugin)

1. HostHavoc panel → **Non Workshop Mod** tool → install **BepInEx** (NOT the Nexus mod
   catalog — WebMap will never be listed there). Start once to generate folders, then stop.
2. Get the baseline plugin: `WebMap-v2.7.1.zip` from
   https://github.com/h0tw1r3/valheim-webmap/releases (or Thunderstore).
3. Upload to `BepInEx/plugins/WebMap/` over FTP. Final layout:
   ```
   BepInEx/plugins/WebMap/WebMap.dll
   BepInEx/plugins/WebMap/websocket-sharp.dll   (required dependency)
   BepInEx/plugins/WebMap/web/{index.html, main.js, drawdown.js, mapIcons.png, style.css, tile.webp}
   ```
   Note: HostHavoc's generic "put the .dll directly in plugins/, no subfolder" advice does
   NOT apply here — WebMap must stay in its `WebMap/` subfolder so the DLL finds its `web/`.
4. Overwrite the served web assets with this repo's fork:
   - `BepInEx/plugins/WebMap/web/index.html` ← `patches-for-plugin/index.html`
   - `BepInEx/plugins/WebMap/web/main.js`    ← `patches-for-plugin/main.js`
   (Leave drawdown.js / mapIcons.png / style.css / tile.webp as baseline.)
5. Config: `BepInEx/config/com.github.h0tw1r3.valheim.webmap.cfg`
   - `server_port = 27031`
   - `cache_server_files = false`  (so web-asset edits show without a full restart; set
     back to `true` once stable for performance)
   Config is only created on first boot — start once before editing it.

## Web-side deploy

- **Worker** (`patches-for-plugin/cloudflare-worker-proxy.js`): set
  `BASE_ORIGIN = 'http://valheim.dean.lol:27031'`, deploy to `empty-dream-fe29`
  (dashboard paste or `wrangler deploy`). Editing the repo file does nothing until redeployed.
- **Wrapper** (`build/`): the SvelteKit app; iframe src is the Worker URL
  (`src/routes/+page.svelte`). Deploy to your web host.

## Gotchas (the expensive lessons)

1. **Cloudflare Workers cannot `fetch()` a raw IP** → returns `error 1003` instantly.
   The Worker origin MUST be a hostname, hence `valheim.dean.lol`. The A record is
   **DNS-only (grey cloud)** on purpose: a proxied/orange record only serves 80/443 and
   would strip the non-standard `:27031` port.
2. **The WebMap port is firewalled by HostHavoc by default.** A direct probe to
   `:27031` *times out* (not "refused") — the signature of a default-deny firewall
   dropping packets. Opening it requires a **HostHavoc support ticket**:
   > "Please open inbound TCP port 27031 on my Valheim server (198.73.57.160). I run the
   > WebMap mod which serves an HTTP map on that port. If 27031 can't be opened, tell me
   > which TCP port I can use." — then update `server_port` + Worker `BASE_ORIGIN` to match.
3. Valheim game ports are **UDP** — a TCP connectivity test against 27029/27030 will
   always look "closed." Don't use that to judge whether the server is up.
4. **BepInEx rewrites the config file on shutdown with its in-memory values.** If you
   edit `*.cfg` while the server is running, the change reads back fine on disk but gets
   clobbered when the server next stops. ALWAYS edit config with the server **stopped**,
   then start (startup reads, only shutdown writes). Verify the new port took effect via
   `BepInEx/LogOutput.log` → `WebMap: HTTP Server Listening on port NNNNN`.

## Verify end-to-end (after the port is open)

```
curl -m 12 -i http://valheim.dean.lol:27031/                       # direct: should return the map HTML
curl -m 12 -i https://empty-dream-fe29.innkeeper1.workers.dev/     # via worker: same HTML
```
Then load the wrapper in a browser and confirm the map renders + pins work.
