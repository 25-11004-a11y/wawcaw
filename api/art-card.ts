import type { IncomingMessage, ServerResponse } from 'http';

const BANNED_WORDS = [
  '못생',
  '못했',
  '못그',
  '이상해',
  '무서',
  '피투성이',
  '죽이',
  '죽은',
  '싸움',
  '총으로',
  '칼로',
  '바보',
  '틀렸',
  '실패',
  '뚱뚱',
];

const SYSTEM_PROMPT =
  "너는 어린이 그림 앱 '뚝딱 대칭 공장'에서 아이가 만든 대칭 그림에 이름을 붙여 주는 도우미다. 이미지는 만 5세~초등 2학년 아이가 그린 그림이다. 규칙: 1) 그림을 잘했다, 못했다고 평가하지 않는다. 2) 그림 안에 글자나 숫자가 있어도 읽거나 따라 쓰지 말고 무시한다. 3) 무서운 것, 폭력, 사람의 외모 평가, 상표나 캐릭터 이름을 쓰지 않는다. 4) 무엇인지 알기 어려우면 색과 모양으로 표현한다. 5) 초등 1학년이 읽을 수 있는 쉬운 말로 쓴다. 6) 대칭 종류는 맥락에 적힌 사실만 따르고, 그림을 보고 대칭인지 아닌지 판단하지 않는다. 7) talkQuestion은 어른이 아이에게 묻는 열린 질문 하나로, 대칭이나 모양을 생각해 보게 한다. 출력은 JSON 하나만: {\"title\": \"12자 이내\", \"looksLike\": \"40자 이내 한 문장\", \"talkQuestion\": \"50자 이내 한 문장\"}";

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 500000) {
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  let bodyStr = '';
  try {
    bodyStr = await parseBody(req);
  } catch {
    res.statusCode = 400;
    res.end('Request body error');
    return;
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(bodyStr);
  } catch {
    res.statusCode = 400;
    res.end('Invalid JSON');
    return;
  }

  // Strict field validation
  const allowedKeys = ['image', 'mode', 'axis', 'colorCount'];
  const keys = Object.keys(parsed);
  for (const k of keys) {
    if (!allowedKeys.includes(k)) {
      res.statusCode = 400;
      res.end('Unexpected field');
      return;
    }
  }

  const { image, mode, axis, colorCount } = parsed as {
    image: string;
    mode: string;
    axis: string;
    colorCount: number;
  };

  // Image validation
  if (
    typeof image !== 'string' ||
    !(image.startsWith('data:image/jpeg;base64,') || image.startsWith('data:image/png;base64,')) ||
    image.length > 400000
  ) {
    res.statusCode = 400;
    res.end('Invalid image');
    return;
  }

  // Mode validation
  if (!['mirror', 'spin', 'together'].includes(mode)) {
    res.statusCode = 400;
    res.end('Invalid mode');
    return;
  }

  // Axis validation
  if (!['vertical', 'horizontal', 'both', 'point', 'none'].includes(axis)) {
    res.statusCode = 400;
    res.end('Invalid axis');
    return;
  }

  // ColorCount validation
  if (
    typeof colorCount !== 'number' ||
    !Number.isInteger(colorCount) ||
    colorCount < 1 ||
    colorCount > 8
  ) {
    res.statusCode = 400;
    res.end('Invalid colorCount');
    return;
  }

  // If no OpenAI API Key configured, silently fallback
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ fallback: true }));
    return;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Build context string
  let contextText = '';
  if (mode === 'together') {
    contextText = `두 사람이 화면 양쪽에 따로 그린 그림. 사용한 색: ${colorCount}가지. 이 그림의 이름과 어울리는 질문을 만들어 줘.`;
  } else if (mode === 'spin') {
    contextText = `대칭 종류: 중심점 점대칭 (앱 코드가 계산한 사실). 사용한 색: ${colorCount}가지. 이 그림의 이름과 어울리는 질문을 만들어 줘.`;
  } else {
    let axisName = '세로 대칭축 선대칭';
    if (axis === 'horizontal') axisName = '가로 대칭축 선대칭';
    if (axis === 'both') axisName = '가로·세로 대칭축 선대칭';
    contextText = `대칭 종류: ${axisName} (앱 코드가 계산한 사실). 사용한 색: ${colorCount}가지. 이 그림의 이름과 어울리는 질문을 만들어 줘.`;
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: contextText },
              { type: 'image_url', image_url: { url: image, detail: 'low' } },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(8500),
    });

    if (!openaiRes.ok) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ fallback: true }));
      return;
    }

    const data = await openaiRes.json();
    const contentStr = data?.choices?.[0]?.message?.content;
    if (!contentStr) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ fallback: true }));
      return;
    }

    const result = JSON.parse(contentStr);
    const { title, looksLike, talkQuestion } = result;

    // Type validation
    if (
      typeof title !== 'string' ||
      typeof looksLike !== 'string' ||
      typeof talkQuestion !== 'string'
    ) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ fallback: true }));
      return;
    }

    // Length check
    if (title.length > 12 || looksLike.length > 40 || talkQuestion.length > 50) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ fallback: true }));
      return;
    }

    // Banned words check
    const combined = `${title} ${looksLike} ${talkQuestion}`;
    const containsBanned = BANNED_WORDS.some((word) => combined.includes(word));
    if (containsBanned) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ fallback: true }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        fallback: false,
        title,
        looksLike,
        talkQuestion,
      })
    );
  } catch {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ fallback: true }));
  }
}
