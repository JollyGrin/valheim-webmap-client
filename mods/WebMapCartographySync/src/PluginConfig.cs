using System.Collections.Generic;
using BepInEx.Configuration;

namespace WebMapCartographySync
{
    /// <summary>
    /// All tunables, written to BepInEx/config/<guid>.cfg on first run.
    /// Remember: edit config with the server STOPPED (BepInEx rewrites it on shutdown).
    /// </summary>
    public class PluginConfig
    {
        public readonly ConfigEntry<bool> Enabled;
        public readonly ConfigEntry<bool> VerboseLogging;
        public readonly ConfigEntry<float> PollIntervalSeconds;
        public readonly ConfigEntry<float> DedupeRadius;
        public readonly ConfigEntry<bool> IncludeOwnerInKey;
        public readonly ConfigEntry<bool> EnableOwnerReconciliation;
        public readonly ConfigEntry<bool> MirrorBossPins;
        public readonly ConfigEntry<string> CartographyPrefab;

        // Minimap.PinType -> WebMap type string. Defaults map the 5 player-placeable icons.
        public readonly ConfigEntry<string> MapIcon0;
        public readonly ConfigEntry<string> MapIcon1;
        public readonly ConfigEntry<string> MapIcon2;
        public readonly ConfigEntry<string> MapIcon3;
        public readonly ConfigEntry<string> MapIcon4;
        public readonly ConfigEntry<string> MapDefault;

        public PluginConfig(ConfigFile cfg)
        {
            Enabled = cfg.Bind("General", "enabled", true,
                "Master switch for the cartography -> WebMap pin sync.");
            VerboseLogging = cfg.Bind("General", "verbose_logging", false,
                "Log per-scan parse details and every pin found (noisy). Warnings/errors always log.");
            PollIntervalSeconds = cfg.Bind("General", "poll_interval_seconds", 30f,
                "How often (seconds) to scan cartography tables. Min 5.");
            CartographyPrefab = cfg.Bind("General", "cartography_prefab", "piece_cartographytable",
                "Prefab name of the cartography table (only change if a future update renames it).");

            DedupeRadius = cfg.Bind("Dedupe", "dedupe_radius", 1f,
                "Two pins of the same type within this distance (world units) are treated as the " +
                "same pin and not re-posted. Mirrors vanilla HavePinInRange(pos, 1f).");
            IncludeOwnerInKey = cfg.Bind("Dedupe", "include_owner_in_key", false,
                "If true, the same spot pinned by two different players yields two web pins. " +
                "If false (default), one pin per location regardless of who placed it.");

            EnableOwnerReconciliation = cfg.Bind("Deletion", "enable_owner_reconciliation", false,
                "When true, a pin a player removed from their map and then re-recorded at a " +
                "cartography table is also removed from the web map (per-owner: only that player's " +
                "pins are reconciled; others' pins are never touched). Default false = additive only. " +
                "Note: deleting ALL your pins then recording can't be detected (your owner id is " +
                "absent from the write) — use WebMap's !deletePin / !undoPin for a full clear.");

            MirrorBossPins = cfg.Bind("Filter", "mirror_boss_pins", false,
                "Also mirror Boss pins (Icon types are always mirrored).");

            // Verified empirically in-game vs web (Icon enum is non-contiguous; Icon4 == int 6).
            // Icon0=flame, Icon1=house, Icon2=anvil, Icon3=dot, Icon4=portal in vanilla Valheim.
            MapIcon0 = cfg.Bind("Mapping", "icon0", "fire", "WebMap type for Minimap.PinType.Icon0 (in-game flame)");
            MapIcon1 = cfg.Bind("Mapping", "icon1", "house", "WebMap type for Minimap.PinType.Icon1 (in-game house)");
            MapIcon2 = cfg.Bind("Mapping", "icon2", "mine", "WebMap type for Minimap.PinType.Icon2 (in-game anvil)");
            MapIcon3 = cfg.Bind("Mapping", "icon3", "dot", "WebMap type for Minimap.PinType.Icon3 (in-game dot)");
            MapIcon4 = cfg.Bind("Mapping", "icon4", "cave", "WebMap type for Minimap.PinType.Icon4 (in-game portal)");
            MapDefault = cfg.Bind("Mapping", "default", "dot",
                "WebMap type for any other mirrored pin type.");
        }

        /// <summary>Build the live PinType -> WebMap-type map from config.</summary>
        public Dictionary<Minimap.PinType, string> BuildTypeMap()
        {
            return new Dictionary<Minimap.PinType, string>
            {
                { Minimap.PinType.Icon0, MapIcon0.Value },
                { Minimap.PinType.Icon1, MapIcon1.Value },
                { Minimap.PinType.Icon2, MapIcon2.Value },
                { Minimap.PinType.Icon3, MapIcon3.Value },
                { Minimap.PinType.Icon4, MapIcon4.Value },
            };
        }

        /// <summary>Which pin types we mirror at all.</summary>
        public bool ShouldMirror(Minimap.PinType type)
        {
            switch (type)
            {
                case Minimap.PinType.Icon0:
                case Minimap.PinType.Icon1:
                case Minimap.PinType.Icon2:
                case Minimap.PinType.Icon3:
                case Minimap.PinType.Icon4:
                    return true;
                case Minimap.PinType.Boss:
                    return MirrorBossPins.Value;
                default:
                    return false; // skip Death, Player, Shout, Ping, Bonfire, etc.
            }
        }
    }
}
