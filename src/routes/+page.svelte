<script>
    import { onMount } from 'svelte';
    
    let iframe = null;
    
    let pinName = '';
    let pinType = 'dot';
    let pinX = '';
    let pinZ = '';
    let isRequestingCoords = false;
    
    const pinTypes = [
        { value: 'dot', label: 'Dot' },
        { value: 'house', label: 'House' },
        { value: 'fire', label: 'Fire' },
        { value: 'mine', label: 'Mine' },
        { value: 'cave', label: 'Cave' }
    ];

    function handleIframeLoad(event) {
        try {
            iframe = event.target;
            const style = document.createElement('style');
            style.textContent = `
                div[data-id="coords"].mapText.coords {
                    color: red !important;
                }
            `;
            iframe.contentDocument.head.appendChild(style);
        } catch (e) {
            console.error('Could not access iframe content:', e);
        }
    }

    function requestCoords() {
        isRequestingCoords = true;
        // alert('Click on the map to select coordinates');
        // Make sure the iframe is loaded and has contentWindow
        if (iframe && iframe.contentWindow) {
            // Request coordinates from the iframe
            iframe.contentWindow.postMessage({ type: 'requestCoords' }, '*');
        } else {
            alert('Map not loaded yet. Please wait and try again.');
            isRequestingCoords = false;
        }
    }

    function convertToValheimCoords(x, y) {
        const canvasWidth = 2048;
        const canvasHeight = 2048;
        const pixelSize = 12;
        const coordOffset = canvasWidth / 2;
        
        const imgX = x / canvasWidth * canvasWidth;
        const imgY = y / canvasHeight * canvasHeight;
        const worldX = (imgX - coordOffset) * pixelSize;
        const worldZ = -((imgY - coordOffset) * pixelSize);
        
        return isFinite(worldX) && isFinite(worldZ) ? { x: worldX, z: worldZ } : null;
    }

    async function addPin() {
        if (!pinX || !pinZ) {
            alert('Please select coordinates first');
            return;
        }

        const pin = {
            uid: 'player123', // TODO: Replace with actual player ID
            pinId: Date.now().toString(),
            type: pinType,
            name: 'Player', // TODO: Replace with player name
            x: parseFloat(pinX),
            z: parseFloat(pinZ),
            text: pinName || 'Unnamed'
        };

        try {
            // TODO: Update with your actual API endpoint and key
            const response = await fetch('http://your_other_server:3001/add-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'your_secret_key'
                },
                body: JSON.stringify(pin)
            });

            if (response.ok) {
                alert('Pin added successfully!');
                iframe.contentWindow.location.reload();
            } else {
                alert('Error: Failed to add pin');
                throw new Error('Failed to add pin');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error adding pin:', error);
            alert(`Error: ${errorMessage}`);
        }
    }

    function handleMessage(event) {
        console.log('Received message:', event.data);
        
        if (event.data.type === 'canvasCoords' && isRequestingCoords) {
            console.log('Received canvas coords:', event.data);
            const valheimCoords = convertToValheimCoords(event.data.x, event.data.y);
            
            if (valheimCoords) {
                pinX = valheimCoords.x.toFixed(2);
                pinZ = valheimCoords.z.toFixed(2);
                alert(`Coordinates selected: X=${pinX}, Z=${pinZ}`);
            } else {
                alert('Invalid coordinates received');
            }
            isRequestingCoords = false;
        }
    }

    onMount(() => {
        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    });
</script>

<main>
    <div class="controls">
        <div class="form-group">
            <input 
                type="text" 
                bind:value={pinName} 
                placeholder="Pin Name" 
                class="input"
            />
            <select bind:value={pinType} class="select">
                {#each pinTypes as type}
                    <option value={type.value}>{type.label}</option>
                {/each}
            </select>
            <input 
                type="number" 
                bind:value={pinX} 
                placeholder="X Coordinate" 
                step="0.01" 
                class="input coord"
                
            />
            <input 
                type="number" 
                bind:value={pinZ} 
                placeholder="Z Coordinate" 
                step="0.01" 
                class="input coord"
                
            />
            <button on:click={requestCoords} class="btn">
                {isRequestingCoords ? 'Click on Map...' : 'Select Coordinates'}
            </button>
            <button on:click={addPin} class="btn btn-primary">
                Add Pin
            </button>
        </div>
    </div>
    
    <div class="map-container">
        <iframe 
            bind:this={iframe}
            src="http://forestofgrins.noob.club:20659" 
            title="Valheim Map"
            allowfullscreen
            on:load={handleIframeLoad}
        ></iframe>
    </div>
</main>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        height: 100vh;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
    }

    main {
        height: 100vh;
        width: 100vw;
        display: flex;
        flex-direction: column;
    }

    .controls {
        padding: 1rem;
        background: #2d3748;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 100;
    }

    .form-group {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
    }

    .input {
        padding: 0.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        background: white;
    }

    .input.coord {
        width: 120px;
        background: #f7fafc;
    }

    .select {
        padding: 0.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        background: white;
        min-width: 120px;
    }

    .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.25rem;
        background: #e2e8f0;
        cursor: pointer;
        transition: background 0.2s;
    }

    .btn:hover {
        background: #cbd5e0;
    }

    .btn-primary {
        background: #4299e1;
        color: white;
    }

    .btn-primary:hover {
        background: #3182ce;
    }

    .map-container {
        position: relative;
        flex: 1;
        width: 100%;
        height: 100%;
    }

    iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
    }
</style>
