import * as cheerio from "cheerio";

export type Event = {
  id: string | null;
  date: string | null;
  time: string | null;
  eventName: string | null;
  location: string | null;
  seatCountUrl: string | null;
  editUrl: string | null;
};

export function parseEvents(html: string): Event[] {
  const $ = cheerio.load(html);

  return $(".card")
    .map((_, card): Event => {
      const $card = $(card);

      const header = $card.find("b").first().text().trim();

      // Examples:
      // "24 JUN 2026 / AOG TEEN / 16:00"
      // "20 JUN 2026 / EK VOLTAGE"
      const parts = header
        .split("/")
        .map((v) => v.trim())
        .filter(Boolean);

      const date = parts[0] ?? null;

      const hasTime =
        parts.length > 2 && /^\d{1,2}:\d{2}$/.test(parts.at(-1) ?? "");

      const time = hasTime ? (parts.at(-1) ?? null) : null;

      const eventName =
        parts.length > 1
          ? hasTime
            ? parts.slice(1, -1).join(" / ")
            : parts.slice(1).join(" / ")
          : null;

      const location =
        $card.find(".container > div").first().text().trim() || null;

      const seatCountUrl = $card.find("a.btn-success").attr("href") ?? null;

      const editUrl = $card.find("a.btn-warning").attr("href") ?? null;

      // Prefer edit URL, fallback to seat count URL
      const id =
        editUrl?.match(/\/event\/edit\/(\d+)/)?.[1] ??
        seatCountUrl?.match(/\/presence2\/(\d+)/)?.[1] ??
        null;

      return {
        id,
        date,
        time,
        eventName,
        location,
        seatCountUrl,
        editUrl,
      };
    })
    .get();
}
