import * as cheerio from "cheerio";
import { parseEventTitle } from "@/lib/utils";

export enum Role {
  SPV = "SPV",
  PIC = "PIC",
  Member = "Member",
}

export type EventInfo = {
  eventId: string | null;
  name: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  showUrl: string | null;
  editUrl: string | null;
  locked: boolean;
};

const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();

/**
 * Check if the HTML response indicates the session has expired
 * (i.e. the user was redirected to a login page).
 */
export const requiresReauth = (html: string): boolean => {
  const $ = cheerio.load(html);
  const bodyText = normalize($("body").text());
  return bodyText.includes("Sign in");
};

const getActionLinks = ($container: cheerio.Cheerio<any>) => {
  return $container
    .children("a")
    .toArray()
    .map((el) => {
      const $a = $container.find(el);

      return {
        text: normalize($a.text()),
        href: $a.attr("href") ?? null,
      };
    });
};

/**
 * Determine role from actions visible inside cards
 *
 * SPV:
 * - Clone
 * - Report
 * - Tally Count
 *
 * Member:
 * - Missing one or more of those
 *
 * PIC ignored for now.
 */
export const getRole = (html: string): Role => {
  const $ = cheerio.load(html);

  const firstCard = $(".card").first();

  if (!firstCard.length) {
    return Role.Member;
  }

  const actions = getActionLinks(firstCard.find(".container"));

  const labels = new Set(actions.map((a) => a.text.toLowerCase()));

  const isSPV =
    labels.has("clone") && labels.has("report") && labels.has("tally count");

  return isSPV ? Role.SPV : Role.Member;
};

/**
 * Parse events list
 */
export const parseEventDetail = (html: string): EventInfo[] => {
  const $ = cheerio.load(html);
  const role = getRole(html);

  return $(".card")
    .toArray()
    .map((card) => {
      const $container = $(card).find(".container");

      const children = $container.contents().filter((_, el) => {
        if (el.type === "text") {
          return normalize($(el).text()).length > 0;
        }

        return true;
      });

      // 1. first child = <i>
      const lockIcon = children.eq(0);
      const locked = lockIcon.is("i") && lockIcon.hasClass("fa-lock");

      // 2. second child = <b> or <a>
      const titleNode = children.eq(1);

      let title = "";
      let showUrl: string | null = null;

      if (titleNode.is("a")) {
        title = normalize(titleNode.text());

        if (role === Role.SPV) {
          showUrl = titleNode.attr("href") ?? null;
        }
      } else if (titleNode.is("b")) {
        title = normalize(titleNode.text());
      }

      const parsed = parseEventTitle(title);

      // 3. third child = location text
      const location = normalize(children.eq(2).text());

      // 5. action links
      const actions = getActionLinks($container);

      const editUrl =
        actions.find((a) => a.text.toLowerCase().includes("edit"))?.href ??
        null;

      // derive id from edit url
      const eventId =
        editUrl?.match(/\/event\/edit\/(\d+)/)?.[1] ??
        showUrl?.match(/\/show2\/(\d+)/)?.[1] ??
        null;

      return {
        eventId,
        name: parsed.name,
        date: parsed.date,
        time: parsed.time,
        location,
        showUrl,
        editUrl,
        locked,
      };
    });
};
