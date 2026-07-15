import { EventArea, EventAssignedUser, EventDetail, EventUser } from "@/types/event";
import * as cheerio from "cheerio";

const ALLOWED_USER_IDS = new Set([
  3086, 4554, 5457, 5456, 5918, 1644, 6456, 4553, 6203, 5907,
  1399, 6844, 5444, 4636, 5882, 5443, 6870, 6860, 5464, 5458,
  3735, 6874, 5436, 5912, 6199, 5439, 5875, 1631, 5437, 1682,
  4709, 6871, 6445, 4678, 1685, 6846,
])

export type RawEvent = {
  id: number;
  name: string;
  date: string;
  location: string;
}

export type RawEventAllUsers = {
  id: number;
  fullName: string;
  email: string;
}

export type RawEventUsersWrapper = {
  allUsers: RawEventAllUsers[],
  assignedUserIds: number[];
}

export type RawBlock = RawBlockStandard | RawBlockAllBlock;

export type RawBlockStandard = {
  users:       RawEventDetailUser[];
  area_id:     number;
  event_id:    number;
  id:          number;
  name:         string;
  row:         number;
  column:      number;
  chairs_data: Array<number[]>;
  real_data:   Array<number[]>;
  createdAt:   Date;
  updatedAt:   Date;
}

export type RawBlockAllBlock = {
  name: "All Block";
  user: "All Block";
};

export type RawEventDetailUser = {
  id:          number;
  name:        string;
  email:       string;
  phone:       string;
  login_token: null;
  createdAt:   Date;
  updatedAt:   Date;
}

export function parseEventAllUsers(html: string): EventUser[] {
  const $ = cheerio.load(html);
  const eventUsers = extractUsers($);
  return eventUsers.allUsers.map(u => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
  }));
}

export function parseEventPage(id: number, html: string): EventDetail {
  const $ = cheerio.load(html);

  const csrf = $('input[name="_csrf"]').attr("value") ??
    html.match(/window\._token\s*=\s*\{\s*csrf:\s*"([^"]+)"/)?.[1] ?? "";

  const event = extractEvent(id, $);
  const areasWithoutBlocks = extractAreas($);
  const rawBlocks = extractRawBlocks($);
  const rawStandardBlocks = rawBlocks.filter(e => e.name !== "All Block") as RawBlockStandard[];
  const eventUsers = extractUsers($);

  const areas: EventArea[] = areasWithoutBlocks.map(area => {
    return {
      ...area,
      blocks: rawStandardBlocks
        .filter(rawBlock => rawBlock.area_id == area.id)
        .map(rawBlock => ({
          id: rawBlock.id,
          name: rawBlock.name,
          row: rawBlock.row,
          column: rawBlock.column,
          userIds: rawBlock.users.map(u => u.id),
          chairs: rawBlock.chairs_data,
        })),
    }
  });

  const assignedUsers = new Set(eventUsers.assignedUserIds);

  const blocksByUser = new Map<number, number[]>();

  for (const block of rawStandardBlocks) {
    for (const user of block.users) {
      const userBlockMapping = blocksByUser.get(user.id);
      if (!userBlockMapping) {
        blocksByUser.set(user.id, [block.id]);
      } else {
        userBlockMapping.push(block.id);
      }
    }
  }

  const users: EventAssignedUser[] = eventUsers.allUsers
    .filter(u => assignedUsers.has(u.id))
    .map(u => ({
      ...u,
      assignedBlockIds: blocksByUser.get(u.id) ?? [],
    }));

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    location: event.location,

    areas: areas,
    users: users,

    allUsers: eventUsers.allUsers.filter(u => ALLOWED_USER_IDS.has(u.id)),

    csrf: csrf,
  }
}

function extractUsers($: cheerio.CheerioAPI): RawEventUsersWrapper {
  const fromUsers = $("#users li")
    .toArray()
    .map((li) => {
      const el = $(li);
      const encoded = el.find("a.__cf_email__").attr("data-cfemail");
      return {
        id: Number(el.attr("data-id")),
        fullName: el.find("span").first().text().trim(),
        email: encoded ? decodeCfEmail(encoded) : "",
      };
    });

  const fromEventUsers = $("#event_users li")
    .toArray()
    .map((li) => {
      const el = $(li);
      const encoded = el.find("a.__cf_email__").attr("data-cfemail");
      return {
        id: Number(el.attr("data-id")),
        fullName: el.find("span").first().text().trim(),
        email: encoded ? decodeCfEmail(encoded) : "",
      };
    });

  const merged = new Map<number, RawEventAllUsers>();
  for (const user of fromUsers) {
    if (user.id) merged.set(user.id, user);
  }
  for (const user of fromEventUsers) {
    if (user.id && !merged.has(user.id)) {
      merged.set(user.id, user);
    }
  }

  return {
    allUsers: [...merged.values()],
    assignedUserIds: fromEventUsers.map(u => u.id),
  }
}

function extractAreas($: cheerio.CheerioAPI): EventArea[] {
  const areaGroup = $("#edit")
    .find(".form-group")
    .filter((_, el) => $(el).find("h2").first().text().includes("Area"))
    .first();

  if (!areaGroup.length) return [];

  return areaGroup
    .find("table tbody tr")
    .map((_, row): EventArea => {
      const $row = $(row);
      const name = $row.find("td").eq(0).find("input").first().val()?.toString().trim() ?? "";
      const editUrl = $row.find("td").eq(1).find('a[href*="/area/edit/"]').attr("href") ?? "";
      const id = parseInt(editUrl?.match(/\/area\/edit\/(\d+)/)?.[1] ?? "0");

      return {
        id,
        name,
        blocks: [],
      };
    })
    .get();
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

export function extractEvent(id: number, $: cheerio.CheerioAPI): RawEvent {
  const form = $("#update_event");

  return {
    id: id,
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

export function extractRawBlocks($: cheerio.CheerioAPI): RawBlock[] {
  for (const script of $("script").toArray()) {
    const content = $(script).html() ?? "";

    const match = content.match(/var\s+blocks\s*=\s*(\[[\s\S]*?\])\s*;/);

    if (match) {
      return JSON.parse(match[1]);
    }
  }

  throw new Error("blocks variable not found");
}

function decodeCfEmail(encoded: string): string {
  const key = parseInt(encoded.slice(0, 2), 16);

  let result = "";

  for (let i = 2; i < encoded.length; i += 2) {
    result += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
  }

  return result;
}
