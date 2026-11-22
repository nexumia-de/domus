// Addresses of the WebDAV adapter: a base address plus a relative path of
// the app's own making. Every segment is encoded and `.`/`..` are refused,
// so a path can never leave the folder the user configured.

/** The segments of a relative path; throws for an empty path or a `.`/`..` segment. */
export function pathSegments(path: string): string[] {
  const segments = path.split('/').filter((s) => s !== '');
  if (segments.length === 0) throw new RangeError('The path is empty');
  for (const s of segments) {
    if (s === '.' || s === '..') throw new RangeError(`The path has a "${s}" segment`);
  }
  return segments;
}

const base = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

/** The address of a file: the base address and the encoded path. */
export function fileUrl(baseUrl: string, path: string): string {
  return `${base(baseUrl)}/${pathSegments(path).map(encodeURIComponent).join('/')}`;
}

/**
 * The folders above a file, outermost first, each with a trailing slash (the form MKCOL
 * wants). A file directly in the base folder has none.
 */
export function folderUrls(baseUrl: string, path: string): string[] {
  const encoded = pathSegments(path).slice(0, -1).map(encodeURIComponent);
  return encoded.map((_, i) => `${base(baseUrl)}/${encoded.slice(0, i + 1).join('/')}/`);
}
