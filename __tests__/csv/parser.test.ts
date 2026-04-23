/**
 * Phase 78 Task 10.4 contract: RFC-4180 CSV parser.
 *
 * Before this task, two duplicated `parseCSV` helpers (in
 * `src/app/api/contacts/import/route.ts` and
 * `src/app/api/leads/import/route.ts`) split the input on `\r?\n` BEFORE
 * handling quoted fields — which means a CSV like:
 *
 *     a,"b
 *     c",d
 *     e,f,g
 *
 * parsed as three broken rows (`a,"b` / `c",d` / `e,f,g`) instead of the
 * RFC-4180-correct two rows (`[a, "b\nc", d]` / `[e, f, g]`). Any CSV
 * exported from Excel / Google Sheets with a multi-line field (addresses,
 * notes) was silently shredded on import.
 *
 * This test locks the RFC-4180 contract against the single shared
 * `parseCsv` / `parseCsvWithHeaders` in `src/lib/csv/parser.ts`.
 */
import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvWithHeaders } from "@/lib/csv/parser";

describe("parseCsv — RFC-4180 core behaviour", () => {
  it("parses a simple header + one row", () => {
    const out = parseCsv("name,phone\nAlice,+15551234567\n");
    expect(out).toEqual([
      ["name", "phone"],
      ["Alice", "+15551234567"],
    ]);
  });

  it("handles embedded newline inside a double-quoted field", () => {
    // This is the canonical RFC-4180 case the naive split() parsers break on.
    const input = `a,"b\nc",d\ne,f,g`;
    expect(parseCsv(input)).toEqual([
      ["a", "b\nc", "d"],
      ["e", "f", "g"],
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    // RFC-4180 §2.7: a double-quote inside a quoted field is escaped as "".
    const input = `name,quote\nAlice,"She said ""hi"" today"\n`;
    expect(parseCsv(input)).toEqual([
      ["name", "quote"],
      ["Alice", 'She said "hi" today'],
    ]);
  });

  it("keeps commas inside quoted fields as literal data", () => {
    const input = `name,address\n"Smith, John","123 Main St, Apt 4"\n`;
    expect(parseCsv(input)).toEqual([
      ["name", "address"],
      ["Smith, John", "123 Main St, Apt 4"],
    ]);
  });

  it("treats CRLF line endings the same as LF", () => {
    const input = "a,b,c\r\nd,e,f\r\n";
    expect(parseCsv(input)).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  it("keeps CRLF line endings that are inside a quoted field", () => {
    // Excel on Windows writes multi-line cells with \r\n. The parser must
    // preserve the exact bytes inside the quoted field rather than eating them.
    const input = `a,"line1\r\nline2",c\n`;
    expect(parseCsv(input)).toEqual([
      ["a", "line1\r\nline2", "c"],
    ]);
  });

  it("preserves empty fields (trailing, leading, and consecutive)", () => {
    const input = `a,,b\n,,,\n`;
    expect(parseCsv(input)).toEqual([
      ["a", "", "b"],
      ["", "", "", ""],
    ]);
  });

  it("ignores a trailing newline — no phantom empty row", () => {
    expect(parseCsv("a,b\n")).toEqual([["a", "b"]]);
    expect(parseCsv("a,b\n\n")).toEqual([["a", "b"]]);
    expect(parseCsv("a,b")).toEqual([["a", "b"]]);
  });

  it("returns [] for empty or whitespace-only input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\n")).toEqual([]);
    expect(parseCsv("   \n  \n")).toEqual([]);
  });

  it("does not confuse a quote that appears mid-unquoted-field", () => {
    // If a field isn't opened with a quote, interior quotes are literal.
    const input = `a,b"c,d\n`;
    expect(parseCsv(input)).toEqual([["a", 'b"c', "d"]]);
  });

  it("handles a quoted field followed immediately by EOF (no trailing newline)", () => {
    const input = `a,"b,c"`;
    expect(parseCsv(input)).toEqual([["a", "b,c"]]);
  });
});

describe("parseCsvWithHeaders — header normalization + row zipping", () => {
  it("lowercases + snake-cases headers and zips each row to an object", () => {
    const out = parseCsvWithHeaders("Full Name,Phone Number\nAlice,+15551234567");
    expect(out).toEqual([
      { full_name: "Alice", phone_number: "+15551234567" },
    ]);
  });

  it("collapses runs of underscores from non-alphanum header chars", () => {
    const out = parseCsvWithHeaders("First--Name,E-Mail Address\nAlice,a@b.co");
    expect(out).toEqual([
      { first_name: "Alice", e_mail_address: "a@b.co" },
    ]);
  });

  it("strips leading / trailing underscores from normalized headers", () => {
    const out = parseCsvWithHeaders("__weird__,ok\nx,y");
    expect(out).toEqual([{ weird: "x", ok: "y" }]);
  });

  it("drops fully blank rows but keeps rows where every value is empty-string by design", () => {
    // A row that's just `,,` has 3 empty fields — user may have intended that.
    // A row that's just whitespace is dropped.
    const out = parseCsvWithHeaders("a,b,c\nx,y,z\n\n   \n,,\n");
    expect(out).toEqual([
      { a: "x", b: "y", c: "z" },
      { a: "", b: "", c: "" },
    ]);
  });

  it("preserves embedded-newline field values through header zipping", () => {
    const input = `name,notes\nAlice,"line1\nline2"\n`;
    expect(parseCsvWithHeaders(input)).toEqual([
      { name: "Alice", notes: "line1\nline2" },
    ]);
  });

  it("returns [] when there's no data row (header-only or empty)", () => {
    expect(parseCsvWithHeaders("name,phone\n")).toEqual([]);
    expect(parseCsvWithHeaders("")).toEqual([]);
  });

  it("pads a short row with empty strings for missing trailing columns", () => {
    const out = parseCsvWithHeaders("a,b,c\nx,y");
    expect(out).toEqual([{ a: "x", b: "y", c: "" }]);
  });

  it("ignores extra fields past the header count (no runaway object keys)", () => {
    const out = parseCsvWithHeaders("a,b\nx,y,z,zz");
    expect(out).toEqual([{ a: "x", b: "y" }]);
  });
});
