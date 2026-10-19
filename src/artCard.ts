import { ArtworkMode, ArtworkAxis, ArtCard } from './constants';

const DAILY_AI_LIMIT = 30;

function checkAndIncrementAiUsage(): boolean {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `symmetry_factory_ai_count_${today}`;
    const raw = localStorage.getItem(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= DAILY_AI_LIMIT) {
      return false;
    }
    localStorage.setItem(key, String(count + 1));
    return true;
  } catch {
    return true;
  }
}

/**
 * Generates the symmetry explanation sentence (strictly fixed by code).
 */
export function getSymmetrySentence(mode: ArtworkMode, axis: ArtworkAxis): string {
  if (mode === 'together') {
    return '두 사람이 함께 만든 작품이에요. 거울에 비추면 얼마나 닮았을까요?';
  }
  if (mode === 'spin') {
    return '가운데 점을 중심으로 반 바퀴 돌리면 처음 모양과 똑같아요.';
  }

  switch (axis) {
    case 'vertical':
      return '세로 대칭축을 따라 접으면 양쪽이 꼭 겹쳐요.';
    case 'horizontal':
      return '가로 대칭축을 따라 접으면 위아래가 꼭 겹쳐요.';
    case 'both':
      return '세로로 접어도, 가로로 접어도 겹쳐요. 그래서 반 바퀴 돌려도 똑같아요!';
    default:
      return '세로 대칭축을 따라 접으면 양쪽이 꼭 겹쳐요.';
  }
}

/**
 * Generates the dialogue question for parents/guardians.
 */
export function getGuardianQuestion(mode: ArtworkMode, axis: ArtworkAxis): string {
  if (mode === 'together') {
    return '누가 어느 쪽을 그렸는지 맞혀 볼까?';
  }
  if (mode === 'spin') {
    return '종이를 반 바퀴 돌려 보면 어떻게 보일까?';
  }

  switch (axis) {
    case 'vertical':
      return '가운데 선에 거울을 대면 어떤 모양이 보일까?';
    case 'horizontal':
      return '위쪽에 무엇을 더 그리면 아래쪽은 어떻게 될까?';
    case 'both':
      return '한 조각만 그렸는데 네 조각이 생긴 이유는 뭘까?';
    default:
      return '가운데 선에 거울을 대면 어떤 모양이 보일까?';
  }
}

/**
 * Generates the default artwork title.
 */
export function getDefaultTitle(mode: ArtworkMode): string {
  if (mode === 'together') {
    return '둘이 만든 작품';
  }
  if (mode === 'spin') {
    return '빙글빙글 작품';
  }
  return '반짝 거울 작품';
}

/**
 * Builds the default card when AI is unavailable or fails.
 */
export function getDefaultCard(
  mode: ArtworkMode,
  axis: ArtworkAxis,
  colorCount: number
): ArtCard {
  const validColorCount = Math.max(1, colorCount);
  return {
    title: getDefaultTitle(mode),
    description: `알록달록 ${validColorCount}가지 색으로 만든 무늬예요.`,
    symmetrySentence: getSymmetrySentence(mode, axis),
    question: getGuardianQuestion(mode, axis),
    isDefault: true,
    source: 'default',
  };
}

/**
 * Card creation service:
 * - Tries calling POST /api/art-card
 * - Enforces 10-second timeout and 30-per-day rate limit
 * - Falls back to default card on timeout, fallback flag, error, or rate limit
 */
export async function makeCard(
  imageDataUrl: string,
  mode: ArtworkMode,
  axis: ArtworkAxis,
  colorCount: number
): Promise<ArtCard> {
  const defaultCard = getDefaultCard(mode, axis, colorCount);

  // Check daily limit (max 30 AI generations per device per day)
  if (!checkAndIncrementAiUsage()) {
    return defaultCard;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); // 10s ceiling

    const res = await fetch('/api/art-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageDataUrl,
        mode,
        axis,
        colorCount,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return defaultCard;
    }

    const json = await res.json();
    if (json.fallback || !json.title || !json.looksLike || !json.talkQuestion) {
      return defaultCard;
    }

    return {
      title: json.title,
      description: json.looksLike,
      symmetrySentence: getSymmetrySentence(mode, axis), // strictly fixed by code
      question: json.talkQuestion,
      isDefault: false,
      source: 'ai',
    };
  } catch {
    return defaultCard;
  }
}
