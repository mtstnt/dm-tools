import * as cheerio from "cheerio";

export type BlockSeats = {
  row: number | null;
  col: number | null;
  data: number[][];
  updateUrl: string | null;
};

export function parseBlockSeats(html: string): BlockSeats {
  const $ = cheerio.load(html);
  const row = Number($("#row").val()?.toString()) || null;
  const col = Number($("#column").val()?.toString()) || null;
  const updateUrl = $("#update_block").attr("action") ?? null;

  let data: number[][] = [];

  $("script").each((_, script) => {
    const content = $(script).html() ?? "";

    const match = content.match(/var\s+data\s*=\s*(\[[\s\S]*?\]);/);

    if (match) {
      try {
        data = JSON.parse(match[1]);
      } catch {
        data = [];
      }
    }
  });

  return {
    row,
    col,
    data,
    updateUrl,
  };
}
