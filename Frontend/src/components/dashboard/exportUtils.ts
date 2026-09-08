import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import type { MapFeature } from '../../services/dashboardApi';

// ─── Shared ───────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(features: MapFeature[], basename = 'placettes_ifn') {
  const statutLabel = (s: string) =>
    s === 'controle' ? 'Contrôlée' : s === 'visitee' ? 'Réalisée' : 'En cours';
  const controleLabel = (s: string) =>
    s === 'controle' ? 'Contrôlée' : s === 'visitee' ? 'Non contrôlée' : '';

  const COLS: { header: string; get: (f: MapFeature) => string | number | null }[] = [
    { header: 'num_placette',      get: f => f.properties.num_placette },
    { header: 'longitude',         get: f => f.geometry.coordinates[0] },
    { header: 'latitude',          get: f => f.geometry.coordinates[1] },
    { header: 'statut',            get: f => statutLabel(f.properties.statut) },
    { header: 'controle',          get: f => controleLabel(f.properties.statut) },
    { header: 'equipe',            get: f => f.properties.equipe },
    { header: 'essence_group',     get: f => f.properties.essence_group },
    { header: 'strate',            get: f => f.properties.strate },
    { header: 'dpanef',            get: f => f.properties.dpanef },
    { header: 'altitude',          get: f => f.properties.altitude },
    { header: 'pente',             get: f => f.properties.pente },
    { header: 'a_pied',            get: f => f.properties.a_pied },
    { header: 'description_repere',get: f => f.properties.description_repere },
    { header: 'distance_repere',   get: f => f.properties.distance_repere },
    { header: 'azimut_repere',     get: f => f.properties.azimut_repere },
    { header: 'date_created',      get: f => f.properties.date_created },
    { header: 'date_modified',     get: f => f.properties.date_modified },
  ];

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = COLS.map(c => c.header).join(',');
  const rows = features.map(f => COLS.map(c => esc(c.get(f))).join(','));
  const csv = '﻿' + [header, ...rows].join('\r\n');

  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${basename}.csv`);
}

// ─── Excel (XLSX) ─────────────────────────────────────────────────────────────

export function exportXLSX(features: MapFeature[], basename = 'placettes_ifn') {
  const statutLabel = (s: string) =>
    s === 'controle' ? 'Contrôlée' : s === 'visitee' ? 'Réalisée' : 'En cours';
  const controleLabel = (s: string) =>
    s === 'controle' ? 'Contrôlée' : s === 'visitee' ? 'Non contrôlée' : '';

  const rows = features.map(f => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    return {
      num_placette:       p.num_placette,
      longitude:          lon,
      latitude:           lat,
      statut:             statutLabel(p.statut),
      controle:           controleLabel(p.statut),
      equipe:             p.equipe ?? '',
      essence_group:      p.essence_group ?? '',
      strate:             p.strate ?? '',
      dpanef:             p.dpanef ?? '',
      altitude:           p.altitude ?? '',
      pente:              p.pente ?? '',
      a_pied:             p.a_pied ?? '',
      description_repere: p.description_repere ?? '',
      distance_repere:    p.distance_repere ?? '',
      azimut_repere:      p.azimut_repere ?? '',
      date_created:       p.date_created ?? '',
      date_modified:      p.date_modified ?? '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Placettes');
  XLSX.writeFile(wb, `${basename}.xlsx`);
}

// ─── KML ──────────────────────────────────────────────────────────────────────

export function exportKML(features: MapFeature[], basename = 'placettes_ifn') {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const placemarks = features.map(f => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const sl = (s: string) => s === 'controle' ? 'Contrôlée' : s === 'visitee' ? 'Réalisée' : 'En cours';
    const cl = (s: string) => s === 'controle' ? 'Contrôlée' : s === 'visitee' ? 'Non contrôlée' : '';
    const fields: [string, unknown][] = [
      ['statut', sl(p.statut)], ['controle', cl(p.statut) || null],
      ['equipe', p.equipe], ['essence_group', p.essence_group],
      ['strate', p.strate], ['dpanef', p.dpanef], ['altitude', p.altitude],
      ['pente', p.pente], ['a_pied', p.a_pied],
      ['description_repere', p.description_repere], ['distance_repere', p.distance_repere],
      ['azimut_repere', p.azimut_repere], ['date_created', p.date_created], ['date_modified', p.date_modified],
    ];
    const extData = fields
      .filter(([, v]) => v != null)
      .map(([k, v]) => `      <Data name="${k}"><value>${esc(String(v))}</value></Data>`)
      .join('\n');

    return `  <Placemark>
    <name>${esc(p.num_placette)}</name>
    <Point><coordinates>${lon},${lat},0</coordinates></Point>
    <ExtendedData>
${extData}
    </ExtendedData>
  </Placemark>`;
  }).join('\n');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Placettes IFN</name>
${placemarks}
</Document>
</kml>`;

  triggerDownload(new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' }), `${basename}.kml`);
}

// ─── Shapefile (SHP + SHX + DBF + PRJ zipped) ────────────────────────────────

interface DbfField {
  name: string;   // max 10 chars
  type: 'C' | 'N';
  length: number;
  decimals: number;
  get: (f: MapFeature) => string;
}

const sl = (s: string) => s === 'controle' ? 'Controlee' : s === 'visitee' ? 'Realisee' : 'En cours';
const cl = (s: string) => s === 'controle' ? 'Controlee' : s === 'visitee' ? 'Non ctrl' : '';

const DBF_FIELDS: DbfField[] = [
  { name: 'PLACETTE',  type: 'C', length: 20, decimals: 0, get: f => f.properties.num_placette ?? '' },
  { name: 'STATUT',    type: 'C', length: 15, decimals: 0, get: f => sl(f.properties.statut) },
  { name: 'CONTROLE',  type: 'C', length: 15, decimals: 0, get: f => cl(f.properties.statut) },
  { name: 'EQUIPE',    type: 'C', length: 80, decimals: 0, get: f => f.properties.equipe ?? '' },
  { name: 'ESSENCE',   type: 'C', length: 50, decimals: 0, get: f => f.properties.essence_group ?? '' },
  { name: 'STRATE',    type: 'C', length: 30, decimals: 0, get: f => f.properties.strate ?? '' },
  { name: 'DPANEF',    type: 'C', length: 30, decimals: 0, get: f => f.properties.dpanef ?? '' },
  { name: 'ALTITUDE',  type: 'N', length: 10, decimals: 2, get: f => f.properties.altitude != null ? f.properties.altitude.toFixed(2) : '' },
  { name: 'PENTE',     type: 'N', length:  8, decimals: 2, get: f => f.properties.pente != null ? f.properties.pente.toFixed(2) : '' },
  { name: 'DATE_CREA', type: 'C', length: 20, decimals: 0, get: f => f.properties.date_created ?? '' },
  { name: 'DATE_MOD',  type: 'C', length: 20, decimals: 0, get: f => f.properties.date_modified ?? '' },
  { name: 'LONGITUDE', type: 'N', length: 18, decimals: 8, get: f => f.geometry.coordinates[0].toFixed(8) },
  { name: 'LATITUDE',  type: 'N', length: 18, decimals: 8, get: f => f.geometry.coordinates[1].toFixed(8) },
];

function toLatin1(str: string, len: number): Uint8Array {
  const out = new Uint8Array(len).fill(0x20);
  for (let i = 0; i < Math.min(str.length, len); i++) {
    const c = str.charCodeAt(i);
    out[i] = c <= 0xff ? c : 0x3f;
  }
  return out;
}

function buildSHP(points: [number, number][]): ArrayBuffer {
  const n = points.length;
  const contentLen = 10; // words (20 bytes per point record)
  const fileLen = 50 + n * 14; // words: 100 hdr + n*(8+20) bytes
  const buf = new ArrayBuffer(100 + n * 28);
  const dv = new DataView(buf);

  dv.setInt32(0, 9994, false);
  dv.setInt32(24, fileLen, false);
  dv.setInt32(28, 1000, true);
  dv.setInt32(32, 1, true); // Point

  const lons = points.map(p => p[0]);
  const lats = points.map(p => p[1]);
  dv.setFloat64(36, Math.min(...lons), true);
  dv.setFloat64(44, Math.min(...lats), true);
  dv.setFloat64(52, Math.max(...lons), true);
  dv.setFloat64(60, Math.max(...lats), true);

  for (let i = 0; i < n; i++) {
    const off = 100 + i * 28;
    dv.setInt32(off,     i + 1,      false); // record number
    dv.setInt32(off + 4, contentLen, false); // content length
    dv.setInt32(off + 8, 1,          true);  // shape type
    dv.setFloat64(off + 12, points[i][0], true); // X
    dv.setFloat64(off + 20, points[i][1], true); // Y
  }

  return buf;
}

function buildSHX(points: [number, number][]): ArrayBuffer {
  const n = points.length;
  const fileLen = 50 + n * 4; // words
  const buf = new ArrayBuffer(100 + n * 8);
  const dv = new DataView(buf);

  dv.setInt32(0, 9994, false);
  dv.setInt32(24, fileLen, false);
  dv.setInt32(28, 1000, true);
  dv.setInt32(32, 1, true);

  const lons = points.map(p => p[0]);
  const lats = points.map(p => p[1]);
  dv.setFloat64(36, Math.min(...lons), true);
  dv.setFloat64(44, Math.min(...lats), true);
  dv.setFloat64(52, Math.max(...lons), true);
  dv.setFloat64(60, Math.max(...lats), true);

  for (let i = 0; i < n; i++) {
    const off = 100 + i * 8;
    dv.setInt32(off,     50 + i * 14, false); // SHP record offset in words
    dv.setInt32(off + 4, 10,          false); // content length in words
  }

  return buf;
}

function buildDBF(features: MapFeature[]): ArrayBuffer {
  const fields = DBF_FIELDS;
  const n = features.length;
  const headerSize = 32 + fields.length * 32 + 1;
  const recSize = 1 + fields.reduce((s, f) => s + f.length, 0);
  const buf = new ArrayBuffer(headerSize + n * recSize + 1);
  const dv = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // Header
  dv.setUint8(0, 3);
  const now = new Date();
  dv.setUint8(1, now.getFullYear() - 1900);
  dv.setUint8(2, now.getMonth() + 1);
  dv.setUint8(3, now.getDate());
  dv.setInt32(4, n, true);
  dv.setInt16(8, headerSize, true);
  dv.setInt16(10, recSize, true);
  dv.setUint8(29, 0x76); // UTF-8 codepage hint

  // Field descriptors
  for (let fi = 0; fi < fields.length; fi++) {
    const base = 32 + fi * 32;
    bytes.set(toLatin1(fields[fi].name, 10), base);
    bytes[base + 11] = fields[fi].type.charCodeAt(0);
    bytes[base + 16] = fields[fi].length;
    bytes[base + 17] = fields[fi].decimals;
  }
  bytes[32 + fields.length * 32] = 0x0d; // header terminator

  // Records
  for (let ri = 0; ri < n; ri++) {
    let off = headerSize + ri * recSize;
    bytes[off++] = 0x20; // not deleted
    for (const fld of fields) {
      const raw = fld.get(features[ri]).slice(0, fld.length);
      const padded = fld.type === 'N'
        ? raw.padStart(fld.length, ' ')
        : raw.padEnd(fld.length, ' ');
      bytes.set(toLatin1(padded, fld.length), off);
      off += fld.length;
    }
  }
  bytes[headerSize + n * recSize] = 0x1a; // EOF

  return buf;
}

const WGS84_PRJ =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],' +
  'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

export async function exportSHP(features: MapFeature[], basename = 'placettes_ifn') {
  const points = features.map(f => f.geometry.coordinates as [number, number]);

  const zip = new JSZip();
  zip.file(`${basename}.shp`, buildSHP(points));
  zip.file(`${basename}.shx`, buildSHX(points));
  zip.file(`${basename}.dbf`, buildDBF(features));
  zip.file(`${basename}.prj`, WGS84_PRJ);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerDownload(blob, `${basename}.zip`);
}
