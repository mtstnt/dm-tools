"use server";

import * as cheerio from "cheerio";
import {
  getEventDetail,
  requiresReauth,
  type EventDetail,
} from "@/lib/parsers/events";
import { parseEventPage, type ParsedResult } from "@/lib/parsers/event-details";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

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

    const loginPageUrl = `${baseUrl}/login?utc=p0700`;

    //
    // STEP 1 — Load login page
    //
    const getRes = await fetch(loginPageUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
    });

    if (!getRes.ok) {
      return {
        success: false,
        error: `Login page failed (${getRes.status})`,
      };
    }

    const initialCookies = getRes.headers.getSetCookie();
    const loginCookie = extractCookieHeader(initialCookies);
    const html = await getRes.text();

    const $ = cheerio.load(html);

    const csrf =
      $('input[name="_csrf"]').attr("value") ??
      html.match(/window\._token\s*=\s*\{\s*csrf:\s*"([^"]+)"/)?.[1];

    console.log("[GET] csrf:", csrf);

    if (!csrf) {
      return {
        success: false,
        error: "CSRF token not found",
      };
    }

    //
    // STEP 2 — Login
    //
    const postRes = await fetch(`${baseUrl}/login`, {
      method: "POST",

      redirect: "manual",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded",

        Cookie: loginCookie,

        Origin: baseUrl,

        Referer: loginPageUrl,

        "User-Agent": USER_AGENT,

        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",

        "Upgrade-Insecure-Requests": "1",
      },

      body: new URLSearchParams({
        email,
        password,
        _csrf: csrf,
      }),
    });

    const location = postRes.headers.get("location");

    //
    // STEP 3 — Failed login
    //
    if (location?.includes("/login") || postRes.status >= 400) {
      const body = await postRes.text();

      console.log(body.substring(0, 300));

      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    //
    // STEP 4 — Follow redirect manually
    //
    if (location) {
      const redirectUrl = new URL(location, baseUrl).toString();

      console.log("[REDIRECT]", redirectUrl);

      const redirectRes = await fetch(redirectUrl, {
        headers: {
          Cookie: loginCookie,

          Referer: loginPageUrl,

          "User-Agent": USER_AGENT,
        },
      });
      await redirectRes.text();
    }

    //
    // STEP 5 — Success
    //
    console.log("[SUCCESS]", loginCookie);

    return {
      success: true,
      cookie: loginCookie,
    };
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
      const res = await fetch(url, { headers });
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
  console.log("[fetchEventEditPage] → GET", url);
  console.log("sessionCookie", cookie);
  const res = await fetch(url, { headers, credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to fetch event edit page: ${res.status}`);
  }
  const html = await res.text();
  console.log(res.headers.get("location"));
  console.log(html);

  console.log("Parsing the page...");
  const parseResult = parseEventPage(html);
  console.log("Parse result", parseResult);

  // if (requiresReauth(html)) {
  //   throw new Error("SESSION_EXPIRED")
  // }
  return Promise.resolve(true);
}

export async function fetchEventShowPage(
  cookie: string,
  eventId: string,
): Promise<{ success: boolean; status: number; html: string }> {
  const baseUrl = process.env.SC_BASE_URL!;
  const url = `${baseUrl}/event/show2/${eventId}`;
  const headers = {
    Cookie: cookie,
    Referer: `${baseUrl}/event`,
    "User-Agent": USER_AGENT,
  };
  console.log("[fetchEventShowPage] → GET", url);
  const res = await fetch(url, { headers, credentials: "include" });
  console.log("[fetchEventShowPage] status:", res.status);
  if (!res.ok) {
    throw new Error(`Failed to fetch event show page: ${res.status}`);
  }
  const html = await res.text();
  return { success: true, status: res.status, html };
}
