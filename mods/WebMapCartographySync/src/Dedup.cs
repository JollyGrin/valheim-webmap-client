using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

namespace WebMapCartographySync
{
    /// <summary>
    /// Tracks which of OUR pins (cart-prefixed pinIds) are currently mirrored to WebMap, grouped
    /// by the pin's ownerID. This drives both dedupe (don't re-add) and — when reconciliation is
    /// enabled — deletion (remove an owner's pins that vanished from their latest table write),
    /// without ever touching other players' pins or non-cartography WebMap pins.
    /// </summary>
    public class MirrorState
    {
        private readonly Dictionary<long, HashSet<string>> _byOwner = new Dictionary<long, HashSet<string>>();

        /// <summary>Rebuild state from WebMap's existing pins (survives restarts via pins.csv).
        /// Only our cart-prefixed pins are tracked; owner is recovered from the CSV id column.</summary>
        public void Prime(IEnumerable<(string id, string pinId)> existing)
        {
            foreach (var (id, pinId) in existing)
            {
                if (string.IsNullOrEmpty(pinId) || !pinId.StartsWith(StableId.Prefix)) continue;
                long owner = long.TryParse(id, out var o) ? o : 0L;
                Owned(owner).Add(pinId);
            }
        }

        /// <summary>Live, mutable set of mirrored pinIds for an owner (created empty if new).</summary>
        public HashSet<string> Owned(long owner)
        {
            if (!_byOwner.TryGetValue(owner, out var set)) _byOwner[owner] = set = new HashSet<string>();
            return set;
        }

        /// <summary>Deterministic dedupe key: type + grid-rounded coords (+ owner if configured) +
        /// label. Grid rounding (to the dedupe radius) absorbs float jitter so the same physical
        /// pin always maps to the same id across writes.</summary>
        public static string KeyFor(ParsedPin pin, bool includeOwner, float radius)
        {
            float grid = Mathf.Max(0.01f, radius);
            long gx = (long)Mathf.Round(pin.Pos.x / grid);
            long gz = (long)Mathf.Round(pin.Pos.z / grid);
            string owner = includeOwner ? pin.OwnerId.ToString() : "_";
            return string.Format(CultureInfo.InvariantCulture, "{0}|{1}|{2}|{3}|{4}",
                owner, (int)pin.Type, gx, gz, pin.Label);
        }
    }

    /// <summary>Deterministic, stable id from a string (FNV-1a 64-bit, hex). Same input -> same id
    /// forever. The "cart" prefix marks pins this plugin owns (vs. chat/web-created WebMap pins).</summary>
    public static class StableId
    {
        public const string Prefix = "cart";

        public static string From(string s)
        {
            const ulong offset = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            ulong hash = offset;
            foreach (char c in s) { hash ^= c; hash *= prime; }
            return Prefix + hash.ToString("x16");
        }
    }
}
