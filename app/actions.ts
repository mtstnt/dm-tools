"use server"

import * as cheerio from "cheerio"
import { parseEvents, type Event } from "@/lib/parsers/events"

interface WebAuthResult {
  success: boolean
  cookie?: string
  error?: string
}

export async function webAuthLogin(
  email: string,
  passwordBase64: string
): Promise<WebAuthResult> {
  const password = atob(passwordBase64)
  try {
    // Step 1: GET /login to retrieve CSRF token + session cookie
    const baseUrl = process.env.SC_BASE_URL!
    const getUrl = `${baseUrl}/login`
    const getHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    }

    console.log("[webAuthLogin] → GET", getUrl)
    console.log("[webAuthLogin]   headers:", getHeaders)

    const getRes = await fetch(getUrl, { headers: getHeaders })

    console.log("[webAuthLogin] ← GET", getRes.status, getRes.statusText)
    console.log(
      "[webAuthLogin]   set-cookie:",
      getRes.headers.getSetCookie()
    )

    if (!getRes.ok) {
      console.log("[webAuthLogin] ✗ GET failed, status:", getRes.status)
      return { success: false, error: "Failed to load login page" }
    }

    const html = await getRes.text()

    console.log("[webAuthLogin]   html length:", html.length)
    console.log("[webAuthLogin]   html snippet:", html.slice(0, 300))

    // Extract CSRF token using Cheerio
    const $ = cheerio.load(html)
    let csrf = $('input[name="_csrf"]').attr("value")

    if (!csrf) {
      // Fallback: parse window._token from script tags
      const scriptMatch = html.match(
        /window\._token\s*=\s*\{\s*csrf:\s*"([^"]+)"/
      )
      csrf = scriptMatch?.[1]
    }

    console.log("[webAuthLogin]   csrf token:", csrf ?? "(not found)")

    if (!csrf) {
      return { success: false, error: "Could not find CSRF token" }
    }

    // Extract cookies from GET response (need sails.sid)
    const setCookieHeaders = getRes.headers.getSetCookie()
    const cookies = setCookieHeaders
      .map((header) => header.split(";")[0])
      .join("; ")

    console.log("[webAuthLogin]   cookies for POST:", cookies)

    // Step 2: POST /login with redirect: "manual"
    const postUrl = `${baseUrl}/login`
    const postHeaders = {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      Origin: baseUrl,
      Referer: `${baseUrl}/login`,
    }
    const postBody = new URLSearchParams({
      email,
      password,
      _csrf: csrf,
    })

    console.log("[webAuthLogin] → POST", postUrl)
    console.log("[webAuthLogin]   headers:", postHeaders)
    console.log(
      "[webAuthLogin]   body:",
      postBody.toString().replace(/password=[^&]+/, "password=***")
    )

    const postRes = await fetch(postUrl, {
      method: "POST",
      redirect: "manual",
      headers: postHeaders,
      body: postBody,
    })

    const location = postRes.headers.get("location")
    const setCookie = postRes.headers.get("set-cookie")

    console.log("[webAuthLogin] ← POST", postRes.status, postRes.statusText)
    console.log("[webAuthLogin]   location:", location)
    console.log("[webAuthLogin]   set-cookie:", setCookie)

    // Step 3: Check success
    // Success: Location "/" and Set-Cookie with sails.sid
    // Failure: Location "/login" (bad credentials)
    if (location === "/" && setCookie) {
      // Extract the sails.sid cookie value
      const sailsSid = setCookieHeaders
        .concat(setCookie ? [setCookie] : [])
        .find((c) => c.startsWith("sails.sid="))

      console.log("[webAuthLogin] ✓ Login successful, sails.sid:", sailsSid)

      if (sailsSid) {
        return { success: true, cookie: sailsSid.split(";")[0] }
      }

      // Even if we can't isolate sails.sid, the login succeeded
      return { success: true, cookie: setCookie.split(";")[0] }
    }

    console.log(
      "[webAuthLogin] ✗ Login failed, location:",
      location,
      "set-cookie:",
      setCookie
    )
    return { success: false, error: "Invalid email or password" }
  } catch (err) {
    console.error("[webAuthLogin] ✗ Exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Login request failed",
    }
  }
}

export async function fetchEvents(cookie: string): Promise<Event[]> {
  const baseUrl = process.env.SC_BASE_URL!
  const headers = {
    Cookie: cookie,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
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
      return parseEvents(html)
    })
  )

  return results.flat()
}
