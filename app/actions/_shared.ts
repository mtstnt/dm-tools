export type LegacyWebContext = {
  cookie: string | null;
  csrf: string;
};

export type WebAuthResult =
  | { success: true; cookie: string }
  | { success: false; error: string };

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
export const ACCEPT_HTML =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";

export type WebFetchResult = {
  code: number;
  headers: Headers;
  body: string;
};

export type WebFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  redirect?: RequestRedirect;
  cache?: RequestCache;
};

export async function webFetch(
  tag: string,
  url: string,
  ctx: LegacyWebContext,
  opts: WebFetchOptions = {},
): Promise<WebFetchResult> {
  const { method = "GET", headers = {}, body, redirect, cache = "no-store" } = opts;

  const mergedHeaders: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: ACCEPT_HTML,
    ...(ctx.cookie && { Cookie: ctx.cookie }),
    ...headers,
  };

  console.log(`[${tag}] ${method}`, url);
  console.log(`[${tag}] req headers:`, mergedHeaders);
  if (body) console.log(`[${tag}] req body:`, body);

  const res = await fetch(url, {
    method,
    headers: mergedHeaders,
    ...(body && { body }),
    ...(redirect && { redirect }),
    cache,
  });

  const resBody = await res.text();

  console.log(`[${tag}] res status:`, res.status);
  console.log(`[${tag}] res headers:`, logHeaders(res.headers));
  console.log(`[${tag}] res body length:`, resBody.length, "chars");

  return { code: res.status, headers: res.headers, body: resBody };
}

export function extractCookieHeader(setCookies: string[]): string {
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

function logHeaders(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}
