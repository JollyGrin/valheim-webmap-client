<script lang="ts">
	import { onMount } from 'svelte';
	import { useRegister, type RegisterRequest, type UserDTO } from '$lib/api/user';
	import { writable } from 'svelte/store';

	// Store for current user
	const currentUser = writable<UserDTO | null>(null);

	// Form state
	let isOpen = $state(false);
	let usernameRef: string = $state('');
	let serverRef: string = $state('');
	let steamIdRef: string = $state('');
	let errorMessage: string = $state('');
	let isLoading: boolean = $state(false);

	// User data stored in localStorage keys
	const USER_ID_KEY = 'valheim_user_id';
	const USERNAME_KEY = 'valheim_username';
	const STEAM_ID_KEY = 'valheim_steam_id';

	// Cookie key for server password
	const SERVER_PASSWORD_COOKIE = 'valheim_server_password';

	// Setup register mutation
	const registerMutation = useRegister();
	// Access the underlying mutation object correctly
	const { mutate } = $registerMutation;

	// Check for existing user data on component mount
	onMount(() => {
		// Load user data from localStorage if available
		const storedUserId = localStorage.getItem(USER_ID_KEY);
		const storedUsername = localStorage.getItem(USERNAME_KEY);
		const storedSteamId = localStorage.getItem(STEAM_ID_KEY);

		// If we have stored user data, update the user store
		if (storedUserId && storedUsername) {
			currentUser.set({
				id: storedUserId,
				username: storedUsername,
				steamId: storedSteamId || undefined,
				createdAt: '', // These fields aren't critical for client-side use
				updatedAt: ''
			});
		}

		// Load server password from cookie if available
		const serverPassword = getCookie(SERVER_PASSWORD_COOKIE);
		if (serverPassword) {
			serverRef = serverPassword;
		}
	});

	// Function to get cookie value by name
	function getCookie(name: string): string | null {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) {
			return parts.pop()?.split(';').shift() || null;
		}
		return null;
	}

	// Function to set cookie with no expiration (or very distant future)
	function setCookie(name: string, value: string) {
		// Set cookie with expiration date far in the future (effectively permanent)
		const farFuture = new Date();
		farFuture.setFullYear(farFuture.getFullYear() + 10); // 10 years from now
		document.cookie = `${name}=${value}; expires=${farFuture.toUTCString()}; path=/; SameSite=Strict`;
	}

	// Function to handle registration/authentication
	async function handleAuth() {
		if (!usernameRef.trim()) {
			errorMessage = 'Username is required';
			return;
		}

		if (!serverRef.trim()) {
			errorMessage = 'Server password is required';
			return;
		}

		isLoading = true;
		errorMessage = '';

		const payload: RegisterRequest = {
			username: usernameRef.trim(),
			password: serverRef.trim()
		};

		// Add steamId if provided
		if (steamIdRef.trim()) {
			payload.steamId = steamIdRef.trim();
		}

		try {
			// Call mutate with the payload and callbacks
			mutate(payload, {
				onSuccess: (data: any) => {
					if (data.success && data.user) {
						// Update current user store
						currentUser.set(data.user);

						// Store user data in localStorage
						localStorage.setItem(USER_ID_KEY, data.user.id);
						localStorage.setItem(USERNAME_KEY, data.user.username);
						if (data.user.steamId) {
							localStorage.setItem(STEAM_ID_KEY, data.user.steamId);
						}

						// Store server password in cookie
						setCookie(SERVER_PASSWORD_COOKIE, serverRef.trim());

						// Close the form
						isOpen = false;
					} else {
						errorMessage = data.error || 'Authentication failed';
					}
				},
				onError: (error: Error) => {
					errorMessage = error.message || 'An error occurred';
				}
			});
		} catch (error: unknown) {
			errorMessage = 'Failed to connect to the server';
		} finally {
			isLoading = false;
		}
	}

	// Handle logout
	function handleLogout() {
		// Clear user data from store
		currentUser.set(null);

		// Clear localStorage
		localStorage.removeItem(USER_ID_KEY);
		localStorage.removeItem(USERNAME_KEY);
		localStorage.removeItem(STEAM_ID_KEY);

		// We'll keep the server password cookie as it might be needed for future logins
		// Reset form fields
		usernameRef = '';
		steamIdRef = '';
	}
</script>

<nav class="hidden h-[50px] items-center justify-between bg-slate-900 p-2 text-white sm:flex">
	<div class="flex gap-2">
		<span>Valheim Server: Forest of Grins</span>
		<span class="rounded-full bg-slate-950 px-2 py-1 font-mono text-xs"
			>valheim.dean.lol:27029
		</span>
	</div>

	{#if $currentUser}
		<!-- User is logged in -->
		<div class="flex items-center gap-2">
			<span class="text-sm">Welcome, <strong>{$currentUser.username}</strong></span>
			<button
				class="rounded-full bg-slate-700 px-3 py-1 text-xs hover:bg-slate-600"
				onclick={handleLogout}
			>
				Log out
			</button>
		</div>
	{:else if isOpen}
		<!-- Login/Registration form -->
		<div class="flex flex-col gap-1">
			<div class="flex gap-2">
				<input
					type="text"
					placeholder="Valheim username"
					bind:value={usernameRef}
					disabled={isLoading}
				/>
				<input
					type="password"
					placeholder="Server password"
					bind:value={serverRef}
					disabled={isLoading}
				/>
				<input
					type="text"
					placeholder="Steam ID (optional)"
					bind:value={steamIdRef}
					disabled={isLoading}
				/>
				<button
					class="w-[6rem] rounded-full bg-sky-500 px-4 hover:bg-sky-600 disabled:bg-gray-500"
					onclick={handleAuth}
					disabled={isLoading}
				>
					{isLoading ? 'Loading...' : 'Sign in'}
				</button>
			</div>
			{#if errorMessage}
				<p class="text-xs text-red-400">{errorMessage}</p>
			{/if}
		</div>
	{:else}
		<!-- Login button -->
		<button
			class="w-fit rounded-full bg-sky-500 px-4 hover:bg-sky-600"
			onclick={() => (isOpen = true)}
		>
			Sign in
		</button>
	{/if}
</nav>

<style>
	input {
		background: white;
		padding: 0 0.75rem;
		color: black;
		border-radius: 1rem;
		width: 8rem;
		height: 2rem;

		&::placeholder {
			color: lightgray;
			font-size: 0.75rem;
		}

		&:disabled {
			background: #f0f0f0;
			cursor: not-allowed;
		}
	}
</style>
