# Design: manual "delete pin" web API (v0.3, NOT yet implemented)

**Goal:** let an admin/player remove a cartography-mirrored pin **from the website**, as a quick
cleanup, instead of going in-game. It's intentionally a convenience layer — a web-deleted pin
will reappear on the owner's **next** cartography-table write (their in-game map still has it),
which is acceptable per the request.

This doc is design only. Implementation is deferred.

## Constraints (unchanged from the sync feature)

- Only **port 27031** is open on HostHavoc, and it's **WebMap's HTTP server**, already proxied by
  the Cloudflare worker (`empty-dream-fe29…`). So the website can already reach `:27031` for any
  path. No new port, no Railway.
- We don't fork WebMap's DLL; we attach at runtime by reflection from our plugin.

## What WebMap exposes (confirmed from source + binary)

From `MapDataServer`:
```csharp
private readonly HttpServer httpServer;                 // websocket-sharp HttpServer on SERVER_PORT
httpServer.AddWebSocketService<WebSocketHandler>("/");  // the live WS feed
httpServer.OnGet += (s,e) => { if (ProcessSpecialRoutes(e)) return; ServeStaticFiles(e); };
public void RemovePin(int idx)   // removes pins[idx] + broadcasts "rmpin\n{pinId}" to all clients
public static MapDataServer getInstance()
```
**Key fact: WebMap only handles `OnGet`.** `OnPost` is unused → we can own it with **zero conflict**
with WebMap's file serving. (An `OnGet` handler would also fire WebMap's file/404 logic for the
same request; `OnPost` sidesteps that entirely.)

We already have `WebMapBridge.RemovePin(pinId)` (matches our `cart…`-prefixed id in `pins`,
calls `RemovePin(idx)`) and `SavePins()`.

## Proposed design

### Plugin (server) — attach an OnPost route
1. Reference `websocket-sharp.dll` (in `BepInEx/plugins/WebMap/`) at build so we can use
   `HttpServer` / `HttpRequestEventArgs` types.
2. After `WebMapBridge.TryBind()`, reflect the private `httpServer` field off the `MapDataServer`
   instance and subscribe:
   ```csharp
   httpServer.OnPost += (sender, e) => {
       var req = e.Request; var res = e.Response;
       if (req.RawUrl != "/cartpin/delete") return;        // not ours → ignore
       if (!AuthOk(req)) { res.StatusCode = 401; res.Close(); return; }
       string pinId = ReadPinId(req);                       // from query or JSON body
       if (string.IsNullOrEmpty(pinId) || !pinId.StartsWith("cart")) { res.StatusCode = 400; res.Close(); return; }
       bool ok = WebMapBridge.RemovePin(pinId);             // refuses non-cart ids by construction
       if (ok) { WebMapBridge.SavePins(); RemoveFromMirrorState(pinId); }
       res.StatusCode = ok ? 200 : 404; res.Close();
   };
   ```
3. **Only `cart…`-prefixed ids are honored**, so this API can never delete chat (`!pin`) or
   web-created WebMap pins.
4. Update the in-memory `MirrorState` so the plugin doesn't think it's still mirrored. (It will be
   re-added on the owner's next table write — see Limitations.)

### Request contract
```
POST /cartpin/delete            (via the worker: https://<worker>/cartpin/delete)
  auth:  X-Cart-Token: <token>  (or ?token=)
  body:  { "pinId": "cart…" }   (or ?id=cart…)
  200 removed · 400 bad/none-cart id · 401 bad token · 404 not found
```
The website already knows each pin's `pinId` (WebMap broadcasts `pin\n{id}\n{pinId}\n…` over the
WS feed the iframe consumes), so the UI can send it directly.

### Auth (required — this deletes data)
- A shared **token** in the plugin config (`[Api] delete_token`). Requests must present it.
- **Preferred:** the **Cloudflare worker injects** the token (kept as a Worker secret) so the public
  site never carries it; the site just POSTs to the worker path and the worker adds the header
  before proxying to `:27031`. The worker can also restrict method+path and reject everything else.
- The worker should handle **CORS preflight** (`OPTIONS`) and `Access-Control-Allow-*` since the
  call is cross-origin (site origin → worker). websocket-sharp's `OnPost` won't see `OPTIONS`, so
  preflight must be answered by the worker.

### Website (wrapper)
- Add a delete control (e.g. a trash button on the pin overlay/list) that POSTs `{pinId}` to the
  worker. Optimistically remove from the UI; the `rmpin` broadcast confirms for all clients.

### Worker changes
- New branch for `POST /cartpin/delete`: answer `OPTIONS` (CORS), inject `X-Cart-Token`, forward to
  `http://valheim.dean.lol:27031/cartpin/delete`, relay status. Keep the existing GET/WS proxy.

## Limitations
- **Transient by design:** the owner's in-game map still has the pin, so their **next** cartography
  write re-adds it. This API is for interim cleanup, not authoritative deletion. (Per the request.)
- **Auth is mandatory** — without the token gate, anyone could delete pins. Don't ship the token in
  client code; inject it at the worker.
- **CORS/preflight** must be handled at the worker (the plugin's `OnPost` only sees the POST).
- Reflecting a private field couples us to WebMap internals; if a future WebMap renames `httpServer`
  the attach logs a warning and the API simply goes dark (map/sync unaffected).

## Effort
Small–moderate, additive to the existing plugin. Main work is the auth/CORS plumbing (plugin token
check + worker injection/preflight) rather than the delete itself (already have `RemovePin`).
Ships as **v0.3**; same build/deploy loop as today (see [cartography-pin-sync-spec.md](./cartography-pin-sync-spec.md)).
