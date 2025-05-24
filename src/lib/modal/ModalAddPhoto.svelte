<script lang="ts">
	import type { Coordinate } from '$lib/types';
	import { useNewPhoto } from '$lib/api/media';

	let {
		coords = null,
		iframe = null,
		onClose
	}: {
		coords: Coordinate | null;
		iframe: HTMLIFrameElement | null;
		onClose(): void;
	} = $props();

	const mutation = useNewPhoto();

	// Form state
	let imageUrl: string = $state('');
	let caption: string = $state('');
	let isPreviewValid: boolean = $state(false);
	let isLoading: boolean = $state(false);

	// Event handlers
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleOverlayClick() {
		onClose();
	}

	function validateImageUrl() {
		if (!imageUrl) {
			isPreviewValid = false;
			return;
		}

		// Check if URL is valid
		try {
			new URL(imageUrl);
			isPreviewValid = true;
		} catch (e) {
			isPreviewValid = false;
		}
	}

	// Handle image URL changes
	$effect(() => {
		validateImageUrl();
	});

	function handleAddPhoto(): void {
		if (!coords) {
			return console.error('No coords.', coords);
		}

		if (!isPreviewValid) {
			return console.error('Invalid image URL');
		}

		isLoading = true;

		$mutation.mutate({
			imageUrl: imageUrl,
			caption: caption,
			x: Number(coords.x),
			z: Number(coords.z)
		});

		// Close modal after adding photo
		onClose();
		isLoading = false;
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
			<h2 id="modal-title" class="mb-4 text-xl font-semibold">Add New Photo</h2>

			<!-- Coordinates Display -->
			<div class="mb-4 rounded bg-slate-800 p-2 text-center text-white">
				{#if coords}
					<div class="flex justify-center gap-4">
						<div>X: {parseFloat(coords.x).toFixed(2)}</div>
						<div>Z: {parseFloat(coords.z).toFixed(2)}</div>
					</div>
				{:else}
					<div>No location selected</div>
				{/if}
			</div>

			<!-- Image URL Input -->
			<div class="mb-4">
				<label for="modalImageUrl" class="mb-1 block font-medium">Image URL:</label>
				<input
					type="url"
					id="modalImageUrl"
					bind:value={imageUrl}
					placeholder="Enter image URL"
					class="w-full rounded bg-slate-700 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</div>

			<!-- Image Preview -->
			{#if isPreviewValid && imageUrl}
				<div class="mb-4 overflow-hidden rounded">
					<img 
						src={imageUrl} 
						alt="Preview" 
						class="w-full object-cover" 
						style="max-height: 200px;"
						onerror={() => (isPreviewValid = false)}
					/>
				</div>
			{:else if imageUrl}
				<div class="mb-4 rounded bg-red-800 p-2 text-center text-white">
					Invalid image URL or image cannot be loaded
				</div>
			{/if}

			<!-- Caption/Note Input -->
			<div class="mb-4">
				<label for="modalCaption" class="mb-1 block font-medium">Caption/Note:</label>
				<textarea
					id="modalCaption"
					bind:value={caption}
					placeholder="Add a caption or note about this photo"
					class="w-full rounded bg-slate-700 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
					rows="3"
				></textarea>
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
					onclick={handleAddPhoto}
					disabled={!coords || !isPreviewValid || isLoading}
					class:opacity-50={!coords || !isPreviewValid || isLoading}
				>
					{isLoading ? 'Uploading...' : 'Add Photo'}
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
