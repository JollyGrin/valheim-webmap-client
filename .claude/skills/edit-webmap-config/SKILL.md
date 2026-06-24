---
name: edit-webmap-config
description: Edit the Valheim WebMap mod config on the HostHavoc dedicated server over FTP. Use when changing WebMap settings such as always_visible (show all player markers), server_port, default_zoom, or other BepInEx WebMap options for valheim.dean.lol. Covers connecting via FTP, the exact config path, and the critical "stop the server first" rule.
---

# Edit the Valheim WebMap server config (HostHavoc, over FTP)

The WebMap mod (`h0tw1r3/valheim-webmap` fork, v2.7.1) runs as a BepInEx plugin on the
**remote HostHavoc dedicated server**. Its config is NOT in this repo and NOT on the
local Mac — it can only be edited over FTP.

## Connection

| Field | Value |
|---|---|
| Host | `198.73.57.160` (HostHavoc) |
| FTP port | **`8823`**  ← not 21 (firewalled, times out), not 27029 (game UDP port) |
| Username | **ask the user** (not stored here) |
| Password | **ask the user** (not stored here — low-sensitivity but must never be written to disk) |

> Credentials are intentionally not saved. If they aren't already in the conversation,
> ask the user for the FTP username and password. Do not commit them anywhere.

Reference ports: game `27029` (UDP), WebMap HTTP `27031` (TCP, needs a HostHavoc ticket to open).

## Tooling

`lftp` and `ftp` are NOT installed on this Mac; only `sftp` is, but the server is **plain FTP**.
Use Python's built-in `ftplib` (no install needed).

## The one rule that bites every time

**BepInEx rewrites the config file from memory on shutdown.** Editing while the server is
running reads back fine on disk but gets clobbered on the next stop. So the order is:

1. **Stop** the server (HostHavoc control panel) — the user does this; confirm it's stopped.
2. Edit the `.cfg` over FTP (steps below).
3. **Start** the server (startup *reads* config; only shutdown *writes* it).
4. Verify in `BepInEx/LogOutput.log` → `WebMap: HTTP Server Listening on port NNNNN`.

## Config file

```
BepInEx/config/com.github.h0tw1r3.valheim.webmap.cfg
```
(Exact FTP path may sit under a server subfolder — list the FTP root first to locate it.)

Useful keys (BepInEx INI format, `key = value`):

| Section | Key | Notes |
|---|---|---|
| `[User]` | `always_visible` | `true` = show **every** player's map marker, ignoring their in-game "share position" toggle. This is the fix for "player not on the map." |
| `[User]` | `always_map` | `true` = paint explored terrain for hidden players (does NOT show the live marker — that's `always_visible`). |
| `[Server]` | `server_port` | WebMap HTTP port (currently `27031`). |
| `[Server]` | `cache_server_files` | `false` while iterating on web assets; `true` for performance. |
| `[Texture]` | `default_zoom` | Starting zoom; higher = more zoomed in. |

Why `always_visible` and not `always_map`: the server always *sends* position (because
`always_map` defaults true) but still tags the player `hidden`; the **client** suppresses
the live marker unless `always_visible` is true.

## Procedure (Python ftplib template)

Ask for USER/PASS first, then run. This downloads the cfg, lets you edit, and re-uploads.

```python
from ftplib import FTP
import io, re

HOST, PORT = "198.73.57.160", 8823
USER, PW = "<ask user>", "<ask user>"
CFG = "BepInEx/config/com.github.h0tw1r3.valheim.webmap.cfg"  # adjust if under a subdir

ftp = FTP(); ftp.connect(HOST, PORT, timeout=30); ftp.login(USER, PW)
# If CFG path is unknown, explore: ftp.retrlines("LIST")  /  ftp.cwd("...")

buf = io.BytesIO(); ftp.retrbinary(f"RETR {CFG}", buf.write)
text = buf.getvalue().decode("utf-8", "replace")

# Example edit: always_visible = true
text = re.sub(r"(?m)^always_visible\s*=.*$", "always_visible = true", text)

ftp.storbinary(f"STOR {CFG}", io.BytesIO(text.encode("utf-8")))
ftp.quit()
print("done")
```

## After editing

Have the user start the server, then confirm the WebMap is live:

```
curl -m 12 -i http://valheim.dean.lol:27031/        # direct
curl -m 12 -i https://empty-dream-fe29.innkeeper1.workers.dev/   # via Cloudflare worker
```

Player markers update within a couple seconds of a player moving once `always_visible = true`.
