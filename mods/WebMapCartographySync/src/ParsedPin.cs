using UnityEngine;

namespace WebMapCartographySync
{
    /// <summary>
    /// One pin as read out of a cartography table's shared-map data.
    /// Field order matches Minimap.GetSharedMapData (verified, map-data version 2):
    ///   long ownerID, string name(label), Vector3 pos, int type, bool checked
    /// </summary>
    public readonly struct ParsedPin
    {
        public readonly long OwnerId;
        public readonly string Label;       // the pin's text (Minimap.PinData.m_name)
        public readonly Vector3 Pos;        // world pos; only x,z used by WebMap
        public readonly Minimap.PinType Type;
        public readonly bool Checked;

        public ParsedPin(long ownerId, string label, Vector3 pos, Minimap.PinType type, bool isChecked)
        {
            OwnerId = ownerId;
            Label = label ?? "";
            Pos = pos;
            Type = type;
            Checked = isChecked;
        }
    }
}
