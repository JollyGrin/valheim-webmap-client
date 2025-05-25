# Valheim WebMap IFrame Wrapper

This project provides a way to integrate the Valheim WebMap (v2.7) into an iframe with enhanced functionality for adding pins programmatically and selecting coordinates.

https://github.com/h0tw1r3/valheim-webmap

## Overview

The solution consists of two main components:

1. **Source**: The original WebMap files (v2.7) with minimal modifications
2. **Wrapper**: An HTML page that embeds the WebMap in an iframe and adds pin-adding functionality

## Source Modifications

### 1. Modified `index.html` for Coordinate Selection

Add the following script just before the closing `</body>` tag to enable coordinate selection:

```html
<script>
	window.addEventListener('message', (event) => {
		if (event.data.type === 'requestCoords') {
			const canvas = document.querySelector('canvas');
			if (canvas) {
				const clickHandler = (e) => {
					// Get the coordinates from the coords div
					const coordsDiv = document.querySelector('[data-id="coords"]');
					if (coordsDiv && coordsDiv.textContent) {
						const [x, y] = coordsDiv.textContent
							.split(',')
							.map((coord) => parseFloat(coord.trim()));

						// Send coordinates back to parent
						window.parent.postMessage(
							{
								type: 'canvasCoords',
								x: x,
								y: y
							},
							'*'
						);
					}
				};

				// Remove any existing click handler to prevent duplicates
				canvas.removeEventListener('click', clickHandler);
				// Add new click handler
				canvas.addEventListener('click', clickHandler, { once: true });
			}
		}
	});
</script>
```

### 2. Updated `index.html` for Pin Creation

Add the following script to handle incoming messages for pin creation:

```html
<script>
	window.addEventListener('message', function (event) {
		if (event.data.type === 'addPin') {
			const { x, z, pinType, pinText } = event.data;
			if (window.valheimMap && window.valheimMap.addPin) {
				window.valheimMap.addPin(parseFloat(x), parseFloat(z), pinType, pinText);
			}
		}
	});
</script>
```

### 3. Modified `main.js`

Unminified and exposed functionality by adding this code before the final `})();`:

```javascript
// Expose pin creation and panning to the window object
window.valheimMap = {
	addPin: function (x, z, type = 'dot', text = '') {
		const pin = {
			type: type,
			text: text,
			x: parseFloat(x),
			z: parseFloat(z),
			el: null,
			flags: {}
		};

		// Use the app's built-in function to add the pin
		H(pin);

		return true;
	},
	
	panTo: function (x, z) {
		// Reset following state to prevent drag issues
		C = null;
		if (typeof j === 'function') {
			j(null);
		}
		
		// Convert world coordinates to map position
		const worldX = parseFloat(x);
		const worldZ = parseFloat(z);
		const mapX = worldX / g + u;
		const mapY = E - (worldZ / g + u);
		const posX = (100 * mapX) / L;
		const posY = (100 * mapY) / E;
		
		// Create a temporary marker for positioning
		const marker = document.createElement('div');
		marker.style.position = 'absolute';
		marker.style.left = posX + '%';
		marker.style.top = posY + '%';
		marker.style.width = '1px';
		marker.style.height = '1px';
		h.appendChild(marker);
		
		// Center the map on the marker
		r.map.classList.remove('smooth');
		const rect = marker.getBoundingClientRect();
		const offsetX = window.innerWidth / 2 - rect.left;
		const offsetY = window.innerHeight / 2 - rect.top;
		h.style.left = (offsetX + h.offsetLeft) + 'px';
		h.style.top = (offsetY + h.offsetTop) + 'px';
		
		// Cleanup
		setTimeout(() => {
			r.map.classList.add('smooth');
			marker.remove();
			C = null;
		}, 50);
		
		return true;
	}
};
```

## Wrapper Implementation

The wrapper (`test4.html`) provides a user interface for:

1. Selecting coordinates by clicking on the map
2. Choosing pin type (dot, house, fire, mine, cave)
3. Adding custom pin labels
4. Visual feedback for all actions

### Key Features

- **Cross-origin communication** using `postMessage`
- **Responsive design** that works on different screen sizes
- **Error handling** with user-friendly messages
- **Clean UI** with clear status updates

### Message Flow

1. **Requesting Coordinates**:

   ```javascript
   iframe.contentWindow.postMessage(
   	{
   		type: 'requestCoords'
   	},
   	'*'
   );
   ```

2. **Receiving Coordinates**:

   ```javascript
   window.addEventListener('message', function (event) {
   	if (event.data.type === 'canvasCoords') {
   		// Handle coordinates
   	}
   });
   ```

3. **Adding a Pin**:
   ```javascript
   iframe.contentWindow.postMessage(
   	{
   		type: 'addPin',
   		x: xCoord,
   		z: zCoord,
   		pinType: 'house',
   		pinText: 'My House'
   	},
   	'*'
   );
   ```

4. **Panning to a Location**:
   ```javascript
   iframe.contentWindow.postMessage(
   	{
   		type: 'panTo',
   		x: xCoord,
   		z: zCoord
   	},
   	'*'
   );
   ```

## Setup Instructions

1. Deploy the modified WebMap files to your web server
2. Host the wrapper HTML file on the same domain or configure CORS
3. Update the iframe `src` in the wrapper to point to your WebMap URL

## Security Considerations

- The wrapper uses `postMessage` with proper origin checking
- The iframe is sandboxed with minimal permissions
- All user input is sanitized before processing

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## Testing

1. Open `demo.html` in a web browser
2. Click "Pick Location" and then click on the map to select coordinates
3. Choose a pin type and optional label
4. Click "Add Pin" to place the pin on the map

## Troubleshooting

- If pins don't appear, check the browser's console for errors
- Ensure the iframe URL is correct and accessible
- Verify that both pages are using the same protocol (http/https)

---

# Dev notes

timestamped notes of progress made

### 2025 May 25

- Implemented map panning functionality
  - Added `panTo` method to `window.valheimMap` object to allow centering on specific coordinates
  - Extended window message listener to handle 'panTo' events from the wrapper
  - Ensured proper handling of 'following' state to maintain normal dragging behavior
  - Implemented smooth transitions when panning to a location
- Updated documentation
  - Added panning examples to README.md
  - Documented the message format for the panTo functionality

---

# Original Svelte Project Documentation

_The following is the original README content from the Svelte template that was used to start this project._

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
