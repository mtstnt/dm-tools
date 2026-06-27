import * as cheerio from "cheerio";

export type Block = {
  name: string | null;
  row: number | null;
  col: number | null;
  editUrl: string | null;
};

export function parseBlocks(html: string): Block[] {
  const $ = cheerio.load(html);

  return $("table tbody tr")
    .map((_, tr): Block => {
      const $row = $(tr);
      const cells = $row.find("td");

      const name =
        cells
          .eq(0)
          .find('input[type="text"]')
          .first()
          .val()
          ?.toString()
          .trim() ?? null;

      const rowValue = cells.eq(1).find("input").val()?.toString() ?? null;

      const colValue = cells.eq(2).find("input").val()?.toString() ?? null;

      const editUrl =
        cells.eq(3).find('a[href*="/block/edit/"]').attr("href") ?? null;

      return {
        name,
        row: rowValue ? Number(rowValue) : null,
        col: colValue ? Number(colValue) : null,
        editUrl,
      };
    })
    .get();
}
