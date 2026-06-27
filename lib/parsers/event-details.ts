import * as cheerio from "cheerio";
import { normalizeBlocks } from "./user_block";
import {
  EventDetailsAllUser,
  EventDetailsArea,
  EventDetailsData,
  EventDetailsEvent,
} from "@/types/event";

function decodeCfEmail(encoded: string): string {
  const key = parseInt(encoded.slice(0, 2), 16);

  let result = "";

  for (let i = 2; i < encoded.length; i += 2) {
    result += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
  }

  return result;
}

function extractUsers($: cheerio.CheerioAPI): EventDetailsAllUser[] {
  return $("#users li")
    .toArray()
    .map((li) => {
      const el = $(li);

      const encoded = el.find("a.__cf_email__").attr("data-cfemail");

      return {
        id: Number(el.attr("data-id")),
        fullName: el.find("span").first().text().trim(),
        email: encoded ? decodeCfEmail(encoded) : null,
      };
    });
}

function extractAreas($: cheerio.CheerioAPI): EventDetailsArea[] {
  const areaGroup = $("#edit")
    .find(".form-group")
    .filter((_, el) => $(el).find("h2").first().text().includes("Area"))
    .first();

  if (!areaGroup.length) return [];

  return areaGroup
    .find("table tbody tr")
    .map((_, row): EventDetailsArea => {
      const $row = $(row);

      const name =
        $row.find("td").eq(0).find("input").first().val()?.toString().trim() ??
        "";
      const editUrl =
        $row.find("td").eq(1).find('a[href*="/area/edit/"]').attr("href") ?? "";
      const id = editUrl?.match(/\/area\/edit\/(\d+)/)?.[1] ?? "0";

      return {
        id,
        name,
        editUrl,
      };
    })
    .get();
}

function extractUserBlocksAsRawJSONObject($: cheerio.CheerioAPI): any {
  for (const script of $("script").toArray()) {
    const content = $(script).html() ?? "";

    const match = content.match(/var\s+blocks\s*=\s*(\[[\s\S]*?\])\s*;/);

    if (match) {
      return JSON.parse(match[1]);
    }
  }

  throw new Error("blocks variable not found");
}

function getSelectedText($: cheerio.CheerioAPI, selector: string): string {
  const select = $(selector);

  if (!select.length) {
    return "";
  }

  const selected =
    select.find("option[selected]").first() ||
    select.find("option:selected").first();

  if (selected.length) {
    return selected.text().trim();
  }

  const value = select.val()?.toString();

  if (!value) {
    return "";
  }

  return select.find(`option[value="${value}"]`).first().text().trim() || "";
}

export function extractEvent($: cheerio.CheerioAPI): EventDetailsEvent {
  const form = $("#update_event");

  return {
    name: form.find('input[name="name"]').attr("value")?.trim() ?? "",
    date: form.find('input[name="event_date"]').attr("value")?.trim() ?? "",
    location: getSelectedText(
      $,
      [
        'select[name="churchcode"]',
        'select#churchcode',
      ].join(','),
    ),
  };
}

export function parseEventPage(html: string): EventDetailsData {
  const $ = cheerio.load(html);

  const blocksObject = extractUserBlocksAsRawJSONObject($);
  const userBlocks = normalizeBlocks(blocksObject);

  return {
    allUsers: [],
    // allUsers: extractUsers($), // TODO: For now not needed just yet.
    event: extractEvent($),
    users: userBlocks.users,
    areas: extractAreas($),
    blocks: userBlocks.blocks,
  };
}

// Extracts the block variable in thje script. Contains user block assignment.
export function extractBlocks(html: string): unknown[] {
  const $ = cheerio.load(html);

  for (const script of $("script").toArray()) {
    const content = $(script).html() ?? "";

    const match = content.match(/var\s+blocks\s*=\s*(\[[\s\S]*?\])\s*;/);

    if (match) {
      return JSON.parse(match[1]);
    }
  }

  throw new Error("blocks variable not found");
}
