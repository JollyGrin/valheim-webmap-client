import type { Coordinate, PinType } from '$lib/types';

type PinDTO = {
  type: 'addPin' | string;
  x: string;
  z: string;
  pinType: PinType['value'];
  pinText: string;
};

export function iframeDrawPin(
  iframe: HTMLIFrameElement,
  pin: { type: PinType['value']; label: string } & Coordinate
) {
  if (!iframe || !iframe.contentWindow) return console.error('No iframe:', iframe);

  const payload: PinDTO = {
    type: 'addPin',
    x: pin.x.toString(),
    z: pin.z.toString(),
    pinType: pin.type,
    pinText: pin.label
  };

  iframe.contentWindow.postMessage(payload, '*');
}
