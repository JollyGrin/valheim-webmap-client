import type { Coordinate, PinType } from '$lib/types';

type PinDTO = {
  type: 'addPin' | string;
  x: string;
  z: string;
  pinType: PinType['value'];
  pinText: string;
};

type PanToDTO = {
  type: 'panTo';
  x: string;
  z: string;
};

type PingOptions = {
  text?: string;      // Text to display beneath the ping
  duration?: number;  // How long to show the ping in milliseconds
};

type ShowPingDTO = {
  type: 'showPing';
  x: string;
  z: string;
  options?: PingOptions;
};

/**
 * Adds a pin to the map at the specified coordinates
 */
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

/**
 * Pans the map to center on the specified coordinates
 */
export function iframePanTo(
  iframe: HTMLIFrameElement,
  coordinates: Coordinate
) {
  if (!iframe || !iframe.contentWindow) return console.error('No iframe:', iframe);

  const payload: PanToDTO = {
    type: 'panTo',
    x: coordinates.x.toString(),
    z: coordinates.z.toString(),
  };

  iframe.contentWindow.postMessage(payload, '*');
}

/**
 * Shows a temporary ping marker at the specified coordinates
 */
export function iframeShowPing(
  iframe: HTMLIFrameElement,
  coordinates: Coordinate,
  options?: PingOptions
) {
  if (!iframe || !iframe.contentWindow) return console.error('No iframe:', iframe);

  const payload: ShowPingDTO = {
    type: 'showPing',
    x: coordinates.x.toString(),
    z: coordinates.z.toString(),
    options
  };

  iframe.contentWindow.postMessage(payload, '*');
}

/**
 * Pans to coordinates with optional ping marker
 * This combines both panning and ping functionality in one convenient method
 */
export function iframePanWithPing(
  iframe: HTMLIFrameElement,
  coordinates: Coordinate,
  options?: {
    showPing?: boolean;
    pingText?: string;
    pingDuration?: number;
  }
) {
  // Always pan to the coordinates
  iframePanTo(iframe, coordinates);
  
  // If showPing is true, also show a ping at that location
  if (options?.showPing) {
    iframeShowPing(iframe, coordinates, {
      text: options.pingText,
      duration: options.pingDuration
    });
  }
}
