import { useState, useMemo } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useDataStore } from '../../stores/useDataStore';
import { useMapStore } from '../../stores/useMapStore';
import { useAppStore } from '../../stores/useAppStore';
import { solveTSPRoute } from '../../services/routing';
import { formatDistance, formatDuration } from '../../utils/format';
import { getGpsPosition } from '../../utils/geo';
import type { TransportMode } from '../../types';

export function MultiPointPanel() {
  const nav = useNavigationStore();
  const placettes = useDataStore((s) => s.placettes);
  const setClickMode = useMapStore((s) => s.setClickMode);
  const routingMode = useAppStore((s) => s.routingMode);
  const [selectionMode, setSelectionMode] = useState<'code' | 'carte'>('code');
  const [searchInput, setSearchInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [routeSource, setRouteSource] = useState<string>('');

  const filteredPlacettes = useMemo(() => {
    if (!searchInput) return placettes.slice(0, 30);
    return placettes.filter((p) => p.code.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 15);
  }, [searchInput, placettes]);

  const addPlacette = (code: string) => {
    const p = placettes.find((pl) => pl.code === code);
    if (p) {
      nav.addMultiPointPlacette(p.id);
      setSearchInput('');
      setShowAutocomplete(false);
    }
  };

  const selectedPlacettesData = nav.multiPointPlacettes.map((id) => placettes.find((p) => p.id === id)).filter(Boolean);

  // Ordered visit list from route result
  const orderedVisitData = nav.multiPointRoute
    ? nav.multiPointRoute.orderedPlacettes.map((id) => placettes.find((p) => p.id === id)).filter(Boolean)
    : [];

  const handleCalculate = async () => {
    if (selectedPlacettesData.length < 2) return;
    nav.setIsCalculating(true);
    setRouteSource('');

    try {
      let startLat: number, startLng: number;

      if (nav.multiPointStartMode === 'gps') {
        try {
          const pos = await getGpsPosition();
          startLat = pos.coords.latitude;
          startLng = pos.coords.longitude;
        } catch {
          startLat = selectedPlacettesData[0]!.lat;
          startLng = selectedPlacettesData[0]!.lng;
        }
      } else {
        startLat = selectedPlacettesData[0]!.lat;
        startLng = selectedPlacettesData[0]!.lng;
      }

      const result = await solveTSPRoute(selectedPlacettesData as any, startLat, startLng, nav.multiPointTransport, routingMode);
      nav.setMultiPointRoute(result);
      setRouteSource((result as any).source || 'offline-fallback');
    } catch (e) {
      console.error('TSP calculation failed:', e);
    } finally {
      nav.setIsCalculating(false);
    }
  };

  const transportLabel = nav.multiPointTransport === 'car' ? 'En voiture' : nav.multiPointTransport === 'walk' ? 'À pied' : "Vol d'oiseau";
  const transportIcon = nav.multiPointTransport === 'car'
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14v-5l-2-6H7l-2 6v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2"/><path d="M10 22l2-7 3 3v6m-3-9l-3-3 1-3 3 3"/></svg>;

  return (
    <div>
      {/* Intro */}
      <div className="multi-intro">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="5" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="6" r="2"/>
          <path d="M5 8v4a2 2 0 002 2h3m4 0h3a2 2 0 002-2V8"/><path d="M12 14V8"/>
        </svg>
        <p>Créez un parcours optimisé pour visiter plusieurs placettes</p>
      </div>

      {/* Selection card */}
      <div className="nav-card">
        <div className="nav-card-header">
          <div className="nav-card-icon multi">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <span className="nav-card-title">Ajouter des placettes</span>
        </div>
        <div className="nav-card-body">
          <div className="selection-mode-toggle">
            <button className={`selection-mode-btn ${selectionMode === 'code' ? 'active' : ''}`} onClick={() => { setSelectionMode('code'); setClickMode('none'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Recherche
            </button>
            <button className={`selection-mode-btn ${selectionMode === 'carte' ? 'active' : ''}`} onClick={() => { setSelectionMode('carte'); setClickMode('addMultiPoint'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Clic carte
            </button>
          </div>

          {selectionMode === 'code' ? (
            <div className="multi-input-group">
              <div className="autocomplete-wrapper" style={{ flex: 1 }}>
                {showAutocomplete && filteredPlacettes.length > 0 && (
                  <div className="autocomplete-list">
                    {filteredPlacettes.map((p) => (
                      <div key={p.id} className="autocomplete-item" onMouseDown={() => addPlacette(p.code)}>{p.code}</div>
                    ))}
                  </div>
                )}
                <input
                  className="form-input"
                  placeholder="Tapez un code..."
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setShowAutocomplete(true); }}
                  onFocus={() => setShowAutocomplete(true)}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && filteredPlacettes.length > 0) addPlacette(filteredPlacettes[0].code); }}
                />
              </div>
              <button className="btn-icon btn-add" onClick={() => { if (filteredPlacettes.length > 0) addPlacette(filteredPlacettes[0].code); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
          ) : (
            <div className="carte-hint">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Cliquez sur les placettes sur la carte</span>
            </div>
          )}
        </div>
      </div>

      {/* Selected list */}
      <div className="multi-list-section">
        <div className="multi-list-header">
          <span className="multi-list-title">Placettes sélectionnées</span>
          <span className="multi-list-count">{nav.multiPointPlacettes.length} placette(s)</span>
        </div>
        <div id="multi-points-list" className="multi-route-list">
          {selectedPlacettesData.length === 0 ? (
            <div className="empty-list">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <p>Aucune placette sélectionnée</p>
              <small>Ajoutez des placettes pour créer votre parcours</small>
            </div>
          ) : (
            selectedPlacettesData.map((p, i) => p && (
              <div key={p.id} className="multi-route-item">
                <div className="multi-route-item-info">
                  <div className="multi-route-item-num">{i + 1}</div>
                  <span className="multi-route-item-code">{p.code}</span>
                </div>
                <button className="multi-route-item-remove" onClick={() => nav.removeMultiPointPlacette(p.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Options */}
      <div className="nav-card">
        <div className="nav-card-header">
          <div className="nav-card-icon settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4m11-11h-4M6 12H1"/></svg>
          </div>
          <span className="nav-card-title">Options</span>
        </div>
        <div className="nav-card-body">
          <div className="option-row">
            <span className="option-label">Départ depuis</span>
            <div className="option-toggle">
              <button className={`option-btn ${nav.multiPointStartMode === 'gps' ? 'active' : ''}`} onClick={() => nav.setMultiPointStartMode('gps')}>GPS</button>
              <button className={`option-btn ${nav.multiPointStartMode === 'first' ? 'active' : ''}`} onClick={() => nav.setMultiPointStartMode('first')}>1ère placette</button>
            </div>
          </div>
          <div className="option-row">
            <span className="option-label">Transport</span>
            <div className="transport-modes-compact">
              {([
                { mode: 'car' as TransportMode, label: 'Voiture', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14v-5l-2-6H7l-2 6v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg> },
                { mode: 'walk' as TransportMode, label: 'À pied', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2"/><path d="M10 22l2-7 3 3v6m-3-9l-3-3 1-3 3 3"/></svg> },
                { mode: 'fly' as TransportMode, label: "Vol d'oiseau", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> },
              ]).map(({ mode, label, icon }) => (
                <button key={mode} className={`transport-btn ${nav.multiPointTransport === mode ? 'active' : ''}`} onClick={() => nav.setMultiPointTransport(mode)} title={label} style={{ width: '36px', height: '36px' }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={selectedPlacettesData.length < 2 || nav.isCalculating} onClick={handleCalculate}>
          {nav.isCalculating ? <span className="gps-loading">Calcul en cours...</span> : '🚀 Optimiser le parcours'}
        </button>
        <button className="btn btn-danger" style={{ flex: 0, padding: '14px 20px' }} onClick={() => { nav.clearMultiPointPlacettes(); setRouteSource(''); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>

      {/* ===== RESULT — styled like the screenshot ===== */}
      {nav.multiPointRoute && (
        <div className="multi-route-result">
          {/* Header: Parcours calculé + mode */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: '700' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Parcours calculé
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b' }}>
              {transportIcon}
              {transportLabel}
            </div>
          </div>

          {/* Route source indicator */}
          {routeSource && (
            <div style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', marginBottom: '10px',
              background: routeSource === 'osrm' ? 'rgba(0,200,100,0.15)' : routeSource === 'offline-graph' ? 'rgba(66,133,244,0.15)' : 'rgba(255,165,0,0.15)',
              color: routeSource === 'osrm' ? '#00c864' : routeSource === 'offline-graph' ? '#4285f4' : '#f59e0b'
            }}>
              {routeSource === 'osrm' ? '🛣️ Trajet routier OSRM' : routeSource === 'offline-graph' ? '🗺️ Réseau local (Dijkstra)' : '📏 Estimation hors-ligne'}
            </div>
          )}

          {/* Stats: placettes / distance / durée */}
          <div className="result-stats" style={{ marginBottom: '16px' }}>
            <div className="result-stat">
              <div className="result-stat-value">{nav.multiPointRoute.orderedPlacettes.length}</div>
              <div className="result-stat-label">Placettes</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value">{formatDistance(nav.multiPointRoute.totalDistance)}</div>
              <div className="result-stat-label">Distance</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value">{formatDuration(nav.multiPointRoute.totalDuration)}</div>
              <div className="result-stat-label">Durée</div>
            </div>
          </div>

          {/* Ordered visit list */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>Ordre de visite :</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {orderedVisitData.map((p, i) => p && (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '8px',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: '700', fontSize: '0.8rem', flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.9rem', fontWeight: '600', color: '#fbbf24' }}>{p.code}</span>
                {i < orderedVisitData.length - 1 && (
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
