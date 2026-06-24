using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEngine;

namespace WebMapCartographySync
{
    /// <summary>
    /// Finds cartography-table ZDOs, decodes the shared-map blob, extracts pins,
    /// dedupes against what WebMap already has, and pushes new ones in.
    ///
    /// Format (verified against decompiled Minimap.GetSharedMapData, version 2):
    ///   ZDO byte[] under ZDOVars.s_data, Utils.Compress'd. Decompressed ZPackage =
    ///     int version(=2)
    ///     int exploredLength            // == textureSize*textureSize
    ///     bool[exploredLength]          // skipped
    ///     int numPins
    ///     repeat: long ownerID, string name, Vector3 pos, int type, bool checked
    /// </summary>
    public class CartographyScanner
    {
        private readonly PluginConfig _config;
        private readonly MirrorState _state = new MirrorState();
        private readonly Dictionary<Minimap.PinType, string> _typeMap;
        private bool _primed;

        // Cached reflection handle for ZPackage's internal BinaryReader (for O(1) skip).
        private static readonly FieldInfo ZPackageReaderField =
            typeof(ZPackage).GetField("m_reader", BindingFlags.NonPublic | BindingFlags.Instance);

        public CartographyScanner(PluginConfig config)
        {
            _config = config;
            _typeMap = config.BuildTypeMap();
        }

        public void ScanOnce()
        {
            if (!WebMapBridge.IsReady)
            {
                if (!WebMapBridge.TryBind())
                {
                    Plugin.Log.LogWarning("WebMap not found yet (MapDataServer unresolved); skipping scan.");
                    return;
                }
            }

            // Rebuild owner->pinId state once from WebMap's existing pins (survives restarts via pins.csv).
            if (!_primed)
            {
                _state.Prime(WebMapBridge.GetExistingPins());
                _primed = true;
            }

            var zdos = FindCartographyZdos();
            if (zdos.Count == 0) return;

            // Collect this scan's mirror-eligible pins, grouped by owner: owner -> (pinId -> pin).
            // Within-scan duplicates collapse by pinId. Each owner's map is the authoritative
            // "current set" for that owner as of their latest table write.
            var current = new Dictionary<long, Dictionary<string, ParsedPin>>();
            int parsedTotal = 0;
            foreach (var zdo in zdos)
            {
                try
                {
                    var pins = ReadPins(zdo);
                    parsedTotal += pins.Count;
                    foreach (var pin in pins)
                    {
                        if (!_config.ShouldMirror(pin.Type)) continue;
                        string pinId = StableId.From(MirrorState.KeyFor(pin, _config.IncludeOwnerInKey.Value, _config.DedupeRadius.Value));
                        if (!current.TryGetValue(pin.OwnerId, out var byId))
                            current[pin.OwnerId] = byId = new Dictionary<string, ParsedPin>();
                        byId[pinId] = pin;
                    }
                }
                catch (Exception ex)
                {
                    Plugin.Log.LogWarning($"Processing a cartography table failed: {ex.Message}");
                }
            }

            bool reconcile = _config.EnableOwnerReconciliation.Value && WebMapBridge.CanRemove;
            int added = 0, removed = 0;

            // Only owners PRESENT in this scan are touched; everyone else's mirrored pins persist
            // (the table only holds the last writer's pins, so absence != deletion for other owners).
            foreach (var kv in current)
            {
                long owner = kv.Key;
                var currentPins = kv.Value;
                var mirrored = _state.Owned(owner); // live, mutable

                // Additions
                foreach (var pin in currentPins)
                {
                    if (mirrored.Contains(pin.Key)) continue;
                    string webType = _typeMap.TryGetValue(pin.Value.Type, out var t) ? t : _config.MapDefault.Value;
                    string ownerStr = owner.ToString();
                    WebMapBridge.AddPin(ownerStr, pin.Key, webType, ownerStr, pin.Value.Pos, pin.Value.Label);
                    mirrored.Add(pin.Key);
                    added++;
                }

                // Removals (opt-in): this owner's previously-mirrored pins no longer in their write.
                if (reconcile)
                {
                    var stale = new List<string>();
                    foreach (var pid in mirrored) if (!currentPins.ContainsKey(pid)) stale.Add(pid);
                    foreach (var pid in stale)
                    {
                        if (WebMapBridge.RemovePin(pid)) removed++;
                        mirrored.Remove(pid);
                    }
                }
            }

            if (added > 0 || removed > 0)
            {
                WebMapBridge.SavePins();
                Plugin.Log.LogInfo($"Cartography sync: +{added} / -{removed} pin(s) " +
                                   $"({zdos.Count} table(s), {parsedTotal} parsed, {current.Count} owner(s)).");
            }
            else if (_config.VerboseLogging.Value)
            {
                Plugin.Log.LogInfo($"Scan: {zdos.Count} table(s), {parsedTotal} parsed, no changes.");
            }

            if (added > 0) WebMapBridge.SavePins();
        }

        private List<ZDO> FindCartographyZdos()
        {
            var result = new List<ZDO>();
            try
            {
                // Current Valheim only exposes the iterative form. It appends matches to `result`,
                // processes ~400 sectors per call, advances `index`, and returns true when complete.
                int index = 0;
                while (!ZDOMan.instance.GetAllZDOsWithPrefabIterative(_config.CartographyPrefab.Value, result, ref index))
                {
                    // keep going until it reports done
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"GetAllZDOsWithPrefabIterative failed (signature mismatch?): {ex.Message}");
            }
            return result;
        }

        private List<ParsedPin> ReadPins(ZDO zdo)
        {
            var pins = new List<ParsedPin>();

            byte[] raw = zdo.GetByteArray(ZDOVars.s_data);
            if (raw == null || raw.Length == 0) return pins;

            byte[] data;
            try { data = Utils.Decompress(raw); }
            catch (Exception ex) { Plugin.Log.LogWarning($"Decompress failed: {ex.Message}"); return pins; }

            try
            {
                var pkg = new ZPackage(data);
                int version = pkg.ReadInt();
                int exploredLength = pkg.ReadInt();
                long total = data.Length;
                long afterExplored = 8L + (long)exploredLength;

                if (_config.VerboseLogging.Value)
                    Plugin.Log.LogInfo($"cart parse: total={total}B version={version} exploredLength={exploredLength} " +
                                       $"(explored should end at {afterExplored})");

                // If the explored block doesn't fit, our format assumption is wrong for this game
                // version. Dump head+tail so we can decode the real layout.
                if (exploredLength < 0 || afterExplored + 4 > total)
                {
                    Plugin.Log.LogWarning(
                        $"Format mismatch: explored end {afterExplored} + 4 > total {total}. " +
                        $"head16={Hex(data, 0, 16)} tail96={HexTail(data, 96)}");
                    return pins;
                }

                SkipBytes(pkg, exploredLength);
                long pos = StreamPos(pkg);
                if (pos != afterExplored)
                {
                    Plugin.Log.LogWarning($"skip landed at {pos}, expected {afterExplored}; correcting.");
                    SetStreamPos(pkg, afterExplored);
                }

                if (version < 2) return pins;

                int numPins = pkg.ReadInt();
                if (numPins < 0 || numPins > 100000)
                {
                    Plugin.Log.LogWarning($"Implausible numPins={numPins}; tail96={HexTail(data, 96)}");
                    return pins;
                }
                if (_config.VerboseLogging.Value) Plugin.Log.LogInfo($"cart parse: numPins={numPins}");

                for (int i = 0; i < numPins; i++)
                {
                    long ownerId = pkg.ReadLong();
                    string name = pkg.ReadString();
                    Vector3 vpos = pkg.ReadVector3();
                    var type = (Minimap.PinType)pkg.ReadInt();
                    bool isChecked = pkg.ReadBool();
                    // v3 (current Valheim) adds a per-pin author = PlatformUserID.ToString()
                    if (version >= 3) pkg.ReadString();
                    pins.Add(new ParsedPin(ownerId, name, vpos, type, isChecked));
                    if (_config.VerboseLogging.Value)
                        Plugin.Log.LogInfo($"  pin[{i}] type={type} pos=({vpos.x:F0},{vpos.z:F0}) text='{name}' owner={ownerId}");
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogWarning($"Pin parse aborted: {ex.Message}");
            }

            return pins;
        }

        /// <summary>Advance the ZPackage reader by <paramref name="count"/> bytes (O(1) seek, byte-loop fallback).</summary>
        private static void SkipBytes(ZPackage pkg, int count)
        {
            if (count <= 0) return;
            try
            {
                var reader = (BinaryReader)ZPackageReaderField.GetValue(pkg);
                reader.BaseStream.Seek(count, SeekOrigin.Current);
            }
            catch
            {
                for (int i = 0; i < count; i++) pkg.ReadByte();
            }
        }

        private static long StreamPos(ZPackage pkg)
        {
            try { return ((BinaryReader)ZPackageReaderField.GetValue(pkg)).BaseStream.Position; }
            catch { return -1; }
        }

        private static void SetStreamPos(ZPackage pkg, long pos)
        {
            try { ((BinaryReader)ZPackageReaderField.GetValue(pkg)).BaseStream.Position = pos; }
            catch { }
        }

        private static string Hex(byte[] d, int off, int len)
        {
            int end = Math.Min(off + len, d.Length);
            var sb = new System.Text.StringBuilder();
            for (int i = Math.Max(0, off); i < end; i++) sb.Append(d[i].ToString("x2"));
            return sb.ToString();
        }

        private static string HexTail(byte[] d, int len) => Hex(d, Math.Max(0, d.Length - len), len);
    }
}
