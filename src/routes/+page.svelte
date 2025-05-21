<script>
    function handleIframeLoad(event) {
        try {
            const iframe = event.target;
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
</script>

<main>
    <div class="map-container">
        <iframe 
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
    }

    main {
        height: 100vh;
        width: 100vw;
    }

    .map-container {
        position: relative;
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
