# Spec: Server-Side Cartography → WebMap Pin Sync

**Goal:** When players upload their map markers to a **cartography table** in-game, mirror
those pins onto the WebMap web map — **server-side only, no client mods**, and **without
double-posting** pins that already exist.

This is a new BepInEx **server plugin** (working name: `WebMapCartographySync`) that lives
beside WebMap in `BepInEx/plugins/`. Clients stay 100% vanilla.

---

## 1. Why this is the right approach

| In-game action | Crosses the network? | Server can observe it? |
|---|---|---|
| Personal map pin (open map, click) | No — local `Minimap.AddPin`, saved to the player's own character file | **No** |
| Ping (middle-click map) | Yes — `ChatMessage` RPC, type `Ping` | Yes (transient only) |
| `!pin` chat command | Yes — `ChatMessage` RPC | Yes (WebMap already handles) |
| **Write to cartography table** | **Yes — data is stored in the table's networked ZDO, persisted in the world save** | **Yes ← this spec** |

A cartography table is a placed piece backed by a **ZDO** (networked, server-persisted
object). When a player interacts with the *writing* side, the game serializes their
explored map **and their map pins** into that ZDO. The server holds every ZDO, so the pin
data is readable server-side with no client involvement. This is the only passive,
no-client-mod path that yields **persistent** pins (pings are transient; `!pin` requires
players to type commands).

**Trade-off to accept:** it's not automatic — a player must walk to a cartography table and
click "write" to share. That's a deliberate, normal in-game gesture.

---

## 2. Architecture

```
Player writes map+pins to cartography table (vanilla client)
        │  (data serialized into the table's ZDO, synced to server)
        ▼
Dedicated server's ZDOMan  ── holds the table ZDO + its byte[] map-data field
        │
        ▼
WebMapCartographySync plugin (this spec)
   1. Poll every cartography-table ZDO on an interval
   2. Read + decompress the map-data byte[]
   3. Hand-parse the pin list out of it (no Minimap on server)
   4. Dedupe against pins already in WebMap
   5. For each NEW pin → call WebMap's MapDataServer.AddPin(...) + SavePins()
        │
        ▼
WebMap broadcasts the pin over WebSocket + persists it to pins.csv → appears on the web map
```

No Harmony patches are strictly required for v1 — polling `ZDOMan` is simpler and more
robust on a headless server than trying to hook a client-side write path. (A patch-based
trigger is listed as a future optimization in §9.)

---

## 3. The hard part: reading the table's pin data server-side

### 3.1 Find the cartography-table ZDOs

```csharp
// Prefab name to VERIFY in your game version (ZNetScene prefab list):
const string CartographyPrefab = "piece_cartographytable";
int prefabHash = CartographyPrefab.GetStableHashCode();

var zdos = new List<ZDO>();
// Current Valheim only exposes the ITERATIVE form (the simple one was removed):
//   bool GetAllZDOsWithPrefabIterative(string prefab, List<ZDO> zdos, ref int index)
// It appends to `zdos`, does ~400 sectors per call, and returns true when complete:
int index = 0;
while (!ZDOMan.instance.GetAllZDOsWithPrefabIterative(CartographyPrefab, zdos, ref index)) { }
```

### 3.2 Read the map-data byte array from the ZDO — ✅ CONFIRMED

Confirmed from decompiled `MapTable.OnWrite`/`OnRead`: the cartography table stores its data
in the ZDO under **`ZDOVars.s_data`**, **`Utils.Compress`'d**, and the payload is exactly the
output of `Minimap.GetSharedMapData()`.

```csharp
byte[] raw = zdo.GetByteArray(ZDOVars.s_data);   // null if the table was never written to
if (raw == null || raw.Length == 0) continue;
byte[] data = Utils.Decompress(raw);
```

### 3.3 Decompress + parse the pins (no Minimap) — ✅ CONFIRMED FORMAT

The decompressed payload is a `ZPackage` with this **exact** layout (verified against decompiled
`Minimap.GetSharedMapData` + `ReadExploredArray`, current map-data **version `2`**):

```
int    version              // live game = 3 (was 2; v3 added per-pin author)
int    exploredLength        // == textureSize * textureSize
bool[] explored              // `exploredLength` bools, 1 byte each  (we skip these)
int    numPins               // only pins with m_save==true AND type != Death are written
repeat numPins:
    long    ownerID          // pin owner's playerID (0 written as the writer's id)
    string  name             // the pin's LABEL text (not a player name)
    Vector3 pos              // 3 floats x,y,z  (use x,z; y is unused on the web map)
    int     type             // Minimap.PinType
    bool    checked
    string  author           // v3 ONLY: PlatformUserID.ToString() (e.g. "Steam_7656...") — read & discard
```
> Confirmed against live server data: `version=3`, `exploredLength=4194304` (2048²). v2 had no
> author field; reading it only when `version >= 3` keeps both formats working.

Reference parser (no `Minimap` needed — pure ZPackage + the `Minimap.PinType` enum, all
available on a dedicated server):

```csharp
ZPackage pkg = new ZPackage(data);
int version       = pkg.ReadInt();      // expect 2
int exploredLength = pkg.ReadInt();     // == textureSize²; comes from the stream, no need to assume size
SkipBytes(pkg, exploredLength);         // each bool == 1 byte in ZPackage

var pins = new List<ParsedPin>();
if (version >= 2)
{
    int numPins = pkg.ReadInt();
    for (int i = 0; i < numPins; i++)
    {
        long ownerID  = pkg.ReadLong();
        string label  = pkg.ReadString();
        Vector3 pos   = pkg.ReadVector3();
        var type      = (Minimap.PinType)pkg.ReadInt();
        bool isChecked = pkg.ReadBool();
        pins.Add(new ParsedPin(ownerID, label, pos, type, isChecked));
    }
}
```

`SkipBytes` advances the reader without allocating — set the underlying
`BinaryReader.BaseStream.Position` via reflection, else loop `pkg.ReadByte()`. There is
**one** exploration mask (not two): `GetSharedMapData` ORs `m_explored | m_exploredOthers`
into a single array before writing. `ReadExploredArray` returns null on a size mismatch, so
guard for a short/garbled package.

> Only the leading `version` int could change in a future Valheim update. If `version != 2`,
> log and re-confirm `GetSharedMapData` — everything else keys off the in-stream
> `exploredLength`, so it's robust to texture-size changes.

### 3.4 Two findings that shape the design — ✅ CONFIRMED

1. **Pins are REPLACED per write, exploration is MERGED.** `GetSharedMapData(oldMapData)`
   merges the old *exploration* mask, but for **pins it writes only the writer's own
   `m_pins`** — the previous writer's pins are NOT carried forward. So the table ZDO only ever
   holds the **last writer's** pin set. → Our plugin **must accumulate the union itself**
   across poll snapshots (§6). This confirms the wiki's "stores the last person's pins."
2. **Vanilla already dedups by proximity.** `AddSharedMapData` only adds a shared pin if
   `!HavePinInRange(pos, 1f)` — a **1-unit radius**. We mirror this for our own dedupe
   (§6) so we match vanilla's notion of "same pin."

---

## 4. Mapping Valheim pin types → WebMap types

WebMap pin types are: `dot`, `fire`, `mine`, `house`, `cave` (from its `!pin` command set
and `mapIcons.png`). Valheim's placeable pins are `PinType.Icon0..Icon4` (+ `Boss`, etc.).
Provide a config-driven mapping; sensible defaults (CONFIRM enum values per version):

| Valheim `PinType` | WebMap type |
|---|---|
| `Icon0` | `dot` |
| `Icon1` | `fire` |
| `Icon2` | `mine` |
| `Icon3` | `house` |
| `Icon4` | `cave` |
| `Boss` / others | `dot` (fallback) |

Only mirror the **placeable** types players actually use (Icon0–4, maybe Boss). Skip
`Death`, `Player`, `Shout`, `Bonfire`, `Ping`, etc.

---

## 5. WebMap integration (confirmed from WebMap v2.7.1 source)

WebMap holds pins as a `List<string>` (`MapDataServer.pins`), one CSV line each:

```
{id},{pinId},{type},{name},{x},{z},{pinText}
        id      = owner identifier (steamid in WebMap's own pins)
        pinId   = unique pin id
        type    = webmap type string (dot/fire/mine/house/cave)
        name    = display/author name
        x, z    = coords, formatted "F2" (invariant culture)
        pinText = label
```

Relevant API:
```csharp
MapDataServer.AddPin(string id, string pinId, string type, string name,
                     Vector3 position, string pinText)   // adds to list + WebSocket broadcast
MapDataServer.SavePins()  // static — writes pins.csv (BepInEx/plugins/WebMap/map_data/<world>/pins.csv)
```

**Getting a reference to WebMap's `MapDataServer`:** both plugins run in the same process.
Add a reference to `WebMap.dll` (publicized) and read its static `mapDataServer` field
(`WebMap.WebMap.mapDataServer`), or reach it via reflection to avoid a hard build-time
dependency. Then per new pin:

```csharp
mapDataServer.AddPin(ownerId, pinId, webmapType, authorName, pos, label);
// after the batch:
WebMap.WebMap.SavePins();   // persist once per poll cycle, only if something changed
```

> Do **not** just append to `pins.csv` directly — WebMap caches pins in memory and would
> overwrite your lines on its next `SavePins()`, and direct writes don't broadcast live.
> Always go through `AddPin` so the pin both broadcasts and is included in WebMap's own saves.

---

## 6. Dedupe (the "no double-post" requirement)

Make each pin **deterministically identified** so re-reads are idempotent. Mirror vanilla's
own notion of "same pin" — `HavePinInRange(pos, 1f)`, a 1-unit radius (§3.4).

- **Dedupe key:** `"{ownerId}|{type}|{x:F0}|{z:F0}|{label}"` (round coords to ~1 unit to
  match vanilla's 1f `HavePinInRange` and absorb float jitter). Optionally drop `ownerId` if
  you want one pin per location regardless of who placed it. For stricter proximity dedupe,
  keep a list of accepted `(type,pos)` and reject any new pin within 1f of an existing one.
- **Deterministic `pinId`:** stable hash of the dedupe key (e.g. SHA1/`GetStableHashCode`
  of the key string). Same pin → same `pinId` every time.
- **On plugin startup:** build an in-memory `HashSet<string>` of seen keys by scanning the
  existing `mapDataServer.pins` lines (parse out pinId / reconstruct keys). This survives
  restarts because WebMap reloads `pins.csv`.
- **Per poll:** for each parsed cartography pin, compute its key; if already in the set,
  **skip**; otherwise `AddPin` and add the key to the set.

This also neutralizes the cartography table's "only the last writer's pins are stored"
behavior: we **accumulate the union** of every snapshot we ever see into WebMap, so a pin
that scrolls out of the table later still stays on the web map.

**v1 scope = additive only.** Pin *removal*/uncheck sync is out of scope (see §9).

---

## 7. Config (BepInEx `.cfg`)

```
[General]
poll_interval_seconds = 30      # how often to scan cartography tables
enabled               = true

[Mapping]
icon0 = dot
icon1 = fire
icon2 = mine
icon3 = house
icon4 = cave
default = dot

[Dedupe]
include_owner_in_key  = true    # false = one pin per location regardless of author
coord_rounding        = 1.0
```

---

## 8. Project skeleton & build

```
WebMapCartographySync/
├── WebMapCartographySync.csproj
├── Plugin.cs                 # BepInEx entry; starts the poll coroutine on a hidden GameObject
├── CartographyReader.cs      # find table ZDOs, decompress, parse pins (§3)
├── PinFormat.cs              # ParsedPin, PinType→WebMap mapping (§4)
├── WebMapBridge.cs           # reflection/refs into WebMap MapDataServer (§5)
├── Dedup.cs                  # key building + seen-set (§6)
└── PluginConfig.cs
```

- **Target:** .NET (match WebMap / your Valheim version — same TFM as WebMap's csproj).
- **References:** `BepInEx`, `HarmonyX` (only if you add patches later), `assembly_valheim`,
  `assembly_utils`, and `WebMap.dll`. Use **BepInEx.AssemblyPublicizer** for
  `assembly_valheim` so internal/private members (ZDO keys, `mapDataServer`) are reachable —
  this is the same approach BetterCartographyTable uses (`AssemblyPublicizerTool`).
- **No Jötunn needed** — BCT requires it for client UI; we have no UI, so we skip it.
- **Output:** a single `WebMapCartographySync.dll`.

### Deploy
Drop the DLL into `BepInEx/plugins/` (it can sit loose next to the other single-file mods,
or in its own folder). **Stop the server before adding it** (config-write-on-shutdown rule).
Restart; confirm load in `BepInEx/LogOutput.log`.

---

## 9. Open questions / future work

The format risk is **resolved** (§3.2–3.4 confirmed against decompiled source). Remaining:

1. **Map-data `version` watch** — currently `2`. If a Valheim update bumps it, re-confirm
   `GetSharedMapData`. Everything else keys off the in-stream `exploredLength`, so it's robust.
2. **`Minimap.PinType` enum values** (§4) — confirm Icon0–4 map to the icons you want; the
   enum is stable but worth a glance after major updates.
3. **Removal/uncheck sync** — v1 is additive. Supporting removals conflicts with the
   "union accumulate" strategy (needed because the table only holds the last writer's pins,
   §3.4); design a separate reconciliation mode if wanted.
4. **Patch-based trigger (optimization)** — instead of polling, Postfix-patch the server-side
   ZDO write for cartography prefabs to react immediately. Lower latency, more version-coupled.
   Polling is the safe v1.
5. **Ward-protected tables** — decide whether to mirror pins from tables inside someone's
   ward (BCT respects `PrivateArea.CheckAccess`; server-side we likely just mirror all).
6. **`ownerID` → player name** — pins carry the owner's `playerID` (long) + the pin *label*,
   but **not** a player display name. Decide whether to resolve names (cache from connected
   peers) or just store the `ownerID` in WebMap's `name`/`id` fields.

## 10b. Verification evidence (ground truth used for this spec)

All confirmed by reading decompiled `assembly_valheim` + launched mods (no guessing):

- **`MapTable.cs`** (`davrum/assembly_valheim`): `OnWrite`/`OnRead` use
  `m_nview.GetZDO().GetByteArray(ZDOVars.s_data)`, `Utils.Compress/Decompress`, and
  `Minimap.GetSharedMapData/AddSharedMapData` → confirms storage key + compression + payload.
- **`Minimap.GetSharedMapData` / `AddSharedMapData` / `ReadExploredArray`**
  (`szzszzd/Learn/assembly_valheim/Minimap.cs`): confirms version `2`, single explored mask
  (`m_explored | m_exploredOthers`), per-pin layout (`long ownerID, string name, Vector3 pos,
  int type, bool checked`), pins **replaced** not merged, and the `HavePinInRange(pos, 1f)`
  dedupe.
- **AsocialCartography** (`OrianaVenture/VentureValheim`): confirms modern `AddPin` signature
  `(Vector3, PinType, string, bool save, bool checked, long ownerID, PlatformUserID author)`,
  that **Icon0–4 are the player-placeable pins**, and the "remember all shared pins" +
  proximity-dedupe pattern we reuse.
- **ServerSideMap** (`Mydayyy/Valheim-ServerSideMap`): server-side pin store + proximity-dedupe
  (`Utils.DistanceXZ < radius`) reference — but note it relies on **client mods** (RPC upsync),
  which is exactly what we avoid by reading the cartography ZDO instead.
- **WebMap v2.7.1** (`h0tw1r3/valheim-webmap`): `pins.csv` line format + `MapDataServer.AddPin`
  / `SavePins` integration target (§5).

> Key ecosystem finding: **every existing "server-side map/pin" mod is actually client+server**
> (they patch the client `Minimap` and upsync via RPC). Reading the **cartography table ZDO**
> is the *only* genuinely client-free source of persistent in-game pins — which is why no
> existing mod does precisely this, and why we parse the vanilla format ourselves.

---

## 10. Test plan

1. Build, drop DLL, start server, confirm it logs "scanning N cartography tables".
2. In-game: place a couple of map markers (Icon0/Icon3), walk to a cartography table, click
   **write**.
3. Within `poll_interval_seconds`, the pins appear on the web map (and in
   `BepInEx/plugins/WebMap/map_data/<world>/pins.csv`).
4. Write again with no new pins → **no duplicates** added (verify pins.csv line count steady).
5. Have a second player write different pins → both players' pins coexist on the web map
   (union accumulation works despite the table only storing the last writer).
6. Restart server → no duplicate re-import (seen-set rebuilt from pins.csv).
```
