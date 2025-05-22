<script lang="ts">
	import type { Coordinate, PinType } from '$lib/types';
	import { useNewPin } from '$lib/api/pins';

	let {
		coords = null,
		iframe = null,
		onClose
	}: {
		coords: Coordinate | null;
		iframe: HTMLIFrameElement | null;
		onClose(): void;
	} = $props();

	const mutation = useNewPin();

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
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleOverlayClick() {
		onClose();
	}

	function handleAddPin(): void {
		if (!coords) {
			return console.error('No coords.', coords);
		}

		if (!iframe?.contentWindow) {
			return console.error('No iframe', iframe);
		}

		$mutation.mutate({
			type: pinType,
			x: Number(coords.x),
			z: Number(coords.z),
			label: pinText
		});

		// Send pin data to the iframe
		iframe.contentWindow.postMessage(
			{
				type: 'addPin',
				x: coords.x,
				z: coords.z,
				pinType: pinType,
				pinText: pinText || 'Custom Pin'
			},
			'*'
		);

		// Close modal after adding pin
		onClose();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Modal Overlay with Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
	<!-- Modal Dialog -->
	<dialog
		class="bg-brand-dark text-brand-fore mx-4 w-full max-w-md rounded-lg p-0 shadow-lg open:block"
		open
		aria-labelledby="modal-title"
	>
		<!-- Modal Header with Close Button -->
		<div class="flex justify-end p-2">
			<button
				class="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
				onclick={onClose}
				aria-label="Close"
			>
				<span>close</span>
			</button>
		</div>

		<!-- Modal Body -->
		<div class="px-6 pb-6">
			<h2 id="modal-title" class="mb-4 text-xl font-semibold">Add New Pin</h2>

			<!-- Coordinates Display -->
			<div class="mb-4 rounded bg-slate-800 p-2 text-center">
				{#if coords}
					<div class="flex justify-center gap-4">
						<div>X: {parseFloat(coords.x).toFixed(2)}</div>
						<div>Z: {parseFloat(coords.z).toFixed(2)}</div>
					</div>
				{:else}
					<div>No location selected</div>
				{/if}
			</div>

			<!-- Pin Type Selection -->
			<div class="mb-4">
				<label for="modalPinType" class="mb-1 block font-medium">Pin Type:</label>
				<select
					id="modalPinType"
					bind:value={pinType}
					class="w-full rounded bg-slate-700 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				>
					{#each PIN_TYPES as type (type.value)}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
			</div>

			<!-- Pin Label Input -->
			<div class="mb-4">
				<label for="modalPinText" class="mb-1 block font-medium">Label:</label>
				<input
					type="text"
					id="modalPinText"
					bind:value={pinText}
					placeholder="Enter pin label"
					class="w-full rounded bg-slate-700 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</div>

			<!-- Action Buttons -->
			<div class="mt-6 flex justify-end gap-2">
				<button
					class="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
					onclick={onClose}
				>
					Cancel
				</button>
				<button
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50"
					onclick={handleAddPin}
					disabled={!coords}
					class:opacity-50={!coords}
				>
					Add Pin
				</button>
			</div>
		</div>
	</dialog>

	<!-- Invisible overlay to close modal when clicking outside -->
	<button
		class="fixed inset-0 h-full w-full cursor-default bg-transparent"
		onclick={handleOverlayClick}
		aria-label="Close modal"
		tabindex="-1"
	></button>
</div>

<style>
	/* Dialog styling */
	dialog {
		margin: auto;
		/* background: transparent; */
		/* color: white; */
		/* border: none; */
		z-index: 51;
	}
	dialog::backdrop {
		display: none;
	}
</style>
