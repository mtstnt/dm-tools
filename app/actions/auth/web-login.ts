"use server";

import * as cheerio from "cheerio";
import {
  type WebAuthResult,
  ACCEPT_HTML,
  extractCookieHeader,
  webFetch,
} from "@/app/actions/_shared";

export async function webLogin(
  email: string,
  passwordBase64: string,
): Promise<WebAuthResult> {
  try {
    const password = atob(passwordBase64);
    const baseUrl = process.env.SC_BASE_URL!;
    const loginUrl = `${baseUrl}/login`;
    const loginPageUrl = `${loginUrl}?utc=p0700`;

    const getRes = await webFetch("webLogin", loginPageUrl, {
      headers: { Accept: ACCEPT_HTML },
    });
    if (getRes.code >= 400) {
      return { success: false, error: `Login page failed (${getRes.code})` };
    }

    const cookies = extractCookieHeader(getRes.headers.getSetCookie());
    const $ = cheerio.load(getRes.body);

    const csrf =
      $('input[name="_csrf"]').attr("value") ??
      getRes.body.match(/window\._token\s*=\s*\{\s*csrf:\s*"([^"]+)"/)?.[1];
    if (!csrf) {
      return { success: false, error: "CSRF token not found" };
    }

    const postBody = new URLSearchParams({ email, password, _csrf: csrf });
    const postRes = await webFetch("webLogin", loginUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Upgrade-Insecure-Requests": "1",
        Cookie: cookies,
        Origin: baseUrl,
        Referer: loginPageUrl,
        Accept: ACCEPT_HTML,
      },
      body: postBody.toString(),
    });

    const location = postRes.headers.get("location");
    console.log("[webLogin] redirect:", location);

    if (location?.includes("/login") || postRes.code >= 400) {
      return { success: false, error: "Invalid email or password" };
    }

    if (location) {
      const redirectUrl = new URL(location, baseUrl).toString();
      await webFetch("webLogin:redirect", redirectUrl, {
        headers: { Cookie: cookies, Referer: loginPageUrl },
      });
    }

    return { success: true, cookie: cookies };
  } catch (err) {
    console.error("[webLogin]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Login failed",
    };
  }
}
