/**
 * Make a new cloudflare worker and paste this in!
 *
 * Make sure to change baseOrigin to your server url
 * example: http://servername.noob.club:20659
 *
 * Will be the url of your webmap
 * */

export default {
  async fetch(request, env, ctx) {
    const { pathname, searchParams, origin: workerOrigin } = new URL(request.url);

    const targetUrlParam = searchParams.get('url');
    let targetUrl;
    let baseOrigin;

    if (targetUrlParam) {
      // Full URL was passed
      const parsed = new URL(targetUrlParam);
      targetUrl = parsed.toString();
      baseOrigin = parsed.origin;
    } else {
      // Fall back to stored origin or hardcoded one
      // This assumes you're loading assets like /tile.webp *after* loading the initial ?url=... page
      baseOrigin = 'http://forestofgrins.noob.club:20659'; // fallback only if needed
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

      // Rewrite relative src/href links to go back through the proxy
      html = html.replace(/(src|href)=["']([^"':]+)["']/g, (match, attr, path) => {
        const absUrl = new URL(path, targetUrl).toString();
        return `${attr}="${workerOrigin}/?url=${absUrl}"`;
      });

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Non-HTML assets (images, js, etc.)
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
