/** InMedia 圖片代理：逾時、大小上限、按 IP 簡易限流（isolate 內記憶體，配合 CF WAF 更佳） */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
/** 首屏可同時載入大量封面；60 太易 429 */
const RATE_LIMIT_PER_MINUTE = 400;
const RATE_WINDOW_MS = 60_000;
const MAX_BUCKETS = 5000;

type Bucket = { count: number; windowStart: number };
const rateBuckets = new Map<string, Bucket>();

function pruneRateBuckets(now: number): void {
  if (rateBuckets.size <= MAX_BUCKETS) return;
  for (const [k, v] of rateBuckets) {
    if (now - v.windowStart > RATE_WINDOW_MS * 2) rateBuckets.delete(k);
  }
}

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || now - b.windowStart >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= RATE_LIMIT_PER_MINUTE) return false;
  b.count++;
  return true;
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("CF-Connecting-IP") ||
    headers.get("True-Client-IP") ||
    headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * 由 Worker 代拉 `www.inmediahk.net/files/…`，避免瀏覽器被 Sucuri 擋。
 */
export async function proxyInmediaImage(
  targetHref: string,
  incomingHeaders: Headers,
): Promise<Response> {
  const ip = getClientIp(incomingHeaders);
  pruneRateBuckets(Date.now());
  if (!rateLimitOk(ip)) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(targetHref, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://www.inmediahk.net/",
        "Accept-Language": "zh-HK,zh-Hant;q=0.9,en;q=0.7",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!r.ok) return new Response("Upstream error", { status: 502 });
    const ct = r.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return new Response("Not an image", { status: 502 });

    const cl = r.headers.get("content-length");
    if (cl) {
      const n = parseInt(cl, 10);
      if (Number.isFinite(n) && n > MAX_IMAGE_BYTES) {
        return new Response("Payload Too Large", { status: 413 });
      }
    }

    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      return new Response("Payload Too Large", { status: 413 });
    }

    return new Response(buf, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return new Response("Gateway Timeout", { status: 504 });
    }
    return new Response("Bad Gateway", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
