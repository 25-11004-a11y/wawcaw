import { Artwork, Session, Stroke, Point } from './constants';
import { isFirebaseConfigured, getFirestoreDb, getAnonymousUser } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

const ARTWORKS_STORAGE_KEY = 'symmetry_factory_artworks';
const SESSIONS_STORAGE_KEY = 'symmetry_factory_sessions';

/**
 * Returns current storage type: 'Firebase' or '이 기기'
 */
export function getStorageType(): 'Firebase' | '이 기기' {
  return isFirebaseConfigured() ? 'Firebase' : '이 기기';
}

/**
 * Optimizes stroke coordinates:
 * - Rounds coordinates to 3 decimal places
 * - If total points exceed 6000 (or payload approaches 900KB), downsamples points
 */
function optimizeStrokes(strokes: Stroke[]): Stroke[] {
  let totalPoints = 0;
  for (const s of strokes) {
    totalPoints += s.points.length;
  }

  // Downsample if points exceed 6000
  let downsampleStep = totalPoints > 6000 ? Math.ceil(totalPoints / 5000) : 1;

  // Rough size check for 900KB limit
  const approxSize = JSON.stringify(strokes).length;
  if (approxSize > 850000) {
    downsampleStep = Math.max(downsampleStep, 3);
  }

  return strokes.map((s) => {
    let pts: Point[] = [];
    if (s.kind === 'brush') {
      pts = s.points.filter((_, idx) => {
        if (idx === 0 || idx === s.points.length - 1) return true;
        return idx % downsampleStep === 0;
      });
    } else {
      pts = s.points;
    }

    const roundedPts: Point[] = pts.map((p) => ({
      x: Math.round(p.x * 1000) / 1000,
      y: Math.round(p.y * 1000) / 1000,
    }));

    return {
      ...s,
      size: Math.round(s.size * 1000) / 1000,
      points: roundedPts,
    };
  });
}

// ----------------- LocalStorage Fallbacks -----------------
function saveArtworkLocal(artwork: Artwork): Artwork {
  try {
    const raw = localStorage.getItem(ARTWORKS_STORAGE_KEY);
    const artworks: Artwork[] = raw ? JSON.parse(raw) : [];
    const existingIdx = artworks.findIndex((a) => a.id === artwork.id);

    if (existingIdx >= 0) {
      artworks[existingIdx] = artwork;
    } else {
      artworks.unshift(artwork);
    }
    localStorage.setItem(ARTWORKS_STORAGE_KEY, JSON.stringify(artworks));
  } catch (err) {
    console.warn('LocalStorage saveArtwork failed:', err);
  }
  return artwork;
}

function listArtworksLocal(): Artwork[] {
  try {
    const raw = localStorage.getItem(ARTWORKS_STORAGE_KEY);
    if (!raw) return [];
    const artworks: Artwork[] = JSON.parse(raw);
    artworks.sort((a, b) => b.createdAt - a.createdAt);
    return artworks;
  } catch {
    return [];
  }
}

function getArtworkLocal(id: string): Artwork | null {
  try {
    const raw = localStorage.getItem(ARTWORKS_STORAGE_KEY);
    if (!raw) return null;
    const artworks: Artwork[] = JSON.parse(raw);
    return artworks.find((a) => a.id === id) || null;
  } catch {
    return null;
  }
}

function deleteArtworkLocal(id: string): boolean {
  try {
    const raw = localStorage.getItem(ARTWORKS_STORAGE_KEY);
    if (!raw) return false;
    const artworks: Artwork[] = JSON.parse(raw);
    const filtered = artworks.filter((a) => a.id !== id);
    localStorage.setItem(ARTWORKS_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

function saveSessionLocal(session: Session): void {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const sessions: Session[] = raw ? JSON.parse(raw) : [];
    sessions.push(session);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore
  }
}

function listSessionsLocal(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ----------------- Public Storage API -----------------

/**
 * Save an artwork (Firebase Firestore if available, otherwise localStorage)
 */
export async function saveArtwork(
  artworkData: Omit<Artwork, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<Artwork> {
  const id = artworkData.id || `art_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const createdAt = artworkData.createdAt || Date.now();

  const optimized: Artwork = {
    ...artworkData,
    id,
    createdAt,
    strokes: optimizeStrokes(artworkData.strokes),
  };

  if (isFirebaseConfigured()) {
    try {
      const user = await getAnonymousUser();
      const db = getFirestoreDb();
      if (user && db) {
        const artDocRef = doc(db, 'users', user.uid, 'artworks', id);
        await setDoc(artDocRef, optimized);
        return optimized;
      }
    } catch (err) {
      console.warn('Firestore saveArtwork failed, falling back to local:', err);
    }
  }

  return saveArtworkLocal(optimized);
}

/**
 * List all artworks sorted newest first
 */
export async function listArtworks(): Promise<Artwork[]> {
  if (isFirebaseConfigured()) {
    try {
      const user = await getAnonymousUser();
      const db = getFirestoreDb();
      if (user && db) {
        const artworksCol = collection(db, 'users', user.uid, 'artworks');
        const q = query(artworksCol, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list: Artwork[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Artwork);
        });
        return list;
      }
    } catch (err) {
      console.warn('Firestore listArtworks failed, falling back to local:', err);
    }
  }

  return listArtworksLocal();
}

/**
 * Get a single artwork by ID
 */
export async function getArtwork(id: string): Promise<Artwork | null> {
  if (isFirebaseConfigured()) {
    try {
      const user = await getAnonymousUser();
      const db = getFirestoreDb();
      if (user && db) {
        const artDocRef = doc(db, 'users', user.uid, 'artworks', id);
        const docSnap = await getDoc(artDocRef);
        if (docSnap.exists()) {
          return docSnap.data() as Artwork;
        }
      }
    } catch (err) {
      console.warn('Firestore getArtwork failed, falling back to local:', err);
    }
  }

  return getArtworkLocal(id);
}

/**
 * Delete an artwork by ID
 */
export async function deleteArtwork(id: string): Promise<boolean> {
  if (isFirebaseConfigured()) {
    try {
      const user = await getAnonymousUser();
      const db = getFirestoreDb();
      if (user && db) {
        const artDocRef = doc(db, 'users', user.uid, 'artworks', id);
        await deleteDoc(artDocRef);
        return true;
      }
    } catch (err) {
      console.warn('Firestore deleteArtwork failed, falling back to local:', err);
    }
  }

  return deleteArtworkLocal(id);
}

/**
 * Save a gameplay play session
 */
export async function saveSession(session: Session): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      const user = await getAnonymousUser();
      const db = getFirestoreDb();
      if (user && db) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const sessDocRef = doc(db, 'users', user.uid, 'sessions', sessionId);
        await setDoc(sessDocRef, session);
        return;
      }
    } catch (err) {
      console.warn('Firestore saveSession failed, falling back to local:', err);
    }
  }

  saveSessionLocal(session);
}

/**
 * List all gameplay play sessions
 */
export async function listSessions(): Promise<Session[]> {
  if (isFirebaseConfigured()) {
    try {
      const user = await getAnonymousUser();
      const db = getFirestoreDb();
      if (user && db) {
        const sessCol = collection(db, 'users', user.uid, 'sessions');
        const q = query(sessCol, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const list: Session[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Session);
        });
        return list;
      }
    } catch (err) {
      console.warn('Firestore listSessions failed, falling back to local:', err);
    }
  }

  return listSessionsLocal();
}

/**
 * Clear all data (for developer debugging tool)
 */
export async function clearAllData(): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      const user = await getAnonymousUser();
      const db = getFirestoreDb();
      if (user && db) {
        const artworksCol = collection(db, 'users', user.uid, 'artworks');
        const artSnaps = await getDocs(artworksCol);
        for (const d of artSnaps.docs) {
          await deleteDoc(d.ref);
        }

        const sessCol = collection(db, 'users', user.uid, 'sessions');
        const sessSnaps = await getDocs(sessCol);
        for (const s of sessSnaps.docs) {
          await deleteDoc(s.ref);
        }
      }
    } catch (err) {
      console.warn('Firestore clearAllData failed:', err);
    }
  }

  try {
    localStorage.removeItem(ARTWORKS_STORAGE_KEY);
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
