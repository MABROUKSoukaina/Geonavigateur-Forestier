import * as XLSX from 'xlsx';
import type { Placette, ColumnMapping } from '../types';

const isCsvFile = (file: File) => file.name.toLowerCase().endsWith('.csv');

// Auto-detect CSV delimiter by counting separators in the first line
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

// Convert string to XLSX WorkBook — handles both Excel and CSV
function fileToWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    if (isCsvFile(file)) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const firstLine = text.split('\n')[0];
          const delim = detectDelimiter(firstLine);
          // Pass delimiter directly to XLSX — cell values with commas (e.g. French decimals
          // like "33,4948559") are left as raw strings and handled later by toNum/toCoord
          const wb = XLSX.read(text, { type: 'string', FS: delim });
          resolve(wb);
        } catch (err) { reject(err); }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        try {
          resolve(XLSX.read(e.target?.result, { type: 'binary' }));
        } catch (err) { reject(err); }
      };
      reader.readAsBinaryString(file);
    }
  });
}

// Parse numeric value — handles both '.' and ',' as decimal separator
const toNum = (v: unknown): number => Number(String(v ?? '').replace(',', '.'));

// Scale integer-encoded coordinates independently.
// lat: assumes 2 integer digits (covers all inhabited latitudes 10–89°).
// lng: tries 1 integer digit first, then 2, then 3 — handles mixed precision where
//      some lng values use a different exponent than lat (e.g. repère coords in CSV).
function scaleLat(n: number): number {
  if (isNaN(n) || Math.abs(n) <= 90) return n;
  const digits = Math.floor(Math.log10(Math.abs(n))) + 1;
  return n / Math.pow(10, digits - 2);
}
function scaleLng(n: number): number {
  if (isNaN(n) || Math.abs(n) <= 180) return n;
  const digits = Math.floor(Math.log10(Math.abs(n))) + 1;
  for (let intDig = 1; intDig <= 3; intDig++) {
    const result = n / Math.pow(10, digits - intDig);
    if (Math.abs(result) <= 180) return result;
  }
  return n;
}

export function getExcelColumns(file: File): Promise<string[]> {
  return fileToWorkbook(file).then((wb) => {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
    return data.length > 0 ? (data[0] as unknown as string[]).map(String) : [];
  });
}

export function getExcelPreview(file: File, maxRows = 5): Promise<{ columns: string[]; rows: Record<string, unknown>[]; totalRows: number }> {
  return fileToWorkbook(file).then((wb) => {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    const headerData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
    const columns = headerData.length > 0 ? (headerData[0] as unknown as string[]).map(String) : [];
    return { columns, rows: allRows.slice(0, maxRows), totalRows: allRows.length };
  });
}

export function parseExcelFile(file: File, mapping: ColumnMapping): Promise<Placette[]> {
  return fileToWorkbook(file).then((wb) => {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    return rows
      .filter((row) => row[mapping.code] && row[mapping.x] && row[mapping.y])
      .map((row, i) => {
        const p: Placette = {
          id: `custom-${i}`,
          code: String(row[mapping.code]),
          lat: scaleLat(toNum(row[mapping.y])),
          lng: scaleLng(toNum(row[mapping.x])),
        };

        if (mapping.xRepere && mapping.yRepere && row[mapping.xRepere] && row[mapping.yRepere]) {
          p.repere = { lat: scaleLat(toNum(row[mapping.yRepere])), lng: scaleLng(toNum(row[mapping.xRepere])) };
        }
        if (mapping.pente && row[mapping.pente]) p.pente = toNum(row[mapping.pente]);
        if (mapping.azimut && row[mapping.azimut]) p.azimut = toNum(row[mapping.azimut]);
        if (mapping.altitude && row[mapping.altitude]) p.altitude = toNum(row[mapping.altitude]);
        if (mapping.exposition && row[mapping.exposition]) p.exposition = toNum(row[mapping.exposition]);
        if (mapping.strate && row[mapping.strate]) p.strate = String(row[mapping.strate]);
        if (mapping.distance && row[mapping.distance]) p.distance = toNum(row[mapping.distance]);
        if (mapping.repereDesc && row[mapping.repereDesc] && p.repere) p.repere.description = String(row[mapping.repereDesc]);

        return p;
      })
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
  });
}

// Normalize: lowercase + remove accents (é→e, è→e, ê→e, à→a, etc.)
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function autoDetectMapping(columns: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const normed = columns.map(normalize);

  const find = (patterns: string[]) => {
    for (const p of patterns) {
      const np = normalize(p);
      // 1. Exact match (e.g. column "X" matches pattern "x")
      let idx = normed.findIndex((c) => c === np);
      if (idx >= 0) return columns[idx];
      // 2. Word-boundary match — split column by _ or space, check each word
      idx = normed.findIndex((c) => c.split(/[_\s]+/).some((word) => word === np));
      if (idx >= 0) return columns[idx];
      // 3. Substring match — only for patterns longer than 2 chars to avoid false positives
      if (np.length > 2) {
        idx = normed.findIndex((c) => c.includes(np));
        if (idx >= 0) return columns[idx];
      }
    }
    return undefined;
  };

  mapping.code = find(['code', 'id_plac', 'placette', 'nom']);
  mapping.x = find(['x_plac', 'longitude', 'lng', 'x_wgs', 'long', 'coord_x', 'x']);
  mapping.y = find(['y_plac', 'latitude', 'lat', 'y_wgs', 'coord_y', 'y']);
  mapping.xRepere = find(['xrepere', 'x_rep', 'x_repere', 'xrep', 'long_rep', 'lon_rep']);
  mapping.yRepere = find(['yrepere', 'y_rep', 'y_repere', 'yrep', 'lat_rep']);
  mapping.pente = find(['pente', 'slope', 'inclinaison']);
  mapping.azimut = find(['azimut', 'repere_azimut', 'bearing', 'az', 'orientation']);
  mapping.altitude = find(['altitude', 'alt', 'elev', 'elevation', 'z']);
  mapping.exposition = find(['exposition', 'expo', 'aspect', 'exposition_']);
  mapping.strate = find(['strate_carto', 'strate', 'stratum', 'type_strate']);
  mapping.distance = find(['distance_point', 'distance_repere', 'dist_rep', 'distance', 'dist', 'dist_repere', 'dist_rep_m', 'distance_m', 'dist_m']);
  mapping.repereDesc = find(['description_rep', 'desc_rep', 'repere_desc', 'repere_note', 'description']);

  return mapping;
}
