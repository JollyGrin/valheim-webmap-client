<script lang="ts">
	import { useAllPins, useDeletePin } from '$lib/api/pins';
	import { onMount } from 'svelte';
	import type { Coordinate, PinType } from '$lib/types';
	import ModalAddPin from '$lib/modal/ModalAddPin.svelte';
	import PinThumbnail from '$lib/components/Gallery/PinThumbnail.svelte';
	import GalleryDrawer from '$lib/components/Gallery/GalleryDrawer.svelte';
	import ModalAddPhoto from '$lib/modal/ModalAddPhoto.svelte';
	import { iframeDrawPin } from '$lib/iframe-utility';

	const query = useAllPins();
	const removePinMutation = useDeletePin();

	// Refs
	let iframe: HTMLIFrameElement | null = $state(null);

	// State
	let currentCoords: Coordinate | null = $state(null);
	let mapIsLoaded = $state(false);

	const nearbyPins = $derived(
		$query?.data?.filter((pin) => {
			if (!currentCoords) return false;
			const radius = 10; // detection radius

			const dx = Math.abs(parseFloat(pin.x.toString()) - parseFloat(currentCoords.x.toString()));
			const dz = Math.abs(parseFloat(pin.z.toString()) - parseFloat(currentCoords.z.toString()));

			return dx <= radius && dz <= radius; // square radius
			// return Math.sqrt(dx*dx + dz*dz) <= radius; // circle radius
		}) ?? []
	);

	function prepareCoordinateClick() {
		if (!iframe || !iframe.contentWindow) return console.error('No iframe');
		iframe.contentWindow.postMessage({ type: 'requestCoords' }, '*');
	}

	// Event handlers
	function handleIframeLoad(event: Event): void {
		const target = event.target as HTMLIFrameElement;
		iframe = target;
		console.info('DEBUG: Map loaded. Click "Pick Location" to start placing pins.');
		mapIsLoaded = true;
		prepareCoordinateClick();
	}

	function handleAddPinLocation(pin: { type: PinType['value']; label: string } & Coordinate): void {
		if (!iframe?.contentWindow) {
			console.error('Cannot add pin location, no iframe available', iframe);
			return;
		}

		// Send pin data to the iframe
		iframeDrawPin(iframe, pin);

		// Send pin data to the iframe
		// const payload = {
		// 	type: 'addPin',
		// 	x: pin.x.toString(),
		// 	z: pin.z.toString(),
		// 	pinType: pin.type || 'dot',
		// 	pinText: pin.label || 'Custom Pin'
		// };
		// iframe.contentWindow.postMessage(payload, '*');
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

			console.info('Coordinates recieved:', currentCoords);
			prepareCoordinateClick();
		}
	}

	function removePin(pinId: string) {
		$removePinMutation.mutate(pinId);
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
				handleAddPinLocation({ ...(pin as any) });
			});
		}
	});

	let isAddPinOpen = $state(false);
	let isAddPhotoOpen = $state(false);
</script>

{#if isAddPinOpen}
	<ModalAddPin onClose={() => (isAddPinOpen = false)} coords={currentCoords} {iframe} />
{/if}

{#if isAddPhotoOpen}
	<ModalAddPhoto onClose={() => (isAddPhotoOpen = false)} coords={currentCoords} {iframe} />
{/if}

<div class="relative grid h-screen sm:grid-rows-[50px_calc(100vh-50px)]">
	<nav class="hidden h-[50px] items-center gap-2 bg-slate-900 p-2 text-white sm:flex">
		<span>Valheim Server: Forest of Grins</span>
		<span class="rounded-full bg-slate-950 px-2 py-1 font-mono text-xs"
			>forestofgrins.noob.club:20656
		</span>
	</nav>

	<div id="map-container" class=" bg-gray-500">
		<GalleryDrawer />
		<div class="absolute bottom-4 z-10 flex w-full justify-center gap-2 text-xs">
			{#each nearbyPins as pin (pin)}
				<button class="bg-red-300" onclick={() => removePin(pin.id)}
					>Remove {pin.label ?? 'Custom Pin'} - {pin.x}:{pin.z}</button
				>
			{/each}
			{#if currentCoords}
				<button
					class="bg-blue-400 transition-all select-none hover:scale-110"
					onclick={() => (isAddPinOpen = true)}
					>Add pin at {currentCoords.x}:{currentCoords.z}</button
				>

				<button
					class="bg-purple-400 transition-all select-none hover:scale-110"
					onclick={() => (isAddPhotoOpen = true)}
					>Add photo near {Math.floor(Number(currentCoords.x))}:{Math.floor(
						Number(currentCoords.z)
					)}</button
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

	#map-container {
		flex: 1;
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
	}

	/* Responsive styles */
	@media (max-width: 768px) {
	}

	@media (max-width: 480px) {
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
