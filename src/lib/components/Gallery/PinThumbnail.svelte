<script lang="ts">
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

	const formattedDate = getFormattedDate();
</script>

<div class="group relative">
	<div
		class="absolute right-1 bottom-1 rounded-xl px-2 py-1 font-mono text-xs text-white backdrop-blur-sm group-hover:hidden"
	>
		<span>{formattedDate}</span>
	</div>
	<img
		src="https://images.steamusercontent.com/ugc/16577188736000915761/50B65610C956E24D485C151E4EA9613E32FEEB8A/?imw=1024&imh=576&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true"
		alt="screenshot"
		class="rounded-2xl transition-all group-hover:saturate-200"
	/>
</div>
