import * as cheerio from "cheerio";

export type Area = {
  id: string | null;
  name: string | null;
  editUrl: string | null;
};

export type User = {
  fullName: string;
  email: string | null;
};

export type UserBlock = {
  user: {
    id: string;
    name: string;
  };
  blocks: {
    id: string;
    name: string;
  }[];
};

export type ParsedResult = {
  areas: Area[];
  users: User[];
  userBlocks: UserBlock[];
};

/**
 * Cloudflare email decoder
 */
function decodeCfEmail(encoded: string): string {
  if (!encoded) return "";

  const key = parseInt(encoded.slice(0, 2), 16);

  let result = "";

  for (let i = 2; i < encoded.length; i += 2) {
    result += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
  }

  return result;
}

function extractUsers($: cheerio.CheerioAPI): User[] {
  const users: User[] = [];

  // Cloudflare obfuscated
  $("#event_users_tab tr").each((_, row) => {
    const tds = $(row).find("td");

    const fullName = tds.eq(0).text().trim();

    let email: string | null = null;

    const cf = tds.eq(1).find("a.__cf_email__").attr("data-cfemail");

    if (cf) {
      email = decodeCfEmail(cf);
    } else {
      email = tds.eq(1).text().trim() || null;
    }

    if (fullName) {
      users.push({
        fullName,
        email,
      });
    }
  });

  return users;
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

function extractUserBlocks($: cheerio.CheerioAPI): UserBlock[] {
  return $("#userBased tr")
    .map((_, row): UserBlock | null => {
      const $row = $(row);

      const userAnchor = $row.find("td").eq(0).find("a");

      const userId = userAnchor.attr("data-user-id");

      const userName = userAnchor.text().trim();

      if (!userId || !userName) {
        return null;
      }

      const blocks = $row
        .find("td")
        .eq(1)
        .find(".btn-success")
        .map((_, block) => ({
          id: $(block).attr("data-block-id") ?? "",
          name: $(block).text().trim(),
        }))
        .get();

      return {
        user: {
          id: userId,
          name: userName,
        },
        blocks,
      };
    })
    .get()
    .filter(Boolean) as UserBlock[];
}

export function parseEventPage(html: string): ParsedResult {
  const $ = cheerio.load(html);

  console.log("ParseEventPage:", html);

  return {
    areas: extractAreas($),
    users: extractUsers($),
    userBlocks: extractUserBlocks($),
  };
}
