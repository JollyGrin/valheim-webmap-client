/**
 * Cloudflare Worker proxy for HTTP and WebSocket connections
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams, origin: workerOrigin } = url;

    // Base origin for your server
    const BASE_ORIGIN = 'http://forestofgrins.noob.club:20659';

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      // Important: Keep using HTTP for the target URL, not WS
      const targetUrl = BASE_ORIGIN + pathname;

      return fetch(targetUrl, {
        headers: request.headers,
        method: request.method,
        // WebSocket option for Cloudflare
        cf: { webSocket: true }
      });
    }

    // Handle regular HTTP requests
    const targetUrlParam = searchParams.get('url');
    let targetUrl;
    let baseOrigin;

    if (targetUrlParam) {
      // Full URL was passed
      const parsed = new URL(targetUrlParam);
      targetUrl = parsed.toString();
      baseOrigin = parsed.origin;
    } else {
      // Fall back to hardcoded origin
      baseOrigin = BASE_ORIGIN;
      targetUrl = baseOrigin + pathname;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': request.headers.get('User-Agent') || '',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: workerOrigin
      }
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Rewrite relative links
      html = html.replace(/(src|href)=["']([^"':]+)["']/g, (match, attr, path) => {
        const absUrl = new URL(path, targetUrl).toString();
        return `${attr}="${workerOrigin}/?url=${absUrl}"`;
      });

      // Add script to modify the WebSocket creation in main.js
      html = html.replace(
        '</head>',
        `
        <script>
          // Override the WebSocket function in main.js
          (function() {
            // Store original WebSocket constructor
            const OriginalWebSocket = window.WebSocket;
            
            // Replace WebSocket constructor
            window.WebSocket = function(url) {
              console.log('WebSocket intercepted:', url);
              
              // If the code tries to create a WebSocket from the current location
              // (which it does in main.js with location.href.replace(/^http/, 'ws'))
              if (url.indexOf(location.origin) === 0 || 
                  url.indexOf('ws://') === 0 || 
                  url.indexOf('wss://') === 0) {
                // Instead, use our worker URL directly (which will handle the upgrade)
                return new OriginalWebSocket('${workerOrigin}' + location.pathname);
              }
              
              // For any other URLs, use the original constructor
              return new OriginalWebSocket(url);
            };
          })();
        </script>
      </head>`
      );

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Non-HTML assets
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
