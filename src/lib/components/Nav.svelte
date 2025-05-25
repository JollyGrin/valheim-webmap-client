<script lang="ts">
	import { useRegister, type RegisterRequest } from '$lib/api/user';

	let isOpen = $state(false);
	let usernameRef: string = $state('');
	let serverRef: string = $state('');

	const newUserMutation = useRegister();
	function registerNewUser() {
		const payload: RegisterRequest = {
			username: usernameRef,
			password: serverRef
		};
		$newUserMutation.mutate(payload);
	}
</script>

<nav class="hidden h-[50px] items-center justify-between bg-slate-900 p-2 text-white sm:flex">
	<div class="flex gap-2">
		<span>Valheim Server: Forest of Grins</span>
		<span class="rounded-full bg-slate-950 px-2 py-1 font-mono text-xs"
			>forestofgrins.noob.club:20656
		</span>
	</div>
	{#if isOpen}
		<div class="flex gap-2">
			<input placeholder="username" bind:value={usernameRef} />
			<input placeholder="server password" bind:value={serverRef} />
			<button class="w-fit rounded-full bg-sky-500 px-4" onclick={registerNewUser}> login </button>
		</div>
	{:else}
		<button class="w-fit rounded-full bg-sky-500 px-4" onclick={() => (isOpen = true)}>
			sign in
		</button>
	{/if}
</nav>

<style>
	input {
		background: white;
		padding: 0 1rem;
		color: black;
		border-radius: 1rem;
		width: 8rem;

		&::placeholder {
			color: lightgray;
			font-size: 0.75rem;
		}
	}
</style>
