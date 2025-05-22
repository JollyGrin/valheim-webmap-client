<script lang="ts">
	import { useAllPins, useNewPin } from '$lib/api/pins';
	import { onMount } from 'svelte';
	import type { Coordinate, PinType, Status } from '$lib/types';
	import ModalAddPin from '$lib/modal/ModalAddPin.svelte';

	const query = useAllPins();
	const mutation = useNewPin();

	// Refs
	let iframe: HTMLIFrameElement | null = $state(null);

	// State
	let currentCoords: Coordinate | null = $state(null);
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

	function prepareCoordinateClick() {
		if (!iframe || !iframe.contentWindow) return console.error('No iframe');
		iframe.contentWindow.postMessage({ type: 'requestCoords' }, '*');
	}

	// Event handlers
	function handleIframeLoad(event: Event): void {
		const target = event.target as HTMLIFrameElement;
		iframe = target;
		updateStatus('Map loaded. Click "Pick Location" to start placing pins.');
		mapIsLoaded = true;
		prepareCoordinateClick();
	}

	function updateStatus(message: string, isError: boolean = false): void {
		status = { message, isError };
		console.log(isError ? 'Error: ' + message : message);
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

		$mutation.mutate({
			type: 'dot',
			x: Number(currentCoords.x),
			z: Number(currentCoords.z),
			label: pinText
		});

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
			prepareCoordinateClick();
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

	let isAddPinOpen = $state(false);
</script>

{#if isAddPinOpen}
	<ModalAddPin onClose={() => (isAddPinOpen = false)} coords={currentCoords} {iframe} />
{/if}

<div class="relative grid h-screen sm:grid-rows-[50px_calc(100vh-50px)]">
	<nav class="hidden h-[50px] bg-slate-900 p-2 text-white sm:block">
		<span>info</span>
	</nav>

	<div id="map-container" class=" bg-gray-500">
		<div class="absolute bottom-4 z-10 flex w-full justify-center">
			{#if currentCoords}
				<button class="bg-blue-400" onclick={() => (isAddPinOpen = true)}
					>Add pin at {currentCoords.x}:{currentCoords.z}</button
				>
			{/if}
		</div>
		<iframe
			id="map-iframe"
			title="Valheim WebMap"
			src="https://empty-dream-fe29.innkeeper1.workers.dev/"
			sandbox="allow-same-origin allow-scripts allow-forms"
			onload={handleIframeLoad}
		></iframe>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: Arial, sans-serif;
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
		height: 100%;
		position: relative;
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
