<script lang="ts">
    import { onMount } from 'svelte';
    
    // Types
    interface Coordinate {
        x: string;
        z: string;
    }
    
    interface Status {
        message: string;
        isError: boolean;
    }
    
    interface PinType {
        value: string;
        label: string;
    }
    
    // Refs
    let iframe: HTMLIFrameElement | null = null;
    
    // State
    let currentCoords: Coordinate | null = null;
    let isRequestingCoords: boolean = false;
    let status: Status = { message: 'Loading map...', isError: false };
    
    // Form state
    let pinType: string = 'dot';
    let pinText: string = '';
    
    // Constants
    const PIN_TYPES: PinType[] = [
        { value: 'dot', label: 'Dot' },
        { value: 'house', label: 'House' },
        { value: 'fire', label: 'Fire' },
        { value: 'mine', label: 'Mine' },
        { value: 'cave', label: 'Cave' }
    ];
    
    // Event handlers
    function handleIframeLoad(event: Event): void {
        const target = event.target as HTMLIFrameElement;
        iframe = target;
        updateStatus('Map loaded. Click "Pick Location" to start placing pins.');
    }
    
    function updateStatus(message: string, isError: boolean = false): void {
        status = { message, isError };
        console.log(isError ? 'Error: ' + message : message);
    }
    
    function handlePickLocation(): void {
        if (!iframe?.contentWindow) {
            updateStatus('Map not loaded yet. Please wait and try again.', true);
            return;
        }
        
        updateStatus('Click on the map to select coordinates...');
        isRequestingCoords = true;
        
        // Request coordinates from the iframe
        iframe.contentWindow.postMessage(
            { type: 'requestCoords' },
            '*'
        );
    }
    
    function handleAddPin(): void {
        if (!currentCoords) {
            updateStatus('Please select coordinates first', true);
            return;
        }
        
        if (!iframe?.contentWindow) {
            updateStatus('Map not loaded yet.', true);
            return;
        }
        
        // Send pin data to the iframe
        iframe.contentWindow.postMessage(
            {
                type: 'addPin',
                x: currentCoords.x,
                z: currentCoords.z,
                pinType: pinType,
                pinText: pinText || 'Custom Pin'
            },
            '*'
        );
        
        updateStatus(`Added ${pinType} pin at (${currentCoords.x}, ${currentCoords.z})`);
        pinText = ''; // Clear the input for next pin
    }
    
    // Handle messages from iframe
    function handleMessage(event: MessageEvent): void {
        if (event.data?.type === 'canvasCoords') {
            const worldX = parseFloat(event.data.x);
            const worldZ = parseFloat(event.data.y);
            currentCoords = { 
                x: worldX.toString(), 
                z: worldZ.toString() 
            };
            
            updateStatus('Coordinates received! Click "Add Pin" to place a pin or pick a new location.');
            isRequestingCoords = false;
        }
    }
    
    // Lifecycle
    onMount(() => {
        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    });
</script>

<div class="container">
    <h1>Valheim Map Coordinate Picker</h1>
    
    <div id="map-container">
        <iframe
            id="map-iframe"
            title="Valheim WebMap"
            src="http://forestofgrins.noob.club:20659"
            sandbox="allow-same-origin allow-scripts"
            on:load={handleIframeLoad}
        ></iframe>
    </div>

    <div id="pin-controls">
        <h3>Add Pin at Selected Location</h3>
        <div class="form-group">
            <label for="pinType">Pin Type:</label>
            <select id="pinType" bind:value={pinType}>
                {#each PIN_TYPES as type}
                    <option value={type.value}>{type.label}</option>
                {/each}
            </select>
        </div>
        <div class="form-group">
            <label for="pinText">Pin Label (optional):</label>
            <input 
                type="text" 
                id="pinText" 
                bind:value={pinText}
                placeholder="Enter pin label" 
            />
        </div>
        <div class="button-group">
            <button 
                id="pickBtn" 
                on:click={handlePickLocation}
                disabled={isRequestingCoords}
            >
                {isRequestingCoords ? 'Click on the map...' : 'Pick Location'}
            </button>
            <button 
                id="addPinBtn" 
                on:click={handleAddPin}
                disabled={!currentCoords}
            >
                Add Pin
            </button>
        </div>
    </div>

    <div id="coords">
        {#if currentCoords}
            <strong>Selected Coordinates:</strong><br>
            X: {parseFloat(currentCoords.x).toFixed(2)}<br>
            Z: {parseFloat(currentCoords.z).toFixed(2)}
        {:else}
            No coordinates selected yet. Click "Pick Location" and then click on the map.
        {/if}
    </div>
    
    <div id="status" class:error={status.isError}>
        {status.message}
    </div>
</div>

<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
    }
    
    h1 {
        color: #333;
        margin-bottom: 20px;
    }
    
    #map-container {
        width: 100%;
        height: 70vh;
        border: 1px solid #ccc;
        margin-bottom: 20px;
        border-radius: 4px;
        overflow: hidden;
    }
    
    #pin-controls {
        background: #f9f9f9;
        padding: 20px;
        border-radius: 4px;
        margin: 15px 0;
        border: 1px solid #eee;
    }
    
    .form-group {
        margin-bottom: 15px;
    }
    
    label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #333;
    }
    
    input[type='text'],
    select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }
    
    .button-group {
        display: flex;
        gap: 10px;
        margin-top: 15px;
    }
    
    /* Button styles are now handled by button selectors */

    iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
    }
</style>
