"use server";

import * as cheerio from "cheerio";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

function logHeaders(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

async function checkUserRole(email: string): Promise<{ allowed: boolean; role?: string; error?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const membersRef = collection(db, "members");
    const q = query(membersRef, where("email", "==", normalizedEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { allowed: false, error: "User not found in members list" };
    }

    const memberData = snap.docs[0].data();
    const role = memberData.role as string;

    if (role === "SPV" || role === "PIC") {
      return { allowed: true, role };
    }

    return { allowed: false, role, error: `Role "${role}" is not authorized. Only SPV or PIC can perform this action.` };
  } catch (err) {
    return { allowed: false, error: err instanceof Error ? err.message : "Failed to verify user role" };
  }
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

    const reqHeaders = { "User-Agent": USER_AGENT, Accept: ACCEPT_HTML };
    console.log("[webAuthLogin] GET", loginPageUrl);
    console.log("[webAuthLogin] req headers:", reqHeaders);
    const getRes = await fetch(loginPageUrl, {
      cache: "no-store",
      headers: reqHeaders,
    });
    console.log("[webAuthLogin] res status:", getRes.status);
    console.log("[webAuthLogin] res headers:", logHeaders(getRes.headers));
    if (!getRes.ok) {
      return { success: false, error: `Login page failed (${getRes.status})` };
    }

    const cookies = extractCookieHeader(getRes.headers.getSetCookie());
    const html = await getRes.text();
    console.log("[webAuthLogin] res body length:", html.length, "chars");
    const $ = cheerio.load(html);

    const csrf =
      $('input[name="_csrf"]').attr("value") ??
      html.match(/window\._token\s*=\s*\{\s*csrf:\s*"([^"]+)"/)?.[1];
    if (!csrf) {
      return { success: false, error: "CSRF token not found" };
    }

    const postBody = new URLSearchParams({ email, password, _csrf: csrf });
    const postHeaders = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Upgrade-Insecure-Requests": "1",
      Cookie: cookies,
      Origin: baseUrl,
      Referer: loginPageUrl,
      "User-Agent": USER_AGENT,
      Accept: ACCEPT_HTML,
    };
    console.log("[webAuthLogin] POST", loginUrl);
    console.log("[webAuthLogin] req headers:", postHeaders);
    console.log("[webAuthLogin] req body:", postBody.toString());
    const postRes = await fetch(loginUrl, {
      method: "POST",
      redirect: "manual",
      headers: postHeaders,
      body: postBody,
    });

    const location = postRes.headers.get("location");
    console.log("[webAuthLogin] res status:", postRes.status);
    console.log("[webAuthLogin] res headers:", logHeaders(postRes.headers));
    console.log("[webAuthLogin] redirect:", location);

    if (location?.includes("/login") || postRes.status >= 400) {
      return { success: false, error: "Invalid email or password" };
    }

    if (location) {
      const redirectUrl = new URL(location, baseUrl).toString();
      const redirHeaders = { Cookie: cookies, Referer: loginPageUrl, "User-Agent": USER_AGENT };
      console.log("[webAuthLogin] GET redirect:", redirectUrl);
      console.log("[webAuthLogin] redirect req headers:", redirHeaders);
      const redirectRes = await fetch(redirectUrl, {
        cache: "no-store",
        headers: redirHeaders,
      });
      const redirBody = await redirectRes.text();
      console.log("[webAuthLogin] redirect res status:", redirectRes.status);
      console.log("[webAuthLogin] redirect res headers:", logHeaders(redirectRes.headers));
      console.log("[webAuthLogin] redirect res body length:", redirBody.length, "chars");
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
  const reqHeaders = {
    Cookie: cookie,
    "User-Agent": USER_AGENT,
  };

  const pages = [1, 2, 3];
  const results = await Promise.all(
    pages.map(async (page) => {
      const url = `${baseUrl}/event?page=${page}`;
      console.log("[fetchEvents] GET", url);
      console.log("[fetchEvents] req headers:", reqHeaders);
      const res = await fetch(url, { cache: "no-store", headers: reqHeaders });
      const html = await res.text();
      console.log("[fetchEvents] page", page, "res status:", res.status);
      console.log("[fetchEvents] res headers:", logHeaders(res.headers));
      console.log("[fetchEvents] res body length:", html.length, "chars");
      if (!res.ok) {
        throw new Error(`Failed to fetch events page ${page}: ${res.status}`);
      }
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
  const reqHeaders = {
    Cookie: cookie,
    Referer: `${baseUrl}/event`,
    "User-Agent": USER_AGENT,
  };
  console.log("[fetchEventEditPage] GET", url);
  console.log("[fetchEventEditPage] req headers:", reqHeaders);
  const res = await fetch(url, { cache: "no-store", headers: reqHeaders });
  const html = await res.text();
  console.log("[fetchEventEditPage] res status:", res.status);
  console.log("[fetchEventEditPage] res headers:", logHeaders(res.headers));
  console.log("[fetchEventEditPage] res body length:", html.length, "chars");
  if (!res.ok) {
    throw new Error(`Failed to fetch event edit page: ${res.status}`);
  }
  if (requiresReauth(html)) {
    throw new Error("SESSION_EXPIRED")
  }
  return parseEventPage(html);
}

export async function updateUserBlocks(
  cookie: string,
  eventId: string,
  csrf: string,
  userIds: number[],
  blockIds: number[],
  userEmail: string,
): Promise<{ success: boolean; error?: string }> {
  // const roleCheck = await checkUserRole(userEmail);
  // console.log("[updateUserBlocks] role check:", roleCheck);

  // if (!roleCheck.allowed) {
  //   return { success: false, error: roleCheck.error ?? "Unauthorized" };
  // }

  const baseUrl = process.env.SC_BASE_URL!;
  const url = `${baseUrl}/event/update_users_blocks/${eventId}`;

  const params = new URLSearchParams();
  userIds.forEach((id) => params.append("users[]", String(id)));
  blockIds.forEach((id) => params.append("blocks[]", String(id)));
  params.append("_csrf", csrf);

  const reqHeaders = {
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookie,
    Referer: `${baseUrl}/event/edit/${eventId}`,
    "User-Agent": USER_AGENT,
  };
  console.log("[updateUserBlocks] POST", url);
  console.log("[updateUserBlocks] req headers:", reqHeaders);
  console.log("[updateUserBlocks] req body:", params.toString());
  const res = await fetch(url, {
    method: "POST",
    headers: reqHeaders,
    body: params.toString(),
  });
  const resBody = await res.text();
  console.log("[updateUserBlocks] res status:", res.status);
  console.log("[updateUserBlocks] res headers:", logHeaders(res.headers));
  console.log("[updateUserBlocks] res body:", resBody.slice(0, 500));

  if (!res.ok) {
    return { success: false, error: `Request failed (${res.status})` };
  }

  return { success: true };
}
