import { strToU8, zipSync } from "fflate";

// A small .xlsx writer: inline strings, numbers, dates, formulas with their computed values (so phone previews that
// never calculate still show numbers), a fixed set of Arial styles, column widths, frozen panes and filters.
// Excel recalculates every formula when the file opens.

export type Style = "text" | "cell" | "head" | "wrap" | "date" | "pct" | "dec1" | "dec2" | "bold" | "title" | "note";
export type Cell = null | { v?: string | number | Date | null; f?: string; s?: Style };
export type Sheet = { name: string; rows: (Cell[] | { cells: Cell[]; height?: number })[]; cols?: number[]; freeze?: string; filter?: string; merges?: string[] };

const STYLES: Style[] = ["text", "cell", "head", "wrap", "date", "pct", "dec1", "dec2", "bold", "title", "note"];
const IST_OFFSET_MS = 5.5 * 3600_000;

// XML-safe text: control characters XML cannot hold are dropped, a lone surrogate half becomes U+FFFD.
const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "\ufffd")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function colName(n: number): string {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

/** Excel's day number for a moment, shown as India wall-clock time. */
const serial = (d: Date) => (d.getTime() + IST_OFFSET_MS) / 86_400_000 + 25569;

function cellXml(ref: string, c: Cell): string {
  if (!c) return "";
  const s = ` s="${STYLES.indexOf(c.s ?? (c.v instanceof Date ? "date" : "text"))}"`;
  const v = c.v;
  if (c.f) {
    const f = `<f>${esc(c.f)}</f>`;
    if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${s}>${f}<v>${v}</v></c>`;
    if (typeof v === "string") return `<c r="${ref}"${s} t="str">${f}<v>${esc(v)}</v></c>`;
    return `<c r="${ref}"${s}>${f}</c>`;
  }
  if (v == null || v === "") return `<c r="${ref}"${s}/>`;
  if (v instanceof Date) return `<c r="${ref}"${s}><v>${serial(v)}</v></c>`;
  if (typeof v === "number") return Number.isFinite(v) ? `<c r="${ref}"${s}><v>${v}</v></c>` : `<c r="${ref}"${s}/>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

function sheetXml(sh: Sheet): string {
  const rows = sh.rows.map((r, i) => {
    const { cells, height } = Array.isArray(r) ? { cells: r, height: undefined } : r;
    const ht = height ? ` ht="${height}" customHeight="1"` : "";
    return `<row r="${i + 1}"${ht}>${cells.map((c, j) => cellXml(`${colName(j + 1)}${i + 1}`, c)).join("")}</row>`;
  }).join("");
  const freeze = sh.freeze?.match(/^([A-Z]+)(\d+)$/);
  let pane = "";
  if (freeze) {
    const xs = freeze[1].split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    const ys = Number(freeze[2]) - 1;
    const active = xs && ys ? "bottomRight" : ys ? "bottomLeft" : "topRight";
    pane = `<pane${xs ? ` xSplit="${xs}"` : ""}${ys ? ` ySplit="${ys}"` : ""} topLeftCell="${sh.freeze}" activePane="${active}" state="frozen"/>`;
  }
  const cols = sh.cols?.length ? `<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const merges = sh.merges?.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
    + `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>`
    + `<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>`
    + (sh.filter ? `<autoFilter ref="${sh.filter}"/>` : "") + merges + `</worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
  + `<numFmts count="2"><numFmt numFmtId="164" formatCode="dd mmm yyyy hh:mm"/><numFmt numFmtId="165" formatCode="0.0"/></numFmts>`
  + `<fonts count="5">`
  + `<font><sz val="10"/><name val="Arial"/><family val="2"/></font>`
  + `<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>`
  + `<font><b/><sz val="10"/><name val="Arial"/><family val="2"/></font>`
  + `<font><b/><sz val="14"/><color rgb="FF1F2C7A"/><name val="Arial"/><family val="2"/></font>`
  + `<font><i/><sz val="9"/><color rgb="FF555555"/><name val="Arial"/><family val="2"/></font>`
  + `</fonts>`
  + `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>`
  + `<fill><patternFill patternType="solid"><fgColor rgb="FF1F2C7A"/><bgColor indexed="64"/></patternFill></fill></fills>`
  + `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>`
  + `<border><left/><right/><top/><bottom style="thin"><color rgb="FFC8CBDD"/></bottom><diagonal/></border></borders>`
  + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
  + `<cellXfs count="${STYLES.length}">`
  + `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` // text
  + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="top"/></xf>` // cell
  + `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>` // head
  + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` // wrap
  + `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment vertical="top"/></xf>` // date
  + `<xf numFmtId="9" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>` // pct
  + `<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>` // dec1
  + `<xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>` // dec2
  + `<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>` // bold
  + `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>` // title
  + `<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` // note
  + `</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export function xlsx(sheets: Sheet[]): Uint8Array {
  const names = sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  const filters = sheets.map((s, i) => s.filter
    ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name)}'!${s.filter.replace(/([A-Z]+)(\d+)/g, "$$$1$$$2")}</definedName>` : "").join("");
  const rels = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
      + `<Default Extension="xml" ContentType="application/xml"/>`
      + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
      + `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
      + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
      + `</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + `<sheets>${names}</sheets>${filters ? `<definedNames>${filters}</definedNames>` : ""}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}`
      + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(STYLES_XML),
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s)); });
  return zipSync(files, { level: 6 });
}
