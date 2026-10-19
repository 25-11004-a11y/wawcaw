import type { IncomingMessage, ServerResponse } from 'http';

const ALLOWED_HOSTS = [
  'www.culture.go.kr',
  'culture.go.kr',
  'api.kcisa.kr',
  'data.culture.go.kr',
  'www.museum.go.kr',
  'museum.go.kr',
  'www.emuseum.go.kr',
  'emuseum.go.kr',
  'gongu.copyright.or.kr',
];

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const parsedUrl = new URL(req.url || '', 'http://localhost');
    const targetUrl = parsedUrl.searchParams.get('url');

    if (!targetUrl) {
      res.statusCode = 400;
      res.end('Missing url parameter');
      return;
    }

    const targetParsed = new URL(targetUrl);
    if (!ALLOWED_HOSTS.includes(targetParsed.hostname)) {
      res.statusCode = 400;
      res.end('Host not allowed');
      return;
    }

    const imageRes = await fetch(targetUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!imageRes.ok) {
      res.statusCode = imageRes.status;
      res.end('Failed to fetch image');
      return;
    }

    const contentType = imageRes.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      res.statusCode = 400;
      res.end('Not an image response');
      return;
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(buffer);
  } catch {
    res.statusCode = 400;
    res.end('Invalid request');
  }
}
