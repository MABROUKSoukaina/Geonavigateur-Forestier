import { useDataStore } from '../../stores/useDataStore';
import { useAppStore } from '../../stores/useAppStore';
import { useMapStore } from '../../stores/useMapStore';
import { useMemo } from 'react';

export function PlacettesPanel() {
  const { placettes, selectedPlacettes, searchQuery, setSearchQuery, toggleSelectPlacette, clearSelection, setPlacettes } = useDataStore();
  const { showPlacettes, showReperes, togglePlacettes, toggleReperes, clusteringEnabled, toggleClustering } = useAppStore();
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);

  const filtered = useMemo(() => {
    if (!searchQuery) return placettes;
    return placettes.filter((p) => p.code.toLowerCase().includes(searchQuery.toLowerCase()) || p.strate?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [placettes, searchQuery]);

  const repereCount = placettes.filter((p) => p.repere).length;

  const zoomTo = (lat: number, lng: number) => {
    setCenter([lat, lng]);
    setZoom(17);
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-box">
          <div className="value">{placettes.length}</div>
          <div className="label">Placettes</div>
        </div>
        <div className="stat-box">
          <div className="value">{repereCount}</div>
          <div className="label">Repères</div>
        </div>
        <div className="stat-box">
          <div className="value">{selectedPlacettes.length}</div>
          <div className="label">Sélectionnées</div>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="layer-toggles">
        <div className="layer-toggle-item">
          <span className="layer-toggle-label">Placettes</span>
          <div className={`toggle-switch ${showPlacettes ? 'active' : ''}`} onClick={togglePlacettes} />
        </div>
        <div className="layer-toggle-item">
          <span className="layer-toggle-label">Repères</span>
          <div className={`toggle-switch ${showReperes ? 'active' : ''}`} onClick={toggleReperes} />
        </div>
        <div className="layer-toggle-item">
          <span className="layer-toggle-label">Clustering</span>
          <div className={`toggle-switch ${clusteringEnabled ? 'active' : ''}`} onClick={toggleClustering} />
        </div>
      </div>

      {/* Search */}
      <div className="search-box">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input
          className="search-input"
          placeholder="Rechercher par code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <span
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1 }}
          >✕</span>
        )}
      </div>

      {/* Result count */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '4px' }}>
        {searchQuery
          ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''} sur ${placettes.length}`
          : `${placettes.length} placettes`
        }
      </div>

      {/* Actions */}
      {selectedPlacettes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }} onClick={() => {
              if (filtered.length > 0) {
                const avgLat = filtered.reduce((s, p) => s + p.lat, 0) / filtered.length;
                const avgLng = filtered.reduce((s, p) => s + p.lng, 0) / filtered.length;
                setCenter([avgLat, avgLng]); setZoom(10);
              }
            }}>📍 Voir tout</button>
            <button className="btn btn-danger" style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }} onClick={clearSelection}>Effacer sélection</button>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '0.8rem' }}
            onClick={() => {
              const kept = placettes.filter((p) => selectedPlacettes.includes(p.id));
              setPlacettes(kept);
              clearSelection();
            }}
          >
            Garder les sélectionnées ({selectedPlacettes.length})
          </button>
        </div>
      )}

      {/* List — all placettes, filtered live */}
      <div className="placette-list">
        {filtered.map((p) => (
          <div key={p.id} className={`placette-item ${selectedPlacettes.includes(p.id) ? 'selected' : ''}`}
            onClick={() => { toggleSelectPlacette(p.id); zoomTo(p.lat, p.lng); }}>
            <div className="placette-dot" />
            <div style={{ flex: 1 }}>
              <div className="placette-code">{p.code}</div>
              <div className="placette-coords">
                {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                {p.altitude != null ? ` • alt: ${p.altitude}m` : ''}
                {p.distance != null ? ` • dist. rep: ${p.distance}m` : ''}
              </div>
            </div>
            {p.strate && <span className="placette-strate">{p.strate}</span>}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucune placette trouvée</div>}
      </div>
    </div>
  );
}
