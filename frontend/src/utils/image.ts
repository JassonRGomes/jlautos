const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

/**
 * Resolves an image URL to a full URL if it is a relative upload path,
 * or returns it as-is if it is a remote HTTP URL or base64 data string.
 */
export function getImageUrl(url: string | null | undefined, fallback = ''): string {
  if (!url) return fallback;
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  // Check if it is a backend upload path
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const formattedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${BACKEND_URL}${formattedUrl}`;
  }
  // Otherwise return as-is (e.g. for local frontend assets)
  return url;
}
