import * as cheerio from "cheerio";
import { normalizeBlocks } from "./user_block";

export type Area = {
  id: string | null;
  name: string | null;
  editUrl: string | null;
};

export type User = {
  fullName: string;
  email: string | null;
};

export type ParsedResult = {
  areas: Area[];
  users: User[];
  userBlocks: any;
};

function decodeCfEmail(encoded: string): string {
  const key = parseInt(encoded.slice(0, 2), 16);

  let result = "";

  for (let i = 2; i < encoded.length; i += 2) {
    result += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
  }

  return result;
}

function extractUsers($: cheerio.CheerioAPI): User[] {
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

function extractAreas($: cheerio.CheerioAPI): Area[] {
  const areaGroup = $("#edit")
    .find(".form-group")
    .filter((_, el) => $(el).find("h2").first().text().includes("Area"))
    .first();

  if (!areaGroup.length) return [];

  return areaGroup
    .find("table tbody tr")
    .map((_, row): Area => {
      const $row = $(row);

      const name =
        $row.find("td").eq(0).find("input").first().val()?.toString().trim() ??
        null;

      const editUrl =
        $row.find("td").eq(1).find('a[href*="/area/edit/"]').attr("href") ??
        null;

      const id = editUrl?.match(/\/area\/edit\/(\d+)/)?.[1] ?? null;

      return {
        id,
        name,
        editUrl,
      };
    })
    .get();
}

function extractUserBlocks($: cheerio.CheerioAPI): any {
  for (const script of $('script').toArray()) {
    const content = $(script).html() ?? '';

    const match = content.match(
      /var\s+blocks\s*=\s*(\[[\s\S]*?\])\s*;/
    );

    if (match) {
      return JSON.parse(match[1]);
    }
  }

  throw new Error('blocks variable not found');
}

export function parseEventPage(html: string): ParsedResult {
  const $ = cheerio.load(html);

  console.log("ParseEventPage:", html);

  const blocksObject = extractUserBlocks($);
  const userBlocks = normalizeBlocks(blocksObject);

  return {
    areas: extractAreas($),
    users: [],
    // users: extractUsers($), // TODO: For now not needed just yet.
    userBlocks: userBlocks,
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
