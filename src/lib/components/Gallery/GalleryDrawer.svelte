<script>
	import PinThumbnail from './PinThumbnail.svelte';

	// State to track if drawer is expanded
	let expanded = $state(false);

	// Function to toggle drawer state
	function toggleDrawer() {
		expanded = !expanded;
		console.log('Drawer toggled:', expanded);
	}
</script>

<div
	class="absolute top-0 right-0 z-20 flex h-full flex-col gap-2 overflow-hidden border-l-[1px] border-sky-300/70 backdrop-blur-sm hover:border-sky-300/100 {expanded
		? 'w-[275px] pt-1 pl-2'
		: 'w-[5px]'}"
	style="transition: width 300ms cubic-bezier(0.33, 1, 0.68, 1), padding 300ms cubic-bezier(0.33, 1, 0.68, 1);"
	role="region"
	aria-label="Gallery drawer"
>
	<div class="flex w-full items-center justify-between">
		<span>Draguar FOB</span>
		<button
			type="button"
			class="z-50 rounded p-1 hover:bg-sky-300/10"
			onclick={() => (expanded = false)}
			aria-label="Collapse gallery"
		>
			<span class="text-sm">×</span>
		</button>
	</div>
	<PinThumbnail />
	<PinThumbnail />
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
