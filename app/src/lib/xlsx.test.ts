import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { colName, xlsx } from "./xlsx";

const sheetXml = (file: Uint8Array, n = 1) => strFromU8(unzipSync(file)[`xl/worksheets/sheet${n}.xml`]);

describe("xlsx", () => {
  it("names columns like Excel", () => {
    expect([1, 26, 27, 52, 53, 703].map(colName)).toEqual(["A", "Z", "AA", "AZ", "BA", "AAA"]);
  });

  it("packs the parts Excel needs, with every formula recalculated on open", () => {
    const files = unzipSync(xlsx([{ name: "Data", rows: [[{ v: "a" }]], filter: "A1:A1" }]));
    expect(Object.keys(files).sort()).toEqual(
      ["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]);
    const wb = strFromU8(files["xl/workbook.xml"]);
    expect(wb).toContain('fullCalcOnLoad="1"');
    expect(wb).toContain("'Data'!$A$1:$A$1");
  });

  it("escapes text, drops characters XML cannot hold and keeps formulas with their values", () => {
    const xml = sheetXml(xlsx([{ name: "S", rows: [[{ v: 'a < b & "c"\u0001' }, { v: 3 }, { f: 'COUNTIF(A1:A9,">=4")', v: 2 }, { f: 'IF(1,"x","y")', v: "x" }]] }]));
    expect(xml).toContain("a &lt; b &amp; &quot;c&quot;</t>");
    expect(xml).not.toContain("\u0001");
    expect(xml).toContain('<f>COUNTIF(A1:A9,&quot;&gt;=4&quot;)</f><v>2</v>');
    expect(xml).toContain('t="str"><f>IF(1,&quot;x&quot;,&quot;y&quot;)</f><v>x</v>');
  });

  it("writes dates as India wall-clock day numbers", () => {
    const xml = sheetXml(xlsx([{ name: "S", rows: [[{ v: new Date("2026-10-29T14:23:00Z") }]] }]));
    const day = Number(xml.match(/<v>([\d.]+)<\/v>/)![1]);
    const minutes = Math.round((day % 1) * 24 * 60);
    expect(Math.floor(day)).toBe(46324); // 29 Oct 2026
    expect(minutes).toBe(19 * 60 + 53); // 19:53 in India
  });
});
