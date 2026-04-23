/**
 * Phase 78 Task 10.4 — RFC-4180 CSV parser (single source of truth).
 *
 * Before this module existed, two duplicated `parseCSV` helpers (in
 * `src/app/api/contacts/import/route.ts` and
 * `src/app/api/leads/import/route.ts`) used the same broken approach:
 * they split the input on `\r?\n` FIRST, then parsed quoted fields within
 * each "line". That's not RFC-4180 — a quoted field can legally contain
 * embedded CR/LF bytes, and the naive split would shred any such field
 * into separate rows.
 *
 * RFC-4180 §2 rules implemented here:
 *   1. Fields are separated by commas.
 *   2. Records are separated by CRLF (we also accept LF and CR alone).
 *   3. A field may be wrapped in double-quotes.
 *   4. A double-quoted field may contain commas, CR, LF, or doubled
 *      double-quotes (""). Doubled double-quotes are un-escaped to a
 *      single double-quote in the emitted field value.
 *   5. An unquoted field does not contain commas, CR, LF, or double-quotes
 *      — but we tolerate interior quotes in unquoted fields (treat them as
 *      literal bytes) to match the leniency of Excel / Sheets exports.
 *
 * This implementation is a single-pass state machine over the input
 * characters. It does NOT call split() on the whole input up-front, so an
 * embedded newline inside a quoted field is preserved byte-exact rather
 * than causing the record boundary to shift.
 *
 * Exposes two entry points:
 *
 *   - `parseCsv(text)` → raw `string[][]`. Header row (if any) is just
 *     the first row; callers decide what it means.
 *   - `parseCsvWithHeaders(text)` → `Record<string,string>[]` using the
 *     first row as headers. Normalizes headers to snake_case (lowercases,
 *     converts non-alphanum to `_`, collapses runs, trims leading/trailing
 *     `_`). Drops blank / whitespace-only rows. Pads short rows with empty
 *     strings; truncates over-long rows to the header count.
 *
 * Scope discipline: this is a pure CSV parser. It does not:
 *   - accept a custom delimiter (always comma)
 *   - accept a custom quote character (always `"`)
 *   - handle BOM stripping (callers can trim if needed)
 *   - stream — operates on the whole string in memory. The callers'
 *     existing 10 MB `MAX_FILE_SIZE` gate bounds memory use for now.
 */

/** Parse a CSV string into an array of rows, each an array of field values. */
export function parseCsv(input: string): string[][] {
  if (input.length === 0) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input.charCodeAt(i);

    if (inQuotes) {
      if (ch === 0x22 /* " */) {
        // A doubled-quote inside a quoted field is an escaped literal quote;
        // a lone closing quote ends the quoted section.
        if (i + 1 < n && input.charCodeAt(i + 1) === 0x22) {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      // Any other byte (including CR/LF/comma) inside quotes is literal data.
      field += input[i];
      i += 1;
      continue;
    }

    // Outside quotes — comma, record terminator, opening quote, or literal byte.
    if (ch === 0x2c /* , */) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (ch === 0x0d /* CR */) {
      // CR or CRLF → end of record.
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      // Consume the optional LF that follows a CR.
      if (i + 1 < n && input.charCodeAt(i + 1) === 0x0a) {
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }

    if (ch === 0x0a /* LF */) {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }

    if (ch === 0x22 /* " */ && field.length === 0) {
      // Opening quote only counts at the start of a field (after delimiter
      // or start of record). Mid-field quotes are treated as literal data —
      // this matches the leniency of Excel / Sheets exports and means CSVs
      // like `a,b"c,d` parse as `["a","b\"c","d"]`.
      inQuotes = true;
      i += 1;
      continue;
    }

    field += input[i];
    i += 1;
  }

  // Flush the final field / row. If the input ends exactly on a newline the
  // last row was already pushed and `field`/`row` are empty — skip the flush
  // so we don't emit a phantom trailing row of [""].
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop records that are purely whitespace — a single empty field like [""]
  // (from a blank line) or a row whose every cell is whitespace. Rows that
  // have multiple empty fields (e.g. `,,` → ["","",""]) are kept because the
  // CSV author explicitly wrote those commas.
  return rows.filter((r) => {
    if (r.length === 1) return r[0].trim().length > 0;
    return true;
  });
}

/**
 * Normalize a header cell to snake_case:
 *   - lowercase
 *   - non-alphanumeric → `_`
 *   - collapse runs of `_`
 *   - strip leading/trailing `_`
 */
export function normalizeCsvHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Parse CSV using the first row as headers. Returns one object per data
 * row. Headers are normalized via `normalizeCsvHeader`. Short rows are
 * padded with empty strings; over-long rows are truncated to the header
 * count (no runaway object keys from stray trailing commas).
 */
export function parseCsvWithHeaders(input: string): Record<string, string>[] {
  const rows = parseCsv(input);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeCsvHeader);
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue; // skip columns whose header normalized to empty
      obj[key] = (row[c] ?? "").toString();
    }
    out.push(obj);
  }
  return out;
}
