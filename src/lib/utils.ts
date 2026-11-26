export async function computePortalHash(
  registrationNumber: string,
  password: string,
): Promise<string> {
  const normalized = `${registrationNumber.trim().toUpperCase()}:${password.trim()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSecureId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${cleanPrefix}_${Date.now()}_${hex}`;
}

export function generateActorPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
  return `UFW-${code}`;
}

export function buildProfileShareUrl(registrationNumber: string): string {
  const url = new URL(window.location.origin);
  url.searchParams.set('member', registrationNumber.trim());
  return url.toString();
}

export async function compressImageToDataUrl(
  file: File,
  maxDimension = 480,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file selected.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        if (compressed.length > 380000) {
          resolve(canvas.toDataURL('image/jpeg', 0.62));
        } else {
          resolve(compressed);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export interface ParsedVideo {
  type: 'youtube' | 'vimeo' | 'direct' | 'external';
  embedUrl: string;
  autoThumbnail?: string;
}

export function sanitizeHttpUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function parseVideoEmbed(rawUrl: string): ParsedVideo {
  const safeUrl = sanitizeHttpUrl(rawUrl);
  if (!safeUrl) {
    return { type: 'external', embedUrl: '' };
  }

  try {
    const parsed = new URL(safeUrl);
    const host = parsed.hostname.toLowerCase();

    // YouTube
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = parsed.pathname.slice(1).split('/')[0] || '';
      } else if (parsed.pathname.includes('/shorts/')) {
        videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
      } else if (parsed.pathname.includes('/embed/')) {
        videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
      if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          autoThumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    }

    // Vimeo
    if (host.includes('vimeo.com')) {
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match?.[1]) {
        return {
          type: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${match[1]}`,
        };
      }
    }

    // Direct video file
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(parsed.pathname)) {
      return {
        type: 'direct',
        embedUrl: safeUrl,
      };
    }

    return {
      type: 'external',
      embedUrl: safeUrl,
    };
  } catch {
    return { type: 'external', embedUrl: '' };
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'UF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
