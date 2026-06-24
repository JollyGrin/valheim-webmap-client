# WebMapCartographySync

Server-only BepInEx plugin that mirrors **cartography-table pins** onto the **WebMap** web
map. When a player writes their map to a cartography table in-game, their pins show up on the
web map (and persist to WebMap's `pins.csv`). **No client mods. No external services.**

Design + verified data format: [`../../docs/cartography-pin-sync-spec.md`](../../docs/cartography-pin-sync-spec.md).

## How it works

Cartography tables store their shared map data (exploration + pins) in the table's **ZDO**
(`ZDOVars.s_data`, `Utils.Compress`'d), which the dedicated server holds. Every
`poll_interval_seconds`, the plugin:

1. finds all `piece_cartographytable` ZDOs (`ZDOMan.GetAllZDOsWithPrefab`),
2. decompresses + parses the pin list (no `Minimap` needed — pure `ZPackage`),
3. dedupes against pins already in WebMap (deterministic id + 1-unit proximity, mirroring
   vanilla `HavePinInRange`),
4. calls `MapDataServer.AddPin(...)` + `SavePins()` via reflection for each new pin.

Because the table only ever stores the **last writer's** pins (verified — vanilla replaces,
doesn't merge, pins on write), the plugin **accumulates the union** across polls.

## Build

Requires the .NET SDK. Point the build at your game/BepInEx assemblies:

```bash
dotnet build mods/WebMapCartographySync/WebMapCartographySync.csproj -c Release \
  -p:VALHEIM_MANAGED="/path/to/valheim_server_Data/Managed" \
  -p:BEPINEX_CORE="/path/to/BepInEx/core" \
  -p:WEBMAP_DLL="/path/to/BepInEx/plugins/WebMap/WebMap.dll"
```

Output: `WebMapCartographySync.dll`. (`WEBMAP_DLL` is optional — runtime uses reflection — but
referencing it lets the compiler resolve types if you switch to direct calls later.)

> Tip: grab `assembly_valheim.dll` + `UnityEngine*.dll` from your own server (you already have
> FTP access to `valheim_server_Data/Managed`) so the build matches the running version.

## Getting the compiled DLL

You don't need a local toolchain. The GitHub Actions workflow
(`.github/workflows/build-plugin.yml`) compiles this on every push to
`mods/WebMapCartographySync/**` (or via "Run workflow") and publishes
`WebMapCartographySync.dll` as a build **artifact** — no copyrighted DLLs are committed; CI
fetches Valheim via steamcmd, BepInEx via Thunderstore, WebMap via GitHub.

Download it with:
```bash
gh run download --name WebMapCartographySync        # latest run
```

## Deploy (FTP)

1. **Stop the server** (config-write-on-shutdown rule).
2. Upload `WebMapCartographySync.dll` to
   `198.73.57.160_27029/BepInEx/plugins/` (loose, like the other single-file mods).
   Requires WebMap already installed (it is).
   ```bash
   curl --user "USER:PASS" -T WebMapCartographySync.dll \
     "ftp://198.73.57.160:8823/198.73.57.160_27029/BepInEx/plugins/WebMapCartographySync.dll"
   ```
3. Start the server. Confirm in `BepInEx/LogOutput.log`:
   - `WebMapCartographySync v0.1.0 loaded ...`
   - `Bound to WebMap MapDataServer (...)`
4. Edit `BepInEx/config/lol.dean.turtleheim.webmapcartographysync.cfg` **only while stopped**.

## Test

1. In-game: place a couple of map markers (the placeable Icon pins), go to a cartography
   table, click **write**.
2. Within `poll_interval_seconds`, pins appear on the web map + in
   `BepInEx/plugins/WebMap/map_data/<world>/pins.csv`.
3. Write again with no new pins → no duplicates (line count steady).
4. Second player writes different pins → both coexist (union accumulation).
5. Restart server → no duplicate re-import (dedupe primed from `pins.csv`).

## Assumptions to confirm on first run (logged if wrong)

These are verified against decompiled source but worth a glance after major Valheim updates:

- **Map-data `version == 2`** and the field layout in `CartographyScanner.ReadPins`. If a future
  patch bumps the version, re-check `Minimap.GetSharedMapData`.
- **`ZDOMan.GetAllZDOsWithPrefabIterative(string, List<ZDO>, ref int)`** signature — looped
  until it returns true (logs an error if it differs).
- **`piece_cartographytable`** prefab name (configurable).
- **WebMap reflection targets**: static `mapDataServer` field, `AddPin(6 args)`, static
  `SavePins()`, `pins` list. The bind step logs exactly what it found/missed.

## Pin deletion (v0.2, opt-in)

Set `[Deletion] enable_owner_reconciliation = true` to also **remove** pins from the web map
when a player deletes them in-game and re-records at a cartography table. It's **per-owner**:
each pin carries an ownerID, so a player's write is treated as the authoritative current set
*for their own pins only* — additions and removals apply to that owner, and other players'
mirrored pins are never touched (the table only ever holds the last writer's pins, so absence
≠ deletion for anyone else). Our pins are tagged with a `cart…` id, so reconciliation can never
remove chat (`!pin`) or web-created pins.

Default is **off** (additive only). See [`../../docs/cartography-pin-deletion.md`](../../docs/cartography-pin-deletion.md)
for the design and the one known limitation below.

## Known limitations

- **Delete-all then record can't be detected** (even with reconciliation on): if a player removes
  *every* pin and records, their owner id is absent from the write, so we can't tell their pins
  should be cleared. Use WebMap's `!deletePin <text>` / `!undoPin` for a full clear.
- **Unchecking** a pin in-game is not reflected on the web map.
- **No player display-name** — the shared data carries the owner's numeric `playerID` + the pin
  label, not a name. WebMap's `id`/`name` fields get the `ownerID` string. (Future: resolve
  names from connected peers.)
- Players must **actively write** to a cartography table; this is not passive pin capture
  (that's impossible server-side — see the spec's §1).
