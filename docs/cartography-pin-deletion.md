# Investigation: Deleting pins from the web map

**Question:** I want to delete pins from the HTML map. If I delete a pin from my local in-game
map and then click "record discoveries" at a cartography table, will it remove the older entry
from the web map?

**Short answer: No — not today, and deletion is fundamentally harder than addition.** The current
plugin is **additive-only**: it accumulates the union of every pin it ever sees and never removes
anything. So deleting locally + recording leaves the pin on the web map.

---

## What actually happens when you delete locally + record

Verified from `Minimap.GetSharedMapData` (the function the cartography "write" calls): it writes
the writer's **current** `m_pins` (all saved, non-Death pins). So:

1. You delete a pin in-game → it's gone from your `m_pins`.
2. You "record discoveries" → the table ZDO is overwritten with your *remaining* pins (the deleted
   one is absent). ✅ the table no longer has it.
3. **But our plugin never removes** — it already mirrored that pin to WebMap and keeps it. ❌ the
   web map still shows it.

So the table *does* reflect your deletion; the plugin just doesn't act on absences.

## Why deletion is hard (the core constraint)

The cartography table stores **only the last writer's pins** (it replaces, doesn't merge —
verified). That's exactly why the plugin accumulates the union. The consequence: **"a pin is
missing from the table" is ambiguous** —

- did its owner delete it, **or**
- did a *different* player just overwrite the table with their own pins?

You can't tell from the table alone. A naive "mirror the table exactly" would make each writer
wipe everyone else's pins. So deletion needs to be smarter than addition.

## Options

### 1. Per-owner reconciliation — RECOMMENDED
Every pin carries an `ownerID`. Treat each write as the authoritative current set **for the
owners present in that write**:

- For each `ownerID` in the write: `removed = previouslyMirrored[ownerID] − currentWrite[ownerID]`
  → remove those from WebMap.
- Pins owned by players **not** in this write are left alone (preserves the union across
  multi-writer overwrites).

Handles the real use case (each player curates their own pins). Multi-writer safe: if player Y
downloaded X's pins and re-writes, Y's write contains both owners, so each is reconciled correctly.

**Known limitation:** if a player deletes **all** their pins and records, their `ownerID` won't
appear in the write at all, so we can't tell their pins should be cleared. Escape hatch: WebMap's
built-in `!undoPin` / `!deletePin <text>` chat commands, or a manual web-side delete.

### 2. Explicit delete command / web action
Lean on WebMap's existing removal: `MapDataServer.RemovePin(idx)` (broadcasts `rmpin`), and the
in-game `!undoPin` / `!deletePin <text>` commands. Lowest effort; manual, not automatic from the
map screen.

### 3. Full per-table reconciliation — NOT recommended
Mirror the table's current set exactly (add missing, remove extras). Simple, but the last writer
wipes everyone else's pins. Only safe on a single-writer server.

## Recommendation

Add **opt-in per-owner reconciliation** (#1), gated behind a config flag (default off) so the
additive behavior stays the safe default. Document the "delete-all-then-record" edge case and
point at `!deletePin` as the manual fallback.

## Implementation sketch (for a v0.2)

- Track mirrored pins as `ownerID → set<pinId>` (extend the existing dedupe state).
- Add `WebMapBridge.RemovePin(pinId)`: find the index in `MapDataServer.pins` whose CSV column 1
  (`pinId`) matches, call `RemovePin(idx)`, then `SavePins()`. (`RemovePin(int)` is confirmed
  present in WebMap and already broadcasts `rmpin`.)
- In `ScanOnce`, after collecting this scan's pins grouped by `ownerID`: for each owner present,
  diff against previously-mirrored and `RemovePin` the difference.
- New config: `[Deletion] enable_owner_reconciliation = false`.

Effort: moderate, additive to the existing scanner — same build/deploy loop as v0.1
(see [cartography-pin-sync-spec.md](./cartography-pin-sync-spec.md)).
