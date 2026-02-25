import { useRef } from 'react';
import { useMapStore } from '../../stores/useMapStore';
import { kml } from '@tmcw/togeojson';
// @ts-expect-error - no type declarations for shpjs
import shp from 'shpjs';
import type { GeoJSONLayer } from '../../types';

export function LayersPanel() {
  const { customLayers, addCustomLayer, removeCustomLayer, toggleLayerVisibility } = useMapStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const addLayer = (name: string, data: any, color?: string) => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
    const layer: GeoJSONLayer = {
      id: `layer-${Date.now()}`,
      name,
      data,
      color: color || colors[customLayers.length % colors.length],
      visible: true,
    };
    addCustomLayer(layer);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const name = file.name.replace(/\.\w+$/, '');

    try {
      if (ext === 'geojson' || ext === 'json') {
        // GeoJSON
        const text = await file.text();
        const data = JSON.parse(text);
        addLayer(name, data);
      } else if (ext === 'kml') {
        // KML → GeoJSON
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const data = kml(xmlDoc);
        addLayer(name, data);
      } else if (ext === 'zip' || ext === 'shp') {
        // SHP (zipped shapefile) → GeoJSON
        const buffer = await file.arrayBuffer();
        const data = await shp(buffer);
        addLayer(name, data);
      } else {
        alert(`Format non supporté : .${ext}\nFormats acceptés : GeoJSON, KML, SHP (zip)`);
      }
    } catch (err) {
      console.error('Erreur import couche:', err);
      alert('Erreur lors de l\'import du fichier. Vérifiez le format.');
    }

    // Reset input so same file can be re-imported
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      {/* Import layers */}
      <div style={{ marginBottom: '20px' }}>
        <div className="legend-title">Couches personnalisées</div>
        <button className="btn btn-secondary" style={{ marginBottom: '12px' }} onClick={() => fileRef.current?.click()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Importer GeoJSON / KML / SHP
        </button>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Formats : .geojson, .json, .kml, .shp (zip)
        </div>
        <input ref={fileRef} type="file" accept=".geojson,.json,.kml,.zip,.shp" style={{ display: 'none' }} onChange={handleFile} />

        {customLayers.map((layer) => (
          <div key={layer.id} className="layer-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: layer.color }} />
              <span className="layer-item-name">{layer.name}</span>
            </div>
            <div className="layer-item-actions">
              <button className={`layer-toggle-btn ${layer.visible ? 'active' : ''}`} onClick={() => toggleLayerVisibility(layer.id)}>
                {layer.visible ? '👁️' : '👁️‍🗨️'}
              </button>
              <button className="layer-toggle-btn" onClick={() => removeCustomLayer(layer.id)} style={{ color: 'var(--danger)' }}>✕</button>
            </div>
          </div>
        ))}

        {customLayers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Aucune couche importée
          </div>
        )}
      </div>
    </div>
  );
}
