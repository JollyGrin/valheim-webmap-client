<script lang="ts">
	import type { MediaGetDTO } from '$lib/api/media';
	import { useAllPhotos } from '$lib/api/media';
	import IconMedia from '$lib/icon/IconMedia.svelte';
	import PinThumbnail from './PinThumbnail.svelte';

	// State to track if drawer is expanded
	let expanded = $state(false);

	// Function to toggle drawer state
	function toggleDrawer() {
		expanded = !expanded;
		console.log('Drawer toggled:', expanded);
	}

	const query = useAllPhotos();
	function sortLatestDateFirst(a: MediaGetDTO, b: MediaGetDTO) {
		const aDate = new Date(a.createdAt).getTime();
		const bDate = new Date(b.createdAt).getTime();
		return bDate - aDate;
	}
</script>

<div
	class="absolute top-0 right-0 z-20 flex h-full flex-col gap-2 border-l-[1px] border-sky-300/70 backdrop-blur-sm hover:border-sky-300/100 {expanded
		? 'w-[275px] overflow-hidden pt-1 pl-2'
		: 'w-[5px]'}"
	style="transition: width 300ms cubic-bezier(0.33, 1, 0.68, 1), padding 300ms cubic-bezier(0.33, 1, 0.68, 1);"
	role="region"
	aria-label="Gallery drawer"
>
	{#if !expanded}
		<button
			onclick={toggleDrawer}
			class="absolute top-[50%] left-[-1.8rem] z-50 grid h-7 w-7 cursor-pointer place-items-center rounded-l-full bg-sky-300/70 p-1 text-white transition-all hover:bg-gradient-to-l hover:from-sky-300 hover:to-sky-300/70"
		>
			<IconMedia />
		</button>
	{/if}
	{#if expanded}
		{#each $query.data?.sort(sortLatestDateFirst) ?? [] as photo, i (i)}
			<PinThumbnail data={photo} />
		{/each}
	{/if}

	<button
		type="button"
		class="absolute top-0 right-0 z-50 h-full cursor-pointer bg-sky-300/70 hover:bg-sky-300"
		class:w-2={expanded}
		class:left-0={expanded}
		class:right-0={!expanded}
		class:w-full={!expanded}
		onclick={toggleDrawer}
		aria-label="Expand gallery"
		title="Click to expand gallery"
	></button>
</div>
