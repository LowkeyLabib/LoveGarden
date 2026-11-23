const publicTables = new Set(['seeds','gifts','decorations','store_catalog','fashion_catalog','fashion_variants','character_wardrobe','fashion_ownership','profiles']);

export function permitsPreviewRequest(path: string, method: string) {
 if (path === '/rest/v1/rpc/garden_clock') return method === 'POST';
 return (method === 'GET' || method === 'HEAD') && path.startsWith('/rest/v1/') && publicTables.has(path.slice('/rest/v1/'.length));
}

export const previewFetch: typeof fetch = (input, init) => {
 const request = new Request(input, init);
 if (!permitsPreviewRequest(new URL(request.url).pathname, request.method)) {
  return Promise.reject(new Error('This garden preview is read-only.'));
 }
 return fetch(request);
};
