<script lang="ts">
	import type { MediaGetDTO } from '$lib/api/media';

	let { data }: { data: MediaGetDTO } = $props();

	function getFormattedDate(date = new Date()) {
		const day = date.getDate();
		const weekday = date.toLocaleString('en-US', { weekday: 'long' });
		const month = date.toLocaleString('en-US', { month: 'long' });
		const year = date.getFullYear();

		const ordinal = (n) => {
			const s = ['th', 'st', 'nd', 'rd'];
			const v = n % 100;
			return s[(v - 20) % 10] || s[v] || s[0];
		};

		return `${weekday}, ${month} ${day}${ordinal(day)} ${year}`;
	}

	const formattedDate = $derived(getFormattedDate(new Date(data?.createdAt ?? '')));
</script>

<div class="group relative px-2">
	<div
		class="absolute top-1 left-3 rounded-xl px-2 py-1 font-mono text-xs text-white backdrop-blur-sm group-hover:hidden"
	>
		<span>{Math.floor(data?.x)}:{Math.floor(data?.z)}</span>
	</div>
	<div
		class="absolute right-1 bottom-1 rounded-xl px-2 py-1 font-mono text-xs text-white backdrop-blur-sm group-hover:hidden"
	>
		<span>{formattedDate}</span>
	</div>
	<img
		src={data?.url ?? ''}
		alt="screenshot"
		class="rounded-2xl transition-all group-hover:saturate-200 hover:scale-105"
	/>
</div>
