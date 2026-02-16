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
          // Normalise semicolon-delimited to comma before passing to XLSX
          const normalised = delim === ';'
            ? text.split('\n').map(line => line.split(';').map(cell => {
                const trimmed = cell.trim();
                return trimmed.includes(',') ? `"${trimmed}"` : trimmed;
              }).join(',')).join('\n')
            : text;
          const wb = XLSX.read(normalised, { type: 'string' });
          resolve(wb);
        } catch (err) { reject(err); }
      };
      reader.readAsText(file); // UTF-8; for Latin-1 files user should resave as UTF-8
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
          lat: toNum(row[mapping.y]),
          lng: toNum(row[mapping.x]),
        };

        if (mapping.xRepere && mapping.yRepere && row[mapping.xRepere] && row[mapping.yRepere]) {
          p.repere = { lat: toNum(row[mapping.yRepere]), lng: toNum(row[mapping.xRepere]) };
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
  mapping.distance = find(['distance_point', 'distance_repere', 'dist_rep', 'distance']);
  mapping.repereDesc = find(['description_rep', 'desc_rep', 'repere_desc', 'repere_note', 'description']);

  return mapping;
}
