import type { IncomingMessage, ServerResponse } from 'http';
import { XMLParser } from 'fast-xml-parser';

export interface PatternItem {
  id: string;
  name: string;
  era: string;
  category: string;
  imageUrl: string;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set CORS and headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'patterns_unavailable' }));
    return;
  }

  try {
    const params = new URLSearchParams({
      serviceKey,
      numOfRows: '50',
      pageNo: '1',
    });

    const apiUrl = `http://api.kcisa.kr/openapi/service/rest/meta4/getKCPG0504?${params.toString()}`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        Accept: 'application/xml, text/xml',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!apiRes.ok) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'patterns_unavailable' }));
      return;
    }

    const xmlData = await apiRes.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
    });

    const parsed = parser.parse(xmlData);
    const body = parsed?.response?.body || parsed?.rfc3066?.body || parsed?.body;
    let items = body?.items?.item || [];

    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    const patternList: PatternItem[] = [];

    for (const item of items) {
      // Map according to 공공데이터포털 전통문양 field specification
      const id = String(item.seq || item.cnId || item.regNo || item.title || patternList.length + 1);
      const name = String(item.title || item.name || '전통 문양');
      const era = String(item.temporal || item.period || item.era || '조선');
      const category = String(item.type || item.spatial || item.category || '전통문양');
      const rawImage = item.thumbnail || item.referenceIdentifier || item.imageUrl || '';

      if (rawImage && typeof rawImage === 'string') {
        // If image is http, route via our secure proxy /api/pattern-image
        let safeImageUrl = rawImage;
        if (rawImage.startsWith('http://')) {
          safeImageUrl = `/api/pattern-image?url=${encodeURIComponent(rawImage)}`;
        }

        patternList.push({
          id,
          name,
          era,
          category,
          imageUrl: safeImageUrl,
        });
      }
    }

    if (patternList.length === 0) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'patterns_unavailable' }));
      return;
    }

    // Pick today's pattern: (days since 1970-01-01 KST) % list.length
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDays = Math.floor((now.getTime() + kstOffset) / (24 * 60 * 60 * 1000));
    const todayIndex = kstDays % patternList.length;
    const today = patternList[todayIndex];

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.end(
      JSON.stringify({
        today,
        list: patternList.slice(0, 50),
        source: '한국문화정보원',
      })
    );
  } catch (err) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'patterns_unavailable' }));
  }
}
