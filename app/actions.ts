"use server";

import * as cheerio from "cheerio";
import {
  getEventDetail,
  requiresReauth,
  type EventDetail,
} from "@/lib/parsers/events";
import { parseEventPage } from "@/lib/parsers/event-details";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const ACCEPT_HTML =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";

type WebAuthResult =
  | { success: true; cookie: string }
  | { success: false; error: string };

function extractCookieHeader(setCookies: string[]): string {
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

export async function webAuthLogin(
  email: string,
  passwordBase64: string,
): Promise<WebAuthResult> {
  try {
    const password = atob(passwordBase64);
    const baseUrl = process.env.SC_BASE_URL!;
    const loginUrl = `${baseUrl}/login`;
    const loginPageUrl = `${loginUrl}?utc=p0700`;

    const getRes = await fetch(loginPageUrl, {
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT, Accept: ACCEPT_HTML },
    });
    if (!getRes.ok) {
      return { success: false, error: `Login page failed (${getRes.status})` };
    }

    const cookies = extractCookieHeader(getRes.headers.getSetCookie());
    const html = await getRes.text();
    const $ = cheerio.load(html);

    const csrf =
      $('input[name="_csrf"]').attr("value") ??
      html.match(/window\._token\s*=\s*\{\s*csrf:\s*"([^"]+)"/)?.[1];
    if (!csrf) {
      return { success: false, error: "CSRF token not found" };
    }

    const postRes = await fetch(loginUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Upgrade-Insecure-Requests": "1",
        Cookie: cookies,
        Origin: baseUrl,
        Referer: loginPageUrl,
        "User-Agent": USER_AGENT,
        Accept: ACCEPT_HTML,
      },
      body: new URLSearchParams({ email, password, _csrf: csrf }),
    });

    const location = postRes.headers.get("location");

    if (location?.includes("/login") || postRes.status >= 400) {
      return { success: false, error: "Invalid email or password" };
    }

    if (location) {
      const redirectUrl = new URL(location, baseUrl).toString();
      const redirectRes = await fetch(redirectUrl, {
        cache: "no-store",
        headers: { Cookie: cookies, Referer: loginPageUrl, "User-Agent": USER_AGENT },
      });
      await redirectRes.text();
    }

    return { success: true, cookie: cookies };
  } catch (err) {
    console.error("[webAuthLogin]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Login failed",
    };
  }
}

export async function fetchEvents(cookie: string): Promise<EventDetail[]> {
  const baseUrl = process.env.SC_BASE_URL!;
  const headers = {
    Cookie: cookie,
    "User-Agent": USER_AGENT,
  };

  const pages = [1, 2, 3];
  const results = await Promise.all(
    pages.map(async (page) => {
      const url = `${baseUrl}/event?page=${page}`;
      const res = await fetch(url, { cache: "no-store", headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch events page ${page}: ${res.status}`);
      }
      const html = await res.text();
      if (requiresReauth(html)) {
        throw new Error("SESSION_EXPIRED");
      }
      return getEventDetail(html);
    }),
  );

  return results.flat();
}

export async function fetchEventEditPage(
  cookie: string,
  eventId: string,
): Promise<any> {
  const baseUrl = process.env.SC_BASE_URL!;
  const url = `${baseUrl}/event/edit/${eventId}`;
  const headers = {
    Cookie: cookie,
    Referer: `${baseUrl}/event`,
    "User-Agent": USER_AGENT,
  };
  const res = await fetch(url, { cache: "no-store", headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch event edit page: ${res.status}`);
  }
  const html = await res.text();
  if (requiresReauth(html)) {
    throw new Error("SESSION_EXPIRED")
  }
  return parseEventPage(html);
}
