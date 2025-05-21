<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import '../app.css';

	let { children } = $props();
	const queryClient = new QueryClient();
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>
