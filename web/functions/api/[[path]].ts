/**
 * Same-origin proxy: browser calls /api/* on Pages; this forwards to the Worker (no CORS).
 * Update WORKER_API if your Worker URL changes.
 */
const WORKER_API =
  "https://hk-news-rss-worker.cloudflare-underfeed523.workers.dev";

export async function onRequest(context: {
  request: Request;
}): Promise<Response> {
  const url = new URL(context.request.url);
  const target = `${WORKER_API}${url.pathname}${url.search}`;
  return fetch(new Request(target, context.request));
}
