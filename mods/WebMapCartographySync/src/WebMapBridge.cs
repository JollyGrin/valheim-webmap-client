using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;

namespace WebMapCartographySync
{
    /// <summary>
    /// Reflection bridge into the WebMap plugin (loaded in the same process). We avoid a hard
    /// compile-time dependency so a WebMap version change degrades to a logged warning instead
    /// of a load failure.
    ///
    /// Targets (from WebMap v2.7.1 source):
    ///   - a static field `mapDataServer` (instance of MapDataServer) on a WebMap type
    ///   - MapDataServer.AddPin(string id, string pinId, string type, string name, Vector3 pos, string pinText)
    ///   - MapDataServer.pins  : List&lt;string&gt;  (CSV lines: id,pinId,type,name,x,z,text)
    ///   - a static SavePins()  on a WebMap type
    /// </summary>
    public static class WebMapBridge
    {
        private static object _mapDataServer;
        private static MethodInfo _addPin;
        private static MethodInfo _removePin;
        private static MethodInfo _savePins;
        private static FieldInfo _pinsField;

        public static bool IsReady => _mapDataServer != null && _addPin != null;

        public static bool TryBind()
        {
            try
            {
                var asm = AppDomain.CurrentDomain.GetAssemblies()
                    .FirstOrDefault(a => a.GetName().Name.Equals("WebMap", StringComparison.OrdinalIgnoreCase));
                if (asm == null) return false;

                var types = asm.GetTypes();

                // 1) Find the static `mapDataServer` field (the live MapDataServer instance).
                foreach (var t in types)
                {
                    var f = t.GetField("mapDataServer",
                        BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
                    if (f != null)
                    {
                        _mapDataServer = f.GetValue(null);
                        if (_mapDataServer != null) break;
                    }
                }
                if (_mapDataServer == null) return false;

                var mdsType = _mapDataServer.GetType();

                // 2) AddPin(string,string,string,string,Vector3,string)
                _addPin = mdsType.GetMethod("AddPin", new[]
                {
                    typeof(string), typeof(string), typeof(string), typeof(string),
                    typeof(Vector3), typeof(string)
                });

                // 3) pins : List<string>
                _pinsField = mdsType.GetField("pins",
                    BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);

                // 3b) RemovePin(int idx) — for owner reconciliation (optional feature)
                _removePin = mdsType.GetMethod("RemovePin", new[] { typeof(int) });

                // 4) static SavePins() somewhere in the WebMap assembly
                foreach (var t in types)
                {
                    var m = t.GetMethod("SavePins",
                        BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic,
                        null, Type.EmptyTypes, null);
                    if (m != null) { _savePins = m; break; }
                }

                if (_addPin == null)
                {
                    Plugin.Log.LogError("Bound MapDataServer but AddPin(6-arg) not found — WebMap API changed?");
                    return false;
                }

                Plugin.Log.LogInfo($"Bound to WebMap MapDataServer ({mdsType.FullName}). " +
                                   $"SavePins {( _savePins != null ? "found" : "MISSING")}, " +
                                   $"pins field {( _pinsField != null ? "found" : "MISSING")}.");
                return true;
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"WebMap bind failed: {ex}");
                return false;
            }
        }

        public static void AddPin(string id, string pinId, string type, string name, Vector3 position, string pinText)
        {
            _addPin.Invoke(_mapDataServer, new object[] { id, pinId, type, name, position, pinText });
        }

        public static void SavePins()
        {
            try { _savePins?.Invoke(null, null); }
            catch (Exception ex) { Plugin.Log.LogWarning($"SavePins invoke failed: {ex.Message}"); }
        }

        public static bool CanRemove => _removePin != null && _pinsField != null;

        /// <summary>Remove the WebMap pin whose pinId (CSV column 1) matches. Only ever called with
        /// our own cart-prefixed ids, so it never touches chat/web-created pins.</summary>
        public static bool RemovePin(string pinId)
        {
            if (!CanRemove || !(_pinsField.GetValue(_mapDataServer) is List<string> lines)) return false;
            for (int i = 0; i < lines.Count; i++)
            {
                var parts = lines[i].Split(',');
                if (parts.Length > 1 && parts[1] == pinId)
                {
                    _removePin.Invoke(_mapDataServer, new object[] { i });
                    return true;
                }
            }
            return false;
        }

        /// <summary>Yield (id, pinId) = (CSV col 0, col 1) for every current WebMap pin, to rebuild
        /// our owner→pinId state on startup.</summary>
        public static IEnumerable<(string id, string pinId)> GetExistingPins()
        {
            if (_pinsField?.GetValue(_mapDataServer) is List<string> lines)
            {
                foreach (var line in lines)
                {
                    if (string.IsNullOrEmpty(line)) continue;
                    var parts = line.Split(',');
                    if (parts.Length > 1) yield return (parts[0], parts[1]);
                }
            }
        }
    }
}
