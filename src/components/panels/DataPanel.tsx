import { useState, useRef } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useMapStore } from '../../stores/useMapStore';
import { getExcelPreview, parseExcelFile, autoDetectMapping } from '../../services/excelParser';
import { DEFAULT_PLACETTES } from '../../services/defaultData';
import type { ColumnMapping } from '../../types';

// Field definitions with labels and required flags
const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'code', label: 'CODE / ID', required: true },
  { key: 'x', label: 'X (LONGITUDE)', required: true },
  { key: 'y', label: 'Y (LATITUDE)', required: true },
  { key: 'xRepere', label: 'X REPÈRE', required: false },
  { key: 'yRepere', label: 'Y REPÈRE', required: false },
  { key: 'pente', label: 'PENTE', required: false },
  { key: 'azimut', label: 'AZIMUT', required: false },
  { key: 'altitude', label: 'ALTITUDE', required: false },
  { key: 'exposition', label: 'EXPOSITION', required: false },
  { key: 'strate', label: 'STRATE', required: false },
  { key: 'distance', label: 'DISTANCE REPÈRE', required: false },
  { key: 'repereDesc', label: 'DESCRIPTION REPÈRE', required: false },
];

export function DataPanel() {
  const { placettes, dataSource, setPlacettes, setDataSource } = useDataStore();
  const repereCount = placettes.filter((p) => p.repere).length;
  const fileRef = useRef<HTMLInputElement>(null);

  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [file, setFile] = useState<File | null>(null);
  const [dragover, setDragover] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [sampleCoord, setSampleCoord] = useState<string | null>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setParseError(null);
    setImportSuccess(null);
    setSampleCoord(null);
    setColumns([]);
    setPreviewRows([]);
    setLoading(true);
    try {
      const preview = await getExcelPreview(f);
      setColumns(preview.columns);
      setPreviewRows(preview.rows);
      setTotalRows(preview.totalRows);
      setMapping(autoDetectMapping(preview.columns));
    } catch (err) {
      setParseError(`Erreur de lecture : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file || !mapping.code || !mapping.x || !mapping.y) return;
    setImporting(true);
    setParseError(null);
    setImportSuccess(null);
    setSampleCoord(null);
    try {
      const data = await parseExcelFile(file, mapping as ColumnMapping);
      if (data.length === 0) {
        setParseError('Aucune ligne valide trouvée. Vérifiez que les colonnes X, Y et CODE sont correctement mappées.');
        return;
      }
      setPlacettes(data);
      setDataSource('custom');
      setImportSuccess(data.length);
      setSampleCoord(`lat=${data[0].lat.toFixed(5)}, lng=${data[0].lng.toFixed(5)}`);
      // Center map on new data
      const avgLat = data.reduce((s, p) => s + p.lat, 0) / data.length;
      const avgLng = data.reduce((s, p) => s + p.lng, 0) / data.length;
      useMapStore.getState().setCenter([avgLat, avgLng]);
      useMapStore.getState().setZoom(10);
      // Also fit bounds if available
      setTimeout(() => (window as any).__geonav_fitToPlacettes?.(), 300);
    } catch (err) {
      setParseError(`Erreur d'import : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  const restoreDefaults = () => {
    setPlacettes(DEFAULT_PLACETTES);
    setDataSource('default');
    setFile(null);
    setColumns([]);
    setMapping({});
    setPreviewRows([]);
    setTotalRows(0);
  };

  // Show all columns in preview
  const displayPreviewCols = columns;

  return (
    <div>
      {/* Current data info */}
      <div className="data-info">
        <div style={{ marginBottom: '12px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <h3>{dataSource === 'default' ? 'Données par défaut' : 'Données personnalisées'}</h3>
        <div className="data-stats">
          <span><strong>{placettes.length}</strong> placettes</span>
          <span><strong>{repereCount}</strong> repères</span>
        </div>
      </div>

      {/* Excel drop zone */}
      <div
        className={`excel-drop-zone ${dragover ? 'dragover' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }}>{file ? file.name : 'Glissez un fichier ou cliquez'}</p>
        <p className="excel-formats" style={{ color: 'var(--text-muted)' }}>.xlsx, .xls, .csv</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Lecture du fichier...
        </div>
      )}

      {parseError && (
        <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,80,80,0.12)', color: '#ff6b6b', fontSize: '0.8rem' }}>
          {parseError}
        </div>
      )}

      {/* Column mapping */}
      {columns.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '4px' }}>Correspondance des colonnes</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Vérifiez que les colonnes sont correctement identifiées</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {MAPPING_FIELDS.map(({ key, label, required }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  {label}{required ? ' *' : ''}
                </label>
                <select
                  className="form-select"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${mapping[key] ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: '8px',
                    color: mapping[key] ? 'var(--text)' : 'var(--text-muted)',
                  }}
                  value={mapping[key] || ''}
                  onChange={(e) => setMapping({ ...mapping, [key]: e.target.value || undefined })}
                >
                  <option value="">-- Non mappé --</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Data preview table */}
          {previewRows.length > 0 && displayPreviewCols.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-muted)' }}>
                Aperçu des données ({totalRows} lignes)
              </h4>
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      {displayPreviewCols.map((col) => {
                        const isMapped = Object.values(mapping).includes(col);
                        return (<th key={col} style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: isMapped ? 'var(--accent)' : 'var(--text-muted)',
                          background: isMapped ? 'rgba(0,229,255,0.08)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          whiteSpace: 'nowrap',
                        }}>{col}</th>);
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < previewRows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        {displayPreviewCols.map((col) => (
                          <td key={col} style={{
                            padding: '8px 12px',
                            color: 'var(--text)',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '0.75rem',
                          }}>{String(row[col] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleImport} disabled={!mapping.code || !mapping.x || !mapping.y || importing}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {importing ? 'Import en cours...' : 'Appliquer les données'}
          </button>

          {importSuccess !== null && (
            <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,200,100,0.12)', color: '#00c864', fontSize: '0.8rem', fontWeight: '600' }}>
              ✓ {importSuccess} placettes importées avec succès
              {sampleCoord && (
                <div style={{ marginTop: '4px', fontSize: '0.72rem', fontWeight: '400', color: 'rgba(0,200,100,0.8)' }}>
                  Exemple 1ère placette: {sampleCoord}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Restore defaults */}
      {dataSource === 'custom' && (
        <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={restoreDefaults}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
          Restaurer les données par défaut
        </button>
      )}
    </div>
  );
}
