import { useState, useMemo } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useDataStore } from '../../stores/useDataStore';
import { useMapStore } from '../../stores/useMapStore';
import { useAppStore } from '../../stores/useAppStore';
import { calculateRoute, calculateBirdFlight } from '../../services/routing';
import { isOfflineRouterReady } from '../../services/offlineRouter';
import { formatDistance, formatDuration } from '../../utils/format';
import type { TransportMode } from '../../types';
import { MultiPointPanel } from './MultiPointPanel';

type PointType = 'gps' | 'placette' | 'repere' | 'carte';

function AutocompleteInput({ value, onChange, placeholder, items }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  items: { code: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const filtered = useMemo(() => {
    if (!open) return [];
    if (!input) return items.slice(0, 50);
    return items.filter((it) => it.code.toLowerCase().includes(input.toLowerCase())).slice(0, 20);
  }, [input, items, open]);

  return (
    <div className="autocomplete-wrapper" style={{ marginTop: '10px' }}>
      {open && filtered.length > 0 && (
        <div className="autocomplete-list">
          {filtered.map((it) => (
            <div key={it.code} className="autocomplete-item" onMouseDown={() => { setInput(it.code); onChange(it.code); setOpen(false); }}>{it.label}</div>
          ))}
        </div>
      )}
      <input className="form-input" placeholder={placeholder} value={input}
        onChange={(e) => { setInput(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)} />
    </div>
  );
}

function PointCard({ title, iconClass, iconSvg, type, setType, selectedCode, onSelectPlacette, placetteItems, repereItems, onGps, onCarte, point }: any) {
  return (
    <div className="nav-card">
      <div className="nav-card-header">
        <div className={`nav-card-icon ${iconClass}`}>{iconSvg}</div>
        <span className="nav-card-title">{title}</span>
      </div>
      <div className="nav-card-body">
        <div className="quick-options">
          {(['gps', 'placette', 'repere', 'carte'] as PointType[]).map((t) => (
            <button key={t} className={`quick-option ${type === t ? 'active' : ''}`}
              onClick={() => { setType(t); if (t === 'gps') onGps(); if (t === 'carte') onCarte(); }}>
              {t === 'gps' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>}
              {t === 'placette' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>}
              {t === 'repere' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>}
              {t === 'carte' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
              <span>{t === 'gps' ? 'GPS' : t === 'placette' ? 'Placette' : t === 'repere' ? 'Repère' : 'Carte'}</span>
            </button>
          ))}
        </div>
        {type === 'placette' && <AutocompleteInput value={selectedCode} onChange={onSelectPlacette} placeholder="Tapez un code de placette..." items={placetteItems} />}
        {type === 'repere' && <AutocompleteInput value={selectedCode} onChange={onSelectPlacette} placeholder="Tapez un code de repère..." items={repereItems} />}

        {point && <div className="nav-status" style={{ marginTop: '8px' }}><span className="status-icon">✓</span><span>{point.label}</span></div>}
      </div>
    </div>
  );
}

const SOURCE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'osrm': { label: 'Trajet routier OSRM', color: '#00c864', icon: '🛣️' },
  'offline-graph': { label: 'Réseau local (Dijkstra)', color: '#4285f4', icon: '🗺️' },
  'offline-fallback': { label: 'Estimation hors-ligne', color: '#f59e0b', icon: '📏' },
  'vol': { label: "Vol d'oiseau", color: '#00d4aa', icon: '🧭' },
};

export function NavigationPanel() {
  const nav = useNavigationStore();
  const placettes = useDataStore((s) => s.placettes);
  const routingMode = useAppStore((s) => s.routingMode);
  const setClickMode = useMapStore((s) => s.setClickMode);
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);

  const [startType, setStartType] = useState<PointType>('gps');
  const [endType, setEndType] = useState<PointType>('placette');
  const [startCode, setStartCode] = useState('');
  const [endCode, setEndCode] = useState('');
  const [birdInfo, setBirdInfo] = useState<{ bearing: number; direction: string } | null>(null);
  const [routeSource, setRouteSource] = useState<string>('');

  const offlineReady = isOfflineRouterReady();
  const placetteItems = useMemo(() => placettes.map((p) => ({ code: p.code, label: p.code })), [placettes]);
  const repereItems = useMemo(() => placettes.filter((p) => p.repere).map((p) => ({ code: p.code, label: `Repère ${p.code}` })), [placettes]);

  const handleSelectPlacette = (code: string, isStart: boolean) => {
    const p = placettes.find((pl) => pl.code === code);
    if (!p) return;
    const type = isStart ? startType : endType;
    if (isStart) setStartCode(code); else setEndCode(code);
    if (type === 'repere' && p.repere) {
      (isStart ? nav.setStartPoint : nav.setEndPoint)({ type: 'repere', lat: p.repere.lat, lng: p.repere.lng, label: `Repère ${p.code}` });
      setCenter([p.repere.lat, p.repere.lng]); setZoom(16);
    } else {
      (isStart ? nav.setStartPoint : nav.setEndPoint)({ type: 'placette', lat: p.lat, lng: p.lng, label: p.code, id: p.id });
      setCenter([p.lat, p.lng]); setZoom(16);
    }
  };

  const handleGps = (isStart: boolean) => {
    const setPoint = isStart ? nav.setStartPoint : nav.setEndPoint;
    // Show loading state immediately
    setPoint({ type: 'gps', lat: 0, lng: 0, label: 'Localisation en cours...' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPoint({ type: 'gps', lat, lng, label: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        setCenter([lat, lng]); setZoom(16);
      },
      (err) => {
        console.error('GPS error:', err);
        setPoint(null as any);
        alert(`Erreur GPS: ${err.code === 1 ? 'Permission refusée' : err.code === 2 ? 'Position indisponible' : 'Délai dépassé'}. Vérifiez que le GPS est activé et que le site utilise HTTPS.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const doCalculateRoute = async () => {
    if (!nav.startPoint || !nav.endPoint) return;
    nav.setIsCalculating(true);
    setBirdInfo(null);
    setRouteSource('');
    try {
      const result = await calculateRoute(
        nav.startPoint.lat, nav.startPoint.lng,
        nav.endPoint.lat, nav.endPoint.lng,
        nav.transportMode,
        routingMode
      );
      nav.setRoute(result);
      setRouteSource(result.source);
      if (nav.transportMode === 'fly') {
        const bird = calculateBirdFlight(nav.startPoint.lat, nav.startPoint.lng, nav.endPoint.lat, nav.endPoint.lng);
        setBirdInfo({ bearing: bird.bearing, direction: bird.direction });
      }
    } finally { nav.setIsCalculating(false); }
  };

  const srcInfo = SOURCE_LABELS[routeSource];

  return (
    <div>
      {/* Offline status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', background: offlineReady ? 'rgba(66,133,244,0.12)' : 'rgba(255,165,0,0.12)', color: offlineReady ? '#4285f4' : '#f59e0b' }}>
        {offlineReady ? '🗺️ Réseau local actif' : '⚠️ Réseau local non chargé'}
        <span style={{ marginLeft: 'auto', fontWeight: '400', opacity: 0.7 }}>Mode: {routingMode === 'online' ? 'Online' : 'Offline'}</span>
      </div>

      <div className="sub-tabs">
        <button className={`sub-tab ${nav.navSubTab === 'simple' ? 'active' : ''}`} onClick={() => nav.setNavSubTab('simple')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h10"/></svg>
          A → B
        </button>
        <button className={`sub-tab ${nav.navSubTab === 'multi' ? 'active' : ''}`} onClick={() => nav.setNavSubTab('multi')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="6" r="2"/></svg>
          Multi-Points
        </button>
      </div>

      {nav.navSubTab === 'simple' ? (
        <div>
          <PointCard title="Départ" iconClass="start"
            iconSvg={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}
            type={startType} setType={setStartType} selectedCode={startCode}
            onSelectPlacette={(c: string) => handleSelectPlacette(c, true)}
            placetteItems={placetteItems} repereItems={repereItems}
            onGps={() => handleGps(true)} onCarte={() => setClickMode('setStart')} point={nav.startPoint} />

          <div className="nav-direction-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7l7 7 7-7"/></svg>
          </div>

          <PointCard title="Arrivée" iconClass="end"
            iconSvg={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
            type={endType} setType={setEndType} selectedCode={endCode}
            onSelectPlacette={(c: string) => handleSelectPlacette(c, false)}
            placetteItems={placetteItems} repereItems={repereItems}
            onGps={() => handleGps(false)} onCarte={() => setClickMode('setEnd')} point={nav.endPoint} />

          {/* Transport */}
          <div style={{ margin: '16px 0' }}>
            <div className="transport-modes-compact" style={{ justifyContent: 'center', gap: '12px' }}>
              {([
                { mode: 'car' as TransportMode, label: 'Voiture', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14v-5l-2-6H7l-2 6v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg> },
                { mode: 'walk' as TransportMode, label: 'À pied', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2"/><path d="M10 22l2-7 3 3v6m-3-9l-3-3 1-3 3 3"/></svg> },
                { mode: 'fly' as TransportMode, label: "Vol d'oiseau", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> },
              ]).map(({ mode, label, icon }) => (
                <div key={mode} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <button className={`transport-btn ${nav.transportMode === mode ? 'active' : ''}`} onClick={() => nav.setTransportMode(mode)} title={label}>{icon}</button>
                  <span style={{ fontSize: '0.65rem', color: nav.transportMode === mode ? 'var(--accent)' : 'var(--text-muted)', fontWeight: nav.transportMode === mode ? '600' : '400' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" disabled={!nav.startPoint || !nav.endPoint || nav.isCalculating} onClick={doCalculateRoute}>
            {nav.isCalculating ? <span className="gps-loading">Calcul en cours...</span> : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18m-7-7l7 7-7 7"/></svg>Calculer l'itinéraire</>
            )}
          </button>

          {/* Route result — standard */}
          {nav.route && nav.transportMode !== 'fly' && (
            <div className="route-result">
              {srcInfo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', background: `${srcInfo.color}18`, color: srcInfo.color }}>
                  {srcInfo.icon} {srcInfo.label}
                </div>
              )}
              <div className="route-stats">
                <div className="stat-item"><div className="stat-value">{formatDistance(nav.route.distance)}</div><div className="stat-label">Distance</div></div>
                <div className="stat-item"><div className="stat-value">{formatDuration(nav.route.duration)}</div><div className="stat-label">Durée estimée</div></div>
              </div>
            </div>
          )}

          {/* Bird flight with compass */}
          {nav.route && nav.transportMode === 'fly' && birdInfo && (
            <div className="bird-result">
              <div className="compass-container">
                <div className="compass-circle">
                  <div className="compass-n">N</div>
                  <div className="compass-arrow" style={{ transform: `rotate(${birdInfo.bearing}deg)` }} />
                </div>
                <div className="compass-bearing">{Math.round(birdInfo.bearing)}°</div>
              </div>
              <div className="bird-stats">
                <div className="bird-stat-row"><span className="bird-stat-value">{formatDistance(nav.route.distance)}</span><span className="bird-stat-label">Distance</span></div>
                <div className="bird-stat-row"><span className="bird-stat-value">{formatDuration(nav.route.duration)}</span><span className="bird-stat-label">Durée estimée</span></div>
                <div className="bird-stat-row"><span className="bird-stat-value">{birdInfo.direction}</span><span className="bird-stat-label">Direction</span></div>
              </div>
            </div>
          )}

          {nav.route && (
            <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => { nav.clearRoute(); setBirdInfo(null); setRouteSource(''); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              Effacer l'itinéraire
            </button>
          )}
        </div>
      ) : (
        <MultiPointPanel />
      )}
    </div>
  );
}
