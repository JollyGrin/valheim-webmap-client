<script lang="ts">
	let { onClose }: { onClose(): void } = $props();

	const SERVER_ADDRESS = 'valheim.dean.lol:27029';

	// Client-required gameplay mods (confirmed loaded on the server). Players must install
	// matching versions to connect. Links point at Thunderstore search (stays correct even
	// if a package's author/slug changes).
	type Mod = { name: string; version: string; note?: string };
	const REQUIRED_MODS: Mod[] = [
		{ name: 'PlantEverything', version: '1.20.0' },
		{ name: 'CraftyCartsRemake', version: '3.1.12' },
		{ name: 'Guilds', version: '1.1.13' },
		{ name: 'OdinHorse', version: '1.6.1' },
		{ name: 'ChestSnap', version: '0.1.1', note: 'client-side mod' }
	];

	function thunderstore(q: string): string {
		return `https://thunderstore.io/c/valheim/?q=${encodeURIComponent(q)}`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
	<dialog
		class="bg-brand-dark text-brand-fore mx-4 w-full max-w-lg rounded-lg p-0 shadow-lg open:block"
		open
		aria-labelledby="mods-modal-title"
	>
		<div class="flex items-center justify-between p-3">
			<h2 id="mods-modal-title" class="text-xl font-semibold">Join Turtleheim</h2>
			<button
				class="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
				onclick={onClose}
				aria-label="Close">close</button
			>
		</div>

		<div class="max-h-[70vh] overflow-y-auto px-6 pb-6">
			<!-- Connect -->
			<div class="mb-4 rounded bg-slate-800 p-3">
				<div class="text-sm text-slate-300">Connect via “Join IP” in-game:</div>
				<div class="mt-1 font-mono text-lg">{SERVER_ADDRESS}</div>
				<div class="mt-1 text-xs text-slate-400">
					Ask an admin for the server password.
				</div>
			</div>

			<!-- Map needs nothing -->
			<p class="mb-4 rounded border border-emerald-700/50 bg-emerald-900/20 p-3 text-sm">
				👀 <strong>Just want to view the map?</strong> You need nothing — this page works for
				everyone, no install required.
			</p>

			<!-- Required mods -->
			<h3 class="mb-1 font-semibold">To play on the server, install these mods</h3>
			<p class="mb-3 text-xs text-slate-400">
				Match these versions. Easiest with a mod manager (below), which installs BepInEx for you.
			</p>

			<ul class="mb-4 space-y-2">
				{#each REQUIRED_MODS as mod (mod.name)}
					<li class="flex items-center justify-between rounded bg-slate-800 p-2">
						<div>
							<span class="font-medium">{mod.name}</span>
							<span class="ml-2 font-mono text-xs text-slate-400">v{mod.version}</span>
							{#if mod.note}
								<span class="ml-2 text-xs text-slate-500">({mod.note})</span>
							{/if}
						</div>
						<a
							class="rounded bg-sky-600 px-3 py-1 text-xs hover:bg-sky-500"
							href={thunderstore(mod.name)}
							target="_blank"
							rel="noopener noreferrer">find</a
						>
					</li>
				{/each}
			</ul>

			<!-- How to install -->
			<h3 class="mb-1 font-semibold">How to install</h3>
			<ol class="mb-4 list-decimal space-y-1 pl-5 text-sm text-slate-300">
				<li>
					Install a mod manager —
					<a
						class="text-sky-400 underline"
						href="https://thunderstore.io/c/valheim/p/ebkr/r2modman/"
						target="_blank"
						rel="noopener noreferrer">r2modman</a
					>
					or the
					<a
						class="text-sky-400 underline"
						href="https://www.overwolf.com/app/Thunderstore-Thunderstore_Mod_Manager"
						target="_blank"
						rel="noopener noreferrer">Thunderstore Mod Manager</a
					>.
				</li>
				<li>Create a Valheim profile — it installs <strong>BepInEx</strong> automatically.</li>
				<li>Install each mod above (matching versions), then “Start modded”.</li>
				<li>In Valheim → Join Game → enter <span class="font-mono">{SERVER_ADDRESS}</span>.</li>
			</ol>

			<p class="text-xs text-slate-500">
				The live map (WebMap) and pin-sync run on the server only — not in this list, nothing to
				install for them.
			</p>
		</div>
	</dialog>

	<button
		class="fixed inset-0 h-full w-full cursor-default bg-transparent"
		onclick={onClose}
		aria-label="Close modal"
		tabindex="-1"
	></button>
</div>

<style>
	dialog {
		margin: auto;
		z-index: 51;
	}
	dialog::backdrop {
		display: none;
	}
</style>
