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
        private readonly Dedup _dedup = new Dedup();
        private readonly Dictionary<Minimap.PinType, string> _typeMap;
        private bool _seenSetPrimed;

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

            // Prime the dedupe set once from WebMap's existing pins (survives restarts via pins.csv).
            if (!_seenSetPrimed)
            {
                _dedup.PrimeFromExisting(WebMapBridge.GetExistingPinIds());
                _seenSetPrimed = true;
            }

            var zdos = FindCartographyZdos();
            if (zdos.Count == 0) return;

            int added = 0;
            foreach (var zdo in zdos)
            {
                foreach (var pin in ReadPins(zdo))
                {
                    if (!_config.ShouldMirror(pin.Type)) continue;

                    string key = _dedup.KeyFor(pin, _config.IncludeOwnerInKey.Value, _config.DedupeRadius.Value);
                    if (_dedup.SeenOrTooClose(pin, key, _config.DedupeRadius.Value)) continue;

                    string pinId = StableId.From(key);
                    string webType = _typeMap.TryGetValue(pin.Type, out var t) ? t : _config.MapDefault.Value;
                    string ownerStr = pin.OwnerId.ToString();

                    WebMapBridge.AddPin(
                        id: ownerStr,
                        pinId: pinId,
                        type: webType,
                        name: ownerStr,          // no player display-name in the data; see README
                        position: pin.Pos,
                        pinText: pin.Label);

                    _dedup.Remember(pin, pinId);
                    added++;
                }
            }

            if (added > 0)
            {
                WebMapBridge.SavePins();
                Plugin.Log.LogInfo($"Mirrored {added} new cartography pin(s) to WebMap " +
                                   $"(scanned {zdos.Count} table(s)).");
            }
        }

        private List<ZDO> FindCartographyZdos()
        {
            var result = new List<ZDO>();
            try
            {
                // Signature in current Valheim: bool GetAllZDOsWithPrefab(string prefab, List<ZDO> zdos)
                ZDOMan.instance.GetAllZDOsWithPrefab(_config.CartographyPrefab.Value, result);
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"GetAllZDOsWithPrefab failed (signature mismatch?): {ex.Message}");
            }
            return result;
        }

        private IEnumerable<ParsedPin> ReadPins(ZDO zdo)
        {
            byte[] raw = zdo.GetByteArray(ZDOVars.s_data);
            if (raw == null || raw.Length == 0) yield break;

            byte[] data;
            try { data = Utils.Decompress(raw); }
            catch (Exception ex) { Plugin.Log.LogWarning($"Decompress failed for a table ZDO: {ex.Message}"); yield break; }

            var pkg = new ZPackage(data);

            int version = pkg.ReadInt();
            int exploredLength = pkg.ReadInt();
            if (exploredLength < 0 || exploredLength > 64 * 1024 * 1024)
            {
                Plugin.Log.LogWarning($"Implausible exploredLength {exploredLength}; skipping table.");
                yield break;
            }
            SkipBytes(pkg, exploredLength); // each bool == 1 byte

            if (version < 2) yield break;   // pins only exist from version 2

            int numPins = pkg.ReadInt();
            for (int i = 0; i < numPins; i++)
            {
                long ownerId = pkg.ReadLong();
                string name = pkg.ReadString();
                Vector3 pos = pkg.ReadVector3();
                var type = (Minimap.PinType)pkg.ReadInt();
                bool isChecked = pkg.ReadBool();
                yield return new ParsedPin(ownerId, name, pos, type, isChecked);
            }
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
    }
}
