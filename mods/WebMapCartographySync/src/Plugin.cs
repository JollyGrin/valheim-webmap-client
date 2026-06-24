using System.Collections;
using BepInEx;
using BepInEx.Logging;
using UnityEngine;

namespace WebMapCartographySync
{
    /// <summary>
    /// Server-only BepInEx plugin. Periodically scans every cartography table's ZDO,
    /// extracts the pins players have written to it, and mirrors NEW ones into WebMap
    /// (which persists to pins.csv + broadcasts live over WebSocket).
    ///
    /// No client mods, no external services. See docs/cartography-pin-sync-spec.md.
    /// </summary>
    [BepInPlugin(PluginGuid, PluginName, PluginVersion)]
    public class Plugin : BaseUnityPlugin
    {
        public const string PluginGuid = "lol.dean.turtleheim.webmapcartographysync";
        public const string PluginName = "WebMapCartographySync";
        public const string PluginVersion = "0.2.0";

        internal static ManualLogSource Log;
        private PluginConfig _config;
        private CartographyScanner _scanner;

        private void Awake()
        {
            Log = Logger;
            _config = new PluginConfig(Config);

            if (!_config.Enabled.Value)
            {
                Log.LogInfo($"{PluginName} disabled via config.");
                return;
            }

            _scanner = new CartographyScanner(_config);
            StartCoroutine(PollLoop());
            Log.LogInfo($"{PluginName} v{PluginVersion} loaded; will scan cartography tables every " +
                        $"{_config.PollIntervalSeconds.Value}s once the server is up.");
        }

        private IEnumerator PollLoop()
        {
            // Wait until the world/networking is actually running.
            while (ZNet.instance == null || ZDOMan.instance == null)
                yield return new WaitForSeconds(2f);

            // Only act as the authoritative server (dedicated or host). Pure clients do nothing.
            for (; ; )
            {
                if (ZNet.instance != null && ZNet.instance.IsServer() && ZDOMan.instance != null)
                {
                    try
                    {
                        _scanner.ScanOnce();
                    }
                    catch (System.Exception ex)
                    {
                        Log.LogError($"Scan failed: {ex}");
                    }
                }

                yield return new WaitForSeconds(Mathf.Max(5f, _config.PollIntervalSeconds.Value));
            }
        }
    }
}
