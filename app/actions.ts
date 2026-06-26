"use server"

import * as cheerio from "cheerio"
import { getEventDetail, requiresReauth, type EventDetail } from "@/lib/parsers/events"
import { parseEventPage, type ParsedResult } from "@/lib/parsers/event-details"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

type WebAuthResult =
  | { success: true; cookie: string }
  | { success: false; error: string }

function extractCookieHeader(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(";")[0])
    .join("; ")
}

export async function webAuthLogin(
  email: string,
  passwordBase64: string
): Promise<WebAuthResult> {
  try {
    const password = atob(passwordBase64)
    const baseUrl = process.env.SC_BASE_URL!

    //
    // STEP 1 — Load login page
    //
    const getRes = await fetch(`${baseUrl}/login`, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    })

    if (!getRes.ok) {
      return {
        success: false,
        error: `Login page failed (${getRes.status})`,
      }
    }

    const initialCookies = getRes.headers.getSetCookie()

    console.log("[GET] cookies:", initialCookies)

    const html = await getRes.text()

    const $ = cheerio.load(html)

    const csrf =
      $('input[name="_csrf"]').attr("value") ??
      html.match(
        /window\._token\s*=\s*\{\s*csrf:\s*"([^"]+)"/
      )?.[1]

    if (!csrf) {
      return {
        success: false,
        error: "CSRF token not found",
      }
    }

    //
    // STEP 2 — Login (FOLLOW redirects)
    //
    const loginCookies = extractCookieHeader(initialCookies)

    const postRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Cookie: loginCookies,
        Origin: baseUrl,
        Referer: `${baseUrl}/login`,
      },
      body: new URLSearchParams({
        email,
        password,
        _csrf: csrf,
      }),
    })

    const finalUrl = postRes.url

    console.log("[POST] final url:", finalUrl)
    console.log(
      "[POST] final cookies:",
      postRes.headers.getSetCookie()
    )

    //
    // STEP 3 — Merge cookies
    //
    const responseCookies = postRes.headers.getSetCookie()

    const finalCookie =
      responseCookies.length > 0
        ? extractCookieHeader(responseCookies)
        : loginCookies

    //
    // STEP 4 — Validate success
    //
    if (
      finalUrl.includes("/login") ||
      postRes.status >= 400
    ) {
      const body = await postRes.text()

      console.log(
        "[POST] login failed body:",
        body.substring(0, 300)
      )

      return {
        success: false,
        error: "Invalid email or password",
      }
    }

    console.log("[SUCCESS] cookie:", finalCookie)

    return {
      success: true,
      cookie: finalCookie,
    }
  } catch (err) {
    console.error("[webAuthLogin]", err)

    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Login failed",
    }
  }
}

export async function fetchEvents(cookie: string): Promise<EventDetail[]> {
  const baseUrl = process.env.SC_BASE_URL!
  const headers = {
    Cookie: cookie,
    "User-Agent": USER_AGENT,
  }

  const pages = [1, 2, 3]
  const results = await Promise.all(
    pages.map(async (page) => {
      const url = `${baseUrl}/event?page=${page}`
      const res = await fetch(url, { headers })
      if (!res.ok) {
        throw new Error(`Failed to fetch events page ${page}: ${res.status}`)
      }
      const html = await res.text()
      if (requiresReauth(html)) {
        throw new Error("SESSION_EXPIRED")
      }
      return getEventDetail(html)
    })
  )

  return results.flat()
}

export async function fetchEventEditPage(
  cookie: string,
  eventId: string,
): Promise<any> {
  const baseUrl = process.env.SC_BASE_URL!
  const url = `${baseUrl}/event/edit/${eventId}`
  const headers = {
    Cookie: cookie,
    Referer: `${baseUrl}/event`,
    "User-Agent": USER_AGENT,
  }
  console.log("[fetchEventEditPage] → GET", url)
  console.log("sessionCookie", cookie);
  const res = await fetch(url, { headers, credentials: "include" })
  if (!res.ok) {
    throw new Error(`Failed to fetch event edit page: ${res.status}`)
  }
  const html = await res.text()
  console.log(res.headers.get('location'));
  console.log(html.substring(400, 500))
  // if (requiresReauth(html)) {
  //   throw new Error("SESSION_EXPIRED")
  // }
  // return parseEventPage(html)
  return Promise.resolve(true);
}
