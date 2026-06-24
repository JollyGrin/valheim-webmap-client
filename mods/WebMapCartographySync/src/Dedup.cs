using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

namespace WebMapCartographySync
{
    /// <summary>
    /// Prevents re-posting pins. Two layers:
    ///   1. Deterministic pinId set (idempotent across restarts — primed from WebMap's pins.csv).
    ///   2. Proximity check mirroring vanilla HavePinInRange(pos, radius) so jittered re-writes
    ///      of "the same" pin don't pile up.
    /// </summary>
    public class Dedup
    {
        private readonly HashSet<string> _seenPinIds = new HashSet<string>();
        // Accepted pins by webmap type bucket -> positions, for proximity dedupe.
        private readonly Dictionary<string, List<Vector2>> _accepted = new Dictionary<string, List<Vector2>>();

        public void PrimeFromExisting(IEnumerable<string> existingPinIds)
        {
            foreach (var id in existingPinIds)
                if (!string.IsNullOrEmpty(id)) _seenPinIds.Add(id);
        }

        /// <summary>Stable dedupe key: type + rounded coords (+ owner if configured) + label.</summary>
        public string KeyFor(ParsedPin pin, bool includeOwner, float radius)
        {
            // Round to the dedupe radius grid so near-identical coords collapse to one key.
            float grid = Mathf.Max(0.01f, radius);
            long gx = (long)Mathf.Round(pin.Pos.x / grid);
            long gz = (long)Mathf.Round(pin.Pos.z / grid);
            string owner = includeOwner ? pin.OwnerId.ToString() : "_";
            return string.Format(CultureInfo.InvariantCulture,
                "{0}|{1}|{2}|{3}|{4}", owner, (int)pin.Type, gx, gz, pin.Label);
        }

        /// <summary>True if we've already posted this pin (by id) or one within radius of same type.</summary>
        public bool SeenOrTooClose(ParsedPin pin, string key, float radius)
        {
            if (_seenPinIds.Contains(StableId.From(key))) return true;

            string bucket = ((int)pin.Type).ToString();
            if (_accepted.TryGetValue(bucket, out var list))
            {
                var p = new Vector2(pin.Pos.x, pin.Pos.z);
                float r2 = radius * radius;
                foreach (var q in list)
                    if ((q - p).sqrMagnitude < r2) return true;
            }
            return false;
        }

        public void Remember(ParsedPin pin, string pinId)
        {
            _seenPinIds.Add(pinId);
            string bucket = ((int)pin.Type).ToString();
            if (!_accepted.TryGetValue(bucket, out var list))
                _accepted[bucket] = list = new List<Vector2>();
            list.Add(new Vector2(pin.Pos.x, pin.Pos.z));
        }
    }

    /// <summary>Deterministic, stable id from a string (FNV-1a 64-bit, hex). Same input -> same id forever.</summary>
    public static class StableId
    {
        public static string From(string s)
        {
            const ulong offset = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            ulong hash = offset;
            foreach (char c in s)
            {
                hash ^= c;
                hash *= prime;
            }
            return "cart" + hash.ToString("x16");
        }
    }
}
