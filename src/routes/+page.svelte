<script lang="ts">
	import { useAllPins } from '$lib/api/pins';
	import { onMount } from 'svelte';

	const query = useAllPins();

	$inspect($query?.data);

	// Types
	interface Coordinate {
		x: string;
		z: string;
	}

	interface Status {
		message: string;
		isError: boolean;
	}

	interface PinType {
		value: 'dot' | 'house' | 'fire' | 'mine' | 'cave';
		label: string;
	}

	// Refs
	let iframe: HTMLIFrameElement | null = null;

	// State
	let currentCoords: Coordinate | null = $state(null);
	let isRequestingCoords: boolean = $state(false);
	let status: Status = $state({ message: 'Loading map...', isError: false });

	let mapIsLoaded = $state(false);

	// Form state
	let pinType: string = $state('dot');
	let pinText: string = $state('');

	// Constants
	const PIN_TYPES: PinType[] = [
		{ value: 'dot', label: 'Dot' },
		{ value: 'house', label: 'House' },
		{ value: 'fire', label: 'Fire' },
		{ value: 'mine', label: 'Mine' },
		{ value: 'cave', label: 'Cave' }
	] as const;

	// Event handlers
	function handleIframeLoad(event: Event): void {
		const target = event.target as HTMLIFrameElement;
		iframe = target;
		updateStatus('Map loaded. Click "Pick Location" to start placing pins.');
		mapIsLoaded = true;
	}

	function updateStatus(message: string, isError: boolean = false): void {
		status = { message, isError };
		console.log(isError ? 'Error: ' + message : message);
	}

	function handlePickLocation(): void {
		if (!iframe?.contentWindow) {
			updateStatus('Map not loaded yet. Please wait and try again.', true);
			return;
		}

		updateStatus('Click on the map to select coordinates...');
		isRequestingCoords = true;

		// Request coordinates from the iframe
		iframe.contentWindow.postMessage({ type: 'requestCoords' }, '*');
	}

	function handleAddPinLocation(
		pin: { type: (typeof PIN_TYPES)[number]['value']; label: string } & Coordinate
	): void {
		if (!iframe?.contentWindow) {
			updateStatus('Map not loaded yet.', true);
			return;
		}

		// Send pin data to the iframe
		iframe.contentWindow.postMessage(
			{
				type: 'addPin',
				x: pin.x.toString(),
				z: pin.z.toString(),
				pinType: pin.type || 'dot',
				pinText: pin.label || 'Custom Pin'
			},
			'*'
		);
	}

	function handleAddPin(): void {
		if (!currentCoords) {
			updateStatus('Please select coordinates first', true);
			return;
		}

		if (!iframe?.contentWindow) {
			updateStatus('Map not loaded yet.', true);
			return;
		}

		// Send pin data to the iframe
		iframe.contentWindow.postMessage(
			{
				type: 'addPin',
				x: currentCoords.x,
				z: currentCoords.z,
				pinType: pinType,
				pinText: pinText || 'Custom Pin'
			},
			'*'
		);

		updateStatus(`Added ${pinType} pin at (${currentCoords.x}, ${currentCoords.z})`);
		pinText = ''; // Clear the input for next pin
	}

	// Handle messages from iframe
	function handleMessage(event: MessageEvent): void {
		if (event.data?.type === 'canvasCoords') {
			const worldX = parseFloat(event.data.x);
			const worldZ = parseFloat(event.data.y);
			currentCoords = {
				x: worldX.toString(),
				z: worldZ.toString()
			};

			updateStatus('Coordinates received! Click "Add Pin" to place a pin or pick a new location.');
			isRequestingCoords = false;
		}
	}

	// Lifecycle
	onMount(() => {
		window.addEventListener('message', handleMessage);

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	});

	$effect(() => {
		if (!mapIsLoaded) return;
		if ($query.data) {
			const pins = $query.data as { label: string; type: PinType['value']; x: number; z: number }[];
			pins.forEach((pin) => {
				handleAddPinLocation({
					...pin
				});
			});
		}
	});
</script>

<div class="grid h-screen grid-rows-[200px_100%]">
	<nav class="navbar">
		<h1>Valheim Map</h1>

		<div class="nav-controls">
			<div class="form-group">
				<label for="pinType">Pin Type:</label>
				<select id="pinType" bind:value={pinType}>
					{#each PIN_TYPES as type (type)}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="pinText">Label:</label>
				<input type="text" id="pinText" bind:value={pinText} placeholder="Enter pin label" />
			</div>

			<div class="nav-buttons">
				<button
					id="pickBtn"
					on:click={handlePickLocation}
					disabled={isRequestingCoords}
					class:is-requesting={isRequestingCoords}
				>
					{isRequestingCoords ? 'Click on map...' : 'Pick Location'}
				</button>

				<button
					id="addPinBtn"
					on:click={handleAddPin}
					disabled={!currentCoords}
					class:is-disabled={!currentCoords}
				>
					Add Pin
				</button>
			</div>

			<div class="coords-display">
				{#if currentCoords}
					<div class="coord">X: {parseFloat(currentCoords.x).toFixed(2)}</div>
					<div class="coord">Z: {parseFloat(currentCoords.z).toFixed(2)}</div>
				{:else}
					<div class="no-coords">No location selected</div>
				{/if}
			</div>
		</div>

		<div id="status" class:error={status.isError}>
			{status.message}
		</div>
	</nav>

	<div id="map-container" class=" bg-gray-500">
		<iframe
			id="map-iframe"
			title="Valheim WebMap"
			src="https://empty-dream-fe29.innkeeper1.workers.dev/"
			sandbox="allow-same-origin allow-scripts allow-forms"
			on:load={handleIframeLoad}
		></iframe>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: Arial, sans-serif;
	}

	.container-all {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
	}

	.navbar {
		background: #2c3e50;
		color: white;
		padding: 10px 20px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
	}

	.navbar h1 {
		margin: 0 0 10px 0;
		color: white;
		font-size: 1.5rem;
	}

	.nav-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 15px;
		align-items: center;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.form-group label {
		font-size: 0.8rem;
		color: #ecf0f1;
	}

	select,
	input[type='text'] {
		padding: 6px 10px;
		border: 1px solid #34495e;
		border-radius: 4px;
		background: #34495e;
		color: white;
	}

	.nav-buttons {
		display: flex;
		gap: 10px;
	}

	button {
		padding: 6px 12px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		transition: all 0.2s;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	#pickBtn {
		background: #3498db;
		color: white;
	}

	#pickBtn.is-requesting {
		background: #e67e22;
	}

	#addPinBtn {
		background: #2ecc71;
		color: white;
	}

	#addPinBtn.is-disabled {
		background: #7f8c8d;
	}

	.coords-display {
		display: flex;
		gap: 15px;
		margin-left: auto;
		color: #ecf0f1;
		font-family: monospace;
		font-size: 0.9rem;
	}

	.no-coords {
		color: #bdc3c7;
	}

	#status {
		margin-top: 10px;
		padding: 5px 0;
		font-size: 0.9rem;
		color: #2ecc71;
	}

	#status.error {
		color: #e74c3c;
	}

	#map-container {
		flex: 1;
		width: 100%;
		position: relative;
		border: 1px solid #ccc;
		margin-bottom: 20px;
		border-radius: 4px;
		overflow: hidden;
	}

	/* Responsive styles */
	@media (max-width: 768px) {
		.nav-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.coords-display {
			margin: 10px 0 0 0;
			justify-content: space-between;
		}
	}

	@media (max-width: 480px) {
		.nav-buttons {
			flex-direction: column;
		}

		button {
			width: 100%;
		}
	}

	/* Button styles are now handled by button selectors */

	iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: none;
	}
</style>
