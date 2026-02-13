import * as XLSX from 'xlsx';
import type { Placette, ColumnMapping } from '../types';

export function getExcelColumns(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
        if (data.length > 0) {
          resolve((data[0] as unknown as string[]).map(String));
        } else {
          resolve([]);
        }
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function getExcelPreview(file: File, maxRows = 5): Promise<{ columns: string[]; rows: Record<string, unknown>[]; totalRows: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const headerData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
        const columns = headerData.length > 0 ? (headerData[0] as unknown as string[]).map(String) : [];
        resolve({ columns, rows: allRows.slice(0, maxRows), totalRows: allRows.length });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function parseExcelFile(file: File, mapping: ColumnMapping): Promise<Placette[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const placettes: Placette[] = rows
          .filter((row) => row[mapping.code] && row[mapping.x] && row[mapping.y])
          .map((row, i) => {
            const p: Placette = {
              id: `custom-${i}`,
              code: String(row[mapping.code]),
              lat: Number(row[mapping.y]),
              lng: Number(row[mapping.x]),
            };

            if (mapping.xRepere && mapping.yRepere && row[mapping.xRepere] && row[mapping.yRepere]) {
              p.repere = { lat: Number(row[mapping.yRepere]), lng: Number(row[mapping.xRepere]) };
            }
            if (mapping.pente && row[mapping.pente]) p.pente = Number(row[mapping.pente]);
            if (mapping.azimut && row[mapping.azimut]) p.azimut = Number(row[mapping.azimut]);
            if (mapping.altitude && row[mapping.altitude]) p.altitude = Number(row[mapping.altitude]);
            if (mapping.exposition && row[mapping.exposition]) p.exposition = Number(row[mapping.exposition]);
            if (mapping.strate && row[mapping.strate]) p.strate = String(row[mapping.strate]);

            return p;
          });

        resolve(placettes);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function autoDetectMapping(columns: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const lower = columns.map((c) => c.toLowerCase());

  const find = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = lower.findIndex((c) => c.includes(p));
      if (idx >= 0) return columns[idx];
    }
    return undefined;
  };

  mapping.code = find(['code', 'id_plac', 'placette', 'nom']);
  mapping.x = find(['x_plac', 'longitude', 'lng', 'x_wgs', 'long']);
  mapping.y = find(['y_plac', 'latitude', 'lat', 'y_wgs']);
  mapping.xRepere = find(['x_rep', 'x_repere', 'long_rep']);
  mapping.yRepere = find(['y_rep', 'y_repere', 'lat_rep']);
  mapping.pente = find(['pente', 'slope']);
  mapping.azimut = find(['azimut', 'bearing', 'az']);
  mapping.altitude = find(['altitude', 'alt', 'elev', 'z']);
  mapping.exposition = find(['exposition', 'expo', 'aspect']);
  mapping.strate = find(['strate', 'stratum', 'type']);

  return mapping;
}
