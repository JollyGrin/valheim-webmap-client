<script lang="ts">
	import { useAllPhotos, useDeletePhoto, type MediaGetDTO } from '$lib/api/media';
	import PinThumbnail from '$lib/components/Gallery/PinThumbnail.svelte';

	const query = useAllPhotos();
	const mutation = useDeletePhoto();

	function sortLatestDateFirst(a: MediaGetDTO, b: MediaGetDTO) {
		const aDate = new Date(a.createdAt).getTime();
		const bDate = new Date(b.createdAt).getTime();
		return bDate - aDate;
	}

	function deletePhoto(mediaId: string) {
		$mutation.mutate(mediaId);
	}
</script>

<div class="h-screen w-screen bg-slate-800 p-2 text-white">
	<a href="/">Back to map</a>
	<h1>Gallery Images</h1>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		{#each $query.data?.sort(sortLatestDateFirst) ?? [] as photo, i (i)}
			<div>
				<PinThumbnail data={photo} />
				<button
					onclick={() => deletePhoto(photo.id)}
					class="mt-1 w-full cursor-pointer rounded-full bg-red-700 hover:opacity-50"
				>
					Delete
				</button>
			</div>
		{/each}
	</div>
</div>
