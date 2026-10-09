import { Platform, Share } from 'react-native';

export interface ShareResult {
  success: boolean;
  method: 'share' | 'clipboard' | 'none';
  message: string;
}

export const DEFAULT_BASE_URL = 'https://pestanoah.github.io/SolitaireClient';

/**
 * Builds a shareable web URL for the given game seed and optional draw count.
 */
export function generateShareUrl(seed: string, drawCount?: 1 | 3): string {
  let base = DEFAULT_BASE_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    base = `${window.location.origin}${window.location.pathname}`;
  }

  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const params = new URLSearchParams();
  params.set('seed', seed);
  if (drawCount && drawCount !== 1) {
    params.set('draw', String(drawCount));
  }

  return `${cleanBase}/?${params.toString()}`;
}

/**
 * Parses seed and draw mode parameters from a given URL string or the current window location.
 */
export function parseSeedFromUrl(urlString?: string): { seed: string; drawCount?: 1 | 3 } | null {
  try {
    let search = '';
    let hash = '';

    if (urlString) {
      const parsed = new URL(urlString, 'http://localhost');
      search = parsed.search;
      hash = parsed.hash;
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      search = window.location.search || '';
      hash = window.location.hash || '';
    }

    // Check search query string first: ?seed=xyz&draw=3
    let params = new URLSearchParams(search);
    let seed = params.get('seed');
    let draw = params.get('draw') || params.get('drawCount');

    // If not found in search, check hash: #seed=xyz or #?seed=xyz
    if (!seed && hash) {
      const hashQueryIndex = hash.indexOf('?');
      if (hashQueryIndex !== -1) {
        params = new URLSearchParams(hash.slice(hashQueryIndex + 1));
      } else {
        params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      }
      seed = params.get('seed');
      if (!draw) draw = params.get('draw') || params.get('drawCount');
    }

    if (!seed || seed.trim() === '') {
      return null;
    }

    const drawCount: 1 | 3 | undefined = draw === '3' ? 3 : draw === '1' ? 1 : undefined;

    return {
      seed: seed.trim(),
      drawCount,
    };
  } catch {
    return null;
  }
}

/**
 * Copies text to the clipboard across Web and Native platforms.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to execCommand below
    }
  }

  // Fallback for Web if navigator.clipboard is unavailable or restricted
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) return true;
    } catch {
      // Ignored
    }
  }

  return false;
}

/**
 * Shares the game deck URL with another player.
 * Prioritizes the Web Share API or native share sheet; falls back to copying to clipboard.
 */
export async function shareGameDeck(seed: string, drawCount?: 1 | 3): Promise<ShareResult> {
  const shareUrl = generateShareUrl(seed, drawCount);
  const shareTitle = 'Klondike Solitaire Challenge';
  const shareText = `Can you beat this Solitaire deal? Seed: ${seed}`;

  // 1. Web Share API (Mobile Safari, Mobile Chrome, Safari macOS)
  if (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      return { success: true, method: 'share', message: 'Challenge shared successfully!' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, method: 'none', message: 'Share dismissed' };
      }
      // If Web Share API failed, fall back to copying to clipboard
    }
  }

  // 2. React Native Share (iOS / Android)
  if (Platform.OS !== 'web') {
    try {
      const result = await Share.share({
        title: shareTitle,
        message: `${shareText}\n${shareUrl}`,
        url: shareUrl,
      });
      if (result.action === Share.sharedAction) {
        return { success: true, method: 'share', message: 'Challenge shared successfully!' };
      }
      return { success: false, method: 'none', message: 'Share dismissed' };
    } catch {
      // Fall back to clipboard
    }
  }

  // 3. Fallback: Copy URL to clipboard
  const copied = await copyToClipboard(shareUrl);
  if (copied) {
    return { success: true, method: 'clipboard', message: 'Challenge link copied to clipboard!' };
  }

  return {
    success: false,
    method: 'none',
    message: 'Could not share or copy link',
  };
}

/**
 * Cleans the seed query parameters from the browser address bar without refreshing.
 */
export function cleanUrlParams(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
    try {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } catch {
      // Ignored
    }
  }
}
