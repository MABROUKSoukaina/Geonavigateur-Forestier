import { useState, useEffect, useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Checkbox from '@mui/material/Checkbox';
import type { DashboardData } from '../../services/dashboardApi';
import { fetchMapGeoJson, type MapFeature } from '../../services/dashboardApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const EQUIPE_COLORS = ['#818cf8', '#4ade80', '#f59e0b', '#ec4899', '#38bdf8', '#c084fc'];

const ESSENCE_PALETTE = [
  '#0ea5e9', '#8b5cf6', '#f97316', '#10b981', '#ec4899',
  '#eab308', '#06b6d4', '#84cc16', '#f43f5e', '#a78bfa',
  '#fb923c',
];

const BASEMAPS = [
  { id: 'google-sat',    label: 'Google Satellite', url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',                                                                         attribution: '© Google',                                             maxZoom: 20 },
  { id: 'esri-hybrid',  label: 'Esri Hybrid',      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                             attribution: '© Esri, Maxar, Earthstar Geographics',                 maxZoom: 19 },
  { id: 'esri-topo',    label: 'Esri Topographie', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',                             attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',   maxZoom: 19 },
  { id: 'esri-streets', label: 'Esri Streets',     url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',                          attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',   maxZoom: 19 },
] as const;
type BasemapId = typeof BASEMAPS[number]['id'];


type ClassifyMode = 'statut' | 'equipe' | 'essence' | 'accessibilite';

const MODE_LABELS: Record<ClassifyMode, string> = {
  statut:        'Par statut (réalisée / non réalisée)',
  equipe:        'Par équipe',
  essence:       'Par formation',
  accessibilite: 'Par accessibilité',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function equipeIndex(name: string): number {
  const m = name.match(/N°0?(\d+)/);
  return m ? (parseInt(m[1]) - 1) % EQUIPE_COLORS.length : 0;
}

function equipeShort(name: string): string {
  const m = name.match(/Equipe\s+(.+?)\s+\(/);
  const s = m ? m[1] : name;
  return s.replace(/_\w+$/, '');
}

// ─── DivIcon factories ────────────────────────────────────────────────────────

function makeMarkerIcon(color: string, highlighted: boolean): L.DivIcon {
  const dot = highlighted ? 12 : 5;
  const hit = 28; // large transparent hit area for easy clicking
  const glow = highlighted ? `0 0 12px ${color},` : '';
  return L.divIcon({
    className: '',
    html: `<div style="width:${hit}px;height:${hit}px;display:flex;align-items:center;justify-content:center;"><div style="width:${dot}px;height:${dot}px;background:${color};border:none;border-radius:50%;box-shadow:${glow}0 2px 6px rgba(0,0,0,0.3);"></div></div>`,
    iconSize: [hit, hit] as L.PointExpression,
    iconAnchor: [hit / 2, hit / 2] as L.PointExpression,
    popupAnchor: [0, -(dot / 2 + 3)] as L.PointExpression,
  });
}


function markerColor(f: MapFeature, mode: ClassifyMode, essenceColors: Map<string, string>): string {
  if (mode === 'equipe')  return f.properties.equipe ? EQUIPE_COLORS[equipeIndex(f.properties.equipe)] : '#94a3b8';
  if (mode === 'essence') return (f.properties.essence_group && essenceColors.get(f.properties.essence_group)) || '#94a3b8';
  if (mode === 'accessibilite') {
    if (f.properties.accessibilite === 1) return '#06b6d4';   // accessible — cyan
    if (f.properties.accessibilite === 0) return '#ef4444';   // non accessible — red
    return '#bcc5d0';                                          // not visited / unknown
  }
  if (f.properties.statut === 'visitee')  return '#10b981';
  if (f.properties.statut === 'controle') return '#8b5cf6';
  return '#bcc5d0';
}

// ─── MapFitter ────────────────────────────────────────────────────────────────

function MapFitter({ features }: { features: MapFeature[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || features.length === 0) return;
    done.current = true;
    map.fitBounds(
      features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number]),
      { padding: [0, 0], maxZoom: 16 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features]);
  return null;
}

// ─── MapFlyer — flies to a placette when selected via search ──────────────────

function MapFlyer({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 15, { duration: 1.2 });
  }, [map, target]);
  return null;
}

// ─── ResetView — re-runs fitBounds on the same features as MapFitter ─────────
function ResetView({ trigger, features }: { trigger: number; features: { geometry: { coordinates: number[] } }[] }) {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0 && features.length > 0) {
      map.fitBounds(
        features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number]),
        { padding: [0, 0], maxZoom: 16, animate: true },
      );
    }
  }, [trigger, map]);
  return null;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const SECTION_LABEL: CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.07em',
  margin: 0, marginBottom: 8,
};

const miniBtn: CSSProperties = {
  background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
  padding: '2px 9px', cursor: 'pointer', fontSize: 10, color: '#64748b',
};

function FilterBtn({ label, active, badge, onClick }: {
  label: string; active: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: active ? 'rgba(5,150,105,0.08)' : '#f8fafc',
      border: `1px solid ${active ? 'rgba(5,150,105,0.4)' : '#e2e8f0'}`,
      borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
      fontSize: 12, fontWeight: 500,
      color: active ? '#059669' : '#475569',
      transition: 'all 0.15s',
    }}>
      {label}
      {badge != null && badge > 0 && (
        <span style={{
          background: '#059669', color: '#fff', borderRadius: 10,
          padding: '0 5px', fontSize: 10, fontWeight: 700, lineHeight: '16px',
        }}>{badge}</span>
      )}
      <span style={{ fontSize: 9, opacity: 0.55, marginLeft: 1 }}>▾</span>
    </button>
  );
}

function DropPanel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 2000,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.13)', padding: '12px 14px',
      minWidth: 240, ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { data: DashboardData }

export function TabCarte({ data }: Props) {
  const [allFeatures, setAllFeatures] = useState<MapFeature[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [classifyMode, setClassifyMode] = useState<ClassifyMode>('statut');
  const [selEquipes,   setSelEquipes]   = useState<Set<string>>(new Set());
  const [selEssences,  setSelEssences]  = useState<Set<string>>(new Set());
  const [selStatuts,   setSelStatuts]   = useState<Set<string>>(new Set());
  const [selAccessibilite, setSelAccessibilite] = useState<Set<string>>(new Set());
  const [openPanel,    setOpenPanel]    = useState<'classifier' | 'statuts' | 'equipes' | 'essences' | 'accessibilite' | null>(null);
  const [legendOpen,   setLegendOpen]   = useState(true);
  const [basemap,      setBasemap]      = useState<BasemapId>('esri-hybrid');
  const [basemapOpen,  setBasemapOpen]  = useState(false);

  // Search
  const [searchInput,    setSearchInput]    = useState('');
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [flyTarget,    setFlyTarget]    = useState<[number, number] | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMapGeoJson()
      .then(d => setAllFeatures(d.features))
      .catch(e => setError(e instanceof Error ? e.message : 'Erreur réseau'))
      .finally(() => setLoading(false));
  }, []);

  // Close panel when clicking outside toolbar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node))
        setOpenPanel(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search results: filter allFeatures by num_placette code
  const searchResults = (() => {
    const q = searchInput.trim().toLowerCase();
    const pool = q.length > 0
      ? allFeatures.filter(f => f.properties.num_placette.toLowerCase().includes(q))
      : allFeatures;
    return pool.slice(0, q.length > 0 ? 20 : 30);
  })();

  // Derived lists and color map
  const equipeList   = data.equipes.map(e => e.equipe);
  const essenceList  = [...new Set(allFeatures.map(f => f.properties.essence_group).filter(Boolean) as string[])].sort();
  const essenceColors = new Map(essenceList.map((s, i) => [s, ESSENCE_PALETTE[i % ESSENCE_PALETTE.length]]));

  // Filtered features (multi-criteria AND)
  const filtered = allFeatures
    .filter(f => selStatuts.size === 0 || selStatuts.has(f.properties.statut))
    .filter(f => selEquipes.size === 0 || (f.properties.equipe != null && selEquipes.has(f.properties.equipe)))
    .filter(f => selEssences.size === 0 || (f.properties.essence_group != null && selEssences.has(f.properties.essence_group)))
    .filter(f => selAccessibilite.size === 0 || selAccessibilite.has(String(f.properties.accessibilite)));

  const hasFilters = selStatuts.size > 0 || selEquipes.size > 0 || selEssences.size > 0 || selAccessibilite.size > 0;

  // Context-aware counts: each dropdown shows counts filtered by the OTHER active filter
  const equipeCtxMap = new Map<string, number>();
  allFeatures
    .filter(f => selEssences.size === 0 || (f.properties.essence_group != null && selEssences.has(f.properties.essence_group)))
    .forEach(f => {
      if (f.properties.equipe)
        equipeCtxMap.set(f.properties.equipe, (equipeCtxMap.get(f.properties.equipe) ?? 0) + 1);
    });

  const essenceCtxMap = new Map<string, number>();
  allFeatures
    .filter(f => selEquipes.size === 0 || (f.properties.equipe != null && selEquipes.has(f.properties.equipe)))
    .forEach(f => {
      if (f.properties.essence_group)
        essenceCtxMap.set(f.properties.essence_group, (essenceCtxMap.get(f.properties.essence_group) ?? 0) + 1);
    });

  function togglePanel(p: 'classifier' | 'statuts' | 'equipes' | 'essences' | 'accessibilite'): void {
    setOpenPanel(prev => prev === p ? null : p);
  }

  function toggleStatut(s: string) {
    setSelStatuts(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  function toggleEquipe(eq: string) {
    setSelEquipes(prev => {
      const next = new Set(prev);
      if (next.has(eq)) next.delete(eq); else next.add(eq);
      return next;
    });
  }

  function toggleEssence(s: string) {
    setSelEssences(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  // ── Icon + popup builders (capture classifyMode, essenceColors, selectedCode) ─

  const getIconFn = (f: MapFeature): L.DivIcon => {
    const color = markerColor(f, classifyMode, essenceColors);
    const highlighted = f.properties.num_placette === selectedCode;
    return makeMarkerIcon(highlighted ? '#f59e0b' : color, highlighted);
  };

  const buildPopupFn = (f: MapFeature): ReactNode => {
    const color      = markerColor(f, classifyMode, essenceColors);
    const statut     = f.properties.statut;
    const isControle = statut === 'controle';
    const isVisitee  = statut === 'visitee';
    const isDone     = isVisitee || isControle;
    const badgeLabel = isControle ? 'Contrôle ✓' : isVisitee ? 'Visitée ✓' : 'Programmée';
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{f.properties.num_placette}</span>
          {isDone && (
            <span style={{ marginLeft: 'auto', marginRight: 20, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: isControle ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)', color: isControle ? '#7c3aed' : '#059669' }}>
              {badgeLabel}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 14px', fontSize: 12 }}>
          {f.properties.equipe && <><span style={{ color: '#94a3b8' }}>Équipe</span><span style={{ color: '#1e293b', fontWeight: 600 }}>{equipeShort(f.properties.equipe)}</span></>}
          {f.properties.essence_group && <><span style={{ color: '#94a3b8' }}>Formation</span><span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.essence_group}</span></>}
          {f.properties.dpanef && <><span style={{ color: '#94a3b8' }}>DPANEF</span><span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.dpanef}</span></>}
          {f.properties.altitude != null && <><span style={{ color: '#94a3b8' }}>Altitude</span><span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.altitude} m</span></>}
          {f.properties.pente != null && <><span style={{ color: '#94a3b8' }}>Pente</span><span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.pente}°</span></>}
          {f.properties.distance_repere != null && <><span style={{ color: '#94a3b8' }}>Dist. repère</span><span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.distance_repere} m</span></>}
        </div>
        {f.properties.description_repere && (
          <div style={{ marginTop: 8, paddingTop: 7, fontSize: 10.5, color: '#64748b', borderTop: '1px solid #e2e8f0', lineHeight: 1.45 }}>
            <span style={{ fontWeight: 700, color: '#475569' }}>Repère : </span>{f.properties.description_repere}
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div ref={toolbarRef} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', boxSizing: 'border-box',
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '8px 12px', flexShrink: 0, position: 'relative',
      }}>
        {/* ── Left: filter buttons ───────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

        {/* ── Classifier button ──────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          <FilterBtn
            label="Classifier"
            active={openPanel === 'classifier'}
            onClick={() => togglePanel('classifier')}
          />
          {openPanel === 'classifier' && (
            <DropPanel>
              <p style={SECTION_LABEL}>Symbologie</p>

              {(['statut', 'equipe', 'essence', 'accessibilite'] as ClassifyMode[]).map(m => (
                <label key={m} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 0', cursor: 'pointer', fontSize: 12, color: '#334155',
                }}>
                  <input
                    type="radio" name="classifyMode"
                    checked={classifyMode === m}
                    onChange={() => setClassifyMode(m)}
                    style={{ accentColor: '#059669' }}
                  />
                  {MODE_LABELS[m]}
                </label>
              ))}
            </DropPanel>
          )}
        </div>

        {/* ── Filtrer par statut ─────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          <FilterBtn
            label="Statut"
            active={openPanel === 'statuts' || selStatuts.size > 0}
            badge={selStatuts.size || undefined}
            onClick={() => togglePanel('statuts')}
          />
          {openPanel === 'statuts' && (() => {
            const cntVisitee   = allFeatures.filter(f => f.properties.statut === 'visitee').length;
            const cntControle  = allFeatures.filter(f => f.properties.statut === 'controle').length;
            const cntProg      = allFeatures.filter(f => f.properties.statut === 'programmee').length;
            const visiteeKids  = ['visitee', 'controle'] as const;
            const visiteeAll   = visiteeKids.every(k => selStatuts.has(k));
            const visiteeSome  = visiteeKids.some(k => selStatuts.has(k));
            function toggleVisiteeParent() {
              setSelStatuts(prev => {
                const next = new Set(prev);
                if (visiteeAll) { next.delete('visitee'); next.delete('controle'); }
                else            { next.add('visitee');    next.add('controle'); }
                return next;
              });
            }
            return (
              <DropPanel style={{ minWidth: 220 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ ...SECTION_LABEL, marginBottom: 0 }}>Filtrer par statut</p>
                  <button style={miniBtn} onClick={() => setSelStatuts(selStatuts.size > 0 ? new Set() : new Set(['visitee', 'controle', 'programmee']))}>
                    {selStatuts.size > 0 ? 'Effacer' : 'Tout'}
                  </button>
                </div>

                {/* ── Visitée (parent) ── */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                  <Checkbox
                    size="small"
                    checked={visiteeAll}
                    indeterminate={!visiteeAll && visiteeSome}
                    onChange={toggleVisiteeParent}
                    sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', flex: 1 }}>Visitée</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b' }}>{cntVisitee + cntControle}</span>
                </label>

                {/* ── Contrôlée (child) ── */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 2px 22px', cursor: 'pointer' }}>
                  <Checkbox
                    size="small"
                    checked={selStatuts.has('controle')}
                    onChange={() => toggleStatut('controle')}
                    sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color: '#8b5cf6' } }}
                  />
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#475569', flex: 1 }}>Contrôlée</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: cntControle > 0 ? '#64748b' : '#cbd5e1' }}>{cntControle}</span>
                </label>

                {/* ── Non contrôlée (child) ── */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 2px 22px', cursor: 'pointer' }}>
                  <Checkbox
                    size="small"
                    checked={selStatuts.has('visitee')}
                    onChange={() => toggleStatut('visitee')}
                    sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color: '#10b981' } }}
                  />
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#475569', flex: 1 }}>Non contrôlée</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: cntVisitee > 0 ? '#64748b' : '#cbd5e1' }}>{cntVisitee}</span>
                </label>

                {/* ── Non visitée ── */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer', marginTop: 4, borderTop: '1px solid #f1f5f9', paddingTop: 7 }}>
                  <Checkbox
                    size="small"
                    checked={selStatuts.has('programmee')}
                    onChange={() => toggleStatut('programmee')}
                    sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color: '#94a3b8' } }}
                  />
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', flex: 1 }}>Non Visitée</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: cntProg > 0 ? '#64748b' : '#cbd5e1' }}>{cntProg}</span>
                </label>
              </DropPanel>
            );
          })()}
        </div>

        {/* ── Filtrer par équipe ─────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          <FilterBtn
            label="Équipes"
            active={openPanel === 'equipes' || selEquipes.size > 0}
            badge={selEquipes.size || undefined}
            onClick={() => togglePanel('equipes')}
          />
          {openPanel === 'equipes' && (
            <DropPanel>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ ...SECTION_LABEL, marginBottom: 0 }}>Filtrer par équipe</p>
                <button style={miniBtn} onClick={() => setSelEquipes(selEquipes.size > 0 ? new Set() : new Set(equipeList))}>
                  {selEquipes.size > 0 ? 'Effacer' : 'Tout'}
                </button>
              </div>

              {equipeList.map(eq => {
                const color = EQUIPE_COLORS[equipeIndex(eq)];
                const count = equipeCtxMap.get(eq) ?? 0;
                return (
                  <label key={eq} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                    <Checkbox
                      size="small"
                      checked={selEquipes.has(eq)}
                      onChange={() => toggleEquipe(eq)}
                      sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color } }}
                    />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#334155', flex: 1 }}>{equipeShort(eq)}</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: count > 0 ? '#64748b' : '#cbd5e1' }}>{count}</span>
                  </label>
                );
              })}

              {selEquipes.size > 0 && (
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
                  {selEquipes.size} équipe{selEquipes.size > 1 ? 's' : ''} sélectionnée{selEquipes.size > 1 ? 's' : ''}
                </p>
              )}
            </DropPanel>
          )}
        </div>

        {/* ── Filtrer par essence ─────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          <FilterBtn
            label="Formation"
            active={openPanel === 'essences' || selEssences.size > 0}
            badge={selEssences.size || undefined}
            onClick={() => togglePanel('essences')}
          />
          {openPanel === 'essences' && (
            <DropPanel style={{ maxHeight: 380, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ ...SECTION_LABEL, marginBottom: 0 }}>Filtrer par formation</p>
                <button style={miniBtn} onClick={() => setSelEssences(selEssences.size > 0 ? new Set() : new Set(essenceList))}>
                  {selEssences.size > 0 ? 'Effacer' : 'Tout'}
                </button>
              </div>

              {essenceList.map(s => {
                const color = essenceColors.get(s) ?? '#94a3b8';
                const count = essenceCtxMap.get(s) ?? 0;
                return (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                    <Checkbox
                      size="small"
                      checked={selEssences.has(s)}
                      onChange={() => toggleEssence(s)}
                      sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color } }}
                    />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#334155', flex: 1 }}>{s}</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: count > 0 ? '#64748b' : '#cbd5e1' }}>{count}</span>
                  </label>
                );
              })}

              {selEssences.size > 0 && (
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
                  {selEssences.size} essence{selEssences.size > 1 ? 's' : ''} sélectionnée{selEssences.size > 1 ? 's' : ''}
                </p>
              )}
            </DropPanel>
          )}
        </div>

        {/* ── Filtrer par accessibilité ───────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          <FilterBtn
            label="Accessibilité"
            active={openPanel === 'accessibilite' || selAccessibilite.size > 0}
            badge={selAccessibilite.size || undefined}
            onClick={() => togglePanel('accessibilite')}
          />
          {openPanel === 'accessibilite' && (
            <DropPanel>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ ...SECTION_LABEL, marginBottom: 0 }}>Filtrer par accessibilité</p>
                {selAccessibilite.size > 0 && (
                  <button style={miniBtn} onClick={() => setSelAccessibilite(new Set())}>Effacer</button>
                )}
              </div>
              {[
                { key: '1',    label: 'Accessible',      color: '#06b6d4' },
                { key: '0',    label: 'Non accessible',  color: '#ef4444' },
                { key: 'null', label: 'Non réalisées',   color: '#94a3b8' },
              ].map(({ key, label, color }) => {
                const count = allFeatures.filter(f => String(f.properties.accessibilite) === key).length;
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                    <Checkbox
                      size="small"
                      checked={selAccessibilite.has(key)}
                      onChange={() => setSelAccessibilite(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                      sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color } }}
                    />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#334155', flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: count > 0 ? '#64748b' : '#cbd5e1' }}>{count}</span>
                  </label>
                );
              })}
            </DropPanel>
          )}
        </div>

        </div>{/* end left group */}

        {/* ── Right: count + reset ───────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />

          {/* Count chip */}
          <div style={{
            background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20,
            height: 26, padding: '0 10px', display: 'flex', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>
              {loading ? 'Chargement…' : `${filtered.length.toLocaleString()} placette${filtered.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Reset filters — standalone icon button, only when filters active */}
          {hasFilters && (
            <button
              onClick={() => { setSelStatuts(new Set()); setSelEquipes(new Set()); setSelEssences(new Set()); setSelAccessibilite(new Set()); }}
              title="Réinitialiser les filtres"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 8,
                background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', padding: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          )}
        </div>{/* end right group */}

      </div>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0, position: 'relative',
        borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0',
        touchAction: 'none',
      }}>

        {/* ── Floating map legend (collapsible) ───────────────────────────── */}
        {!loading && (
          <div style={{
            position: 'absolute', top: 60, right: 12, zIndex: 1000,
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
            borderRadius: 10, border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: legendOpen ? 165 : 'auto',
            overflow: 'hidden',
          }}>
            {/* Header — always visible */}
            <div
              onClick={() => setLegendOpen(o => !o)}
              title={legendOpen ? undefined : 'Légende'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8, padding: '7px 11px', cursor: 'pointer',
                borderBottom: legendOpen ? '1px solid #f1f5f9' : 'none',
                background: legendOpen ? '#f8fafc' : 'transparent',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" style={{ flexShrink: 0 }}>
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <circle cx="3" cy="6" r="1.5" fill="#475569" stroke="none"/><circle cx="3" cy="12" r="1.5" fill="#475569" stroke="none"/><circle cx="3" cy="18" r="1.5" fill="#475569" stroke="none"/>
              </svg>
              {legendOpen && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Légende
                </span>
              )}
              {legendOpen && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ marginLeft: 'auto' }}>
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              )}
            </div>

            {/* Body — collapsible */}
            {legendOpen && (
              <div style={{ padding: '8px 11px 10px' }}>
                <p style={{ fontSize: 9, color: '#94a3b8', marginBottom: 7, fontStyle: 'italic' }}>
                  {MODE_LABELS[classifyMode]}
                </p>

                {classifyMode === 'statut' && (
                  <>
                    {/* Réalisée — label only, no dot */}
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#1e293b', fontWeight: 600 }}>Réalisée</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, paddingLeft: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 10, color: '#475569' }}>Non contrôlée</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, paddingLeft: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 10, color: '#475569' }}>Contrôlée</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#bcc5d0', flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: '#1e293b', fontWeight: 600 }}>Non réalisée</span>
                    </div>
                  </>
                )}

                {classifyMode === 'equipe' && equipeList.map(eq => (
                  <div key={eq} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: EQUIPE_COLORS[equipeIndex(eq)], flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#334155' }}>{equipeShort(eq)}</span>
                  </div>
                ))}

                {classifyMode === 'essence' && essenceList.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: essenceColors.get(s) ?? '#94a3b8', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#334155' }}>{s}</span>
                  </div>
                ))}

                {classifyMode === 'accessibilite' && (
                  <>
                    {[
                      { color: '#06b6d4', label: 'Accessible' },
                      { color: '#ef4444', label: 'Non accessible' },
                      { color: '#bcc5d0', label: 'Non réalisées' },
                    ].map(({ color, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 11, color: '#334155' }}>{label}</span>
                      </div>
                    ))}
                  </>
                )}

              </div>
            )}
          </div>
        )}

        {/* ── Search widget — top-right, collapsed by default ─────────────── */}
        {!loading && (
          <div ref={searchRef} style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1001,
            width: searchExpanded ? 220 : 36,
            transition: 'width 0.2s ease',
          }}>
            {/* Input row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
              border: '1px solid #e2e8f0', borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              padding: searchExpanded ? '6px 10px' : '0',
              height: 36, overflow: 'hidden',
            }}>
              <button
                onClick={() => { setSearchExpanded(e => { if (e) { setSearchOpen(false); setSearchInput(''); } return !e; }); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 10px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                title="Rechercher une placette"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
              {searchExpanded && (
                <>
                  <input
                    autoFocus
                    value={searchInput}
                    onChange={e => { setSearchInput(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Rechercher une placette…"
                    style={{
                      border: 'none', outline: 'none', background: 'transparent',
                      fontSize: 11, color: '#334155', width: '100%',
                      fontFamily: 'inherit',
                    }}
                  />
                  {searchInput && (
                    <button onClick={() => { setSearchInput(''); setSelectedCode(null); setFlyTarget(null); }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}>
                      ×
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Dropdown */}
            {searchOpen && (
              <div style={{
                marginTop: 4, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(6px)',
                border: '1px solid #e2e8f0', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
                maxHeight: 240, overflowY: 'auto',
              }}>
                {searchResults.length === 0 ? (
                  <p style={{ fontSize: 11, color: '#94a3b8', padding: '10px 12px', margin: 0 }}>Aucun résultat</p>
                ) : searchResults.map(f => {
                  const isSelected = f.properties.num_placette === selectedCode;
                  const statut = f.properties.statut;
                  const dotColor = statut === 'visitee' ? '#10b981' : statut === 'controle' ? '#8b5cf6' : '#bcc5d0';
                  return (
                    <button key={f.properties.num_placette}
                      onMouseDown={() => {
                        const [lon, lat] = f.geometry.coordinates;
                        setSelectedCode(f.properties.num_placette);
                        setFlyTarget([lat, lon]);
                        setSearchInput(f.properties.num_placette);
                        setSearchOpen(false);
                        setSearchExpanded(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
                        padding: '7px 12px',
                        background: isSelected ? 'rgba(245,158,11,0.08)' : 'transparent',
                        borderLeft: isSelected ? '3px solid #f59e0b' : '3px solid transparent',
                      }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: '#1e293b', flex: 1 }}>
                        {f.properties.num_placette}
                      </span>
                      {f.properties.equipe && (
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>
                          {f.properties.equipe.match(/N°(\d+)/)?.[0] ?? ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(240,244,248,0.85)', backdropFilter: 'blur(2px)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid #e2e8f0', borderTopColor: '#059669',
              animation: 'spin 0.85s linear infinite',
            }} />
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 10 }}>Chargement de la carte…</p>
          </div>
        )}

        {error && !loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(240,244,248,0.9)',
          }}>
            <p style={{ color: '#dc2626', fontSize: 13 }}>Erreur : {error}</p>
          </div>
        )}

        <MapContainer center={[33.9, -6.0]} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl touchZoom scrollWheelZoom>
          <TileLayer
            key={basemap}
            url={BASEMAPS.find(b => b.id === basemap)!.url}
            attribution={BASEMAPS.find(b => b.id === basemap)!.attribution}
            maxZoom={BASEMAPS.find(b => b.id === basemap)!.maxZoom}
          />
          {basemap === 'esri-hybrid' && (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution=""
              maxZoom={19}
              opacity={1}
            />
          )}

          {!loading && filtered.length > 0 && <MapFitter features={filtered} />}
          <MapFlyer target={flyTarget} />
          <ResetView trigger={resetTrigger} features={allFeatures} />

          {!loading && filtered.map(f => {
            const [lon, lat] = f.geometry.coordinates;
            return (
              <Marker
                key={f.properties.num_placette}
                position={[lat, lon]}
                icon={getIconFn(f)}
              >
                <Popup minWidth={210} maxWidth={290} className="ifn-popup" autoPan autoPanPadding={[30, 30]}>
                  {buildPopupFn(f)}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* ── Basemap switcher — bottom-left ── */}
        <div style={{ position: 'absolute', bottom: 28, left: 10, zIndex: 1000 }}>
          {basemapOpen && (
            <div style={{
              marginBottom: 6, background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(6px)', borderRadius: 10,
              border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              overflow: 'hidden', minWidth: 160,
            }}>
              <div style={{ padding: '7px 12px 5px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9' }}>
                Fond de carte
              </div>
              {BASEMAPS.map(b => (
                <button key={b.id} onClick={() => { setBasemap(b.id); setBasemapOpen(false); }} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 12px', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontFamily: 'inherit',
                  background: basemap === b.id ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color:      basemap === b.id ? '#059669' : '#334155',
                  fontWeight: basemap === b.id ? 700 : 400,
                }}>
                  {basemap === b.id && <span style={{ marginRight: 6 }}>✓</span>}{b.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setBasemapOpen(o => !o)} title="Fond de carte" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 8,
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
              <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/>
            </svg>
          </button>
        </div>

        {/* ── Reset to initial view — bottom-right ── */}
        <button
          onClick={() => setResetTrigger(t => t + 1)}
          title="Vue initiale"
          style={{
            position: 'absolute', bottom: 28, right: 10, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 8,
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }


        /* ── Leaflet popup — light theme ── */
        .ifn-popup .leaflet-popup-content-wrapper {
          background: #ffffff !important;
          color: #1e293b !important;
          border-radius: 14px !important;
          box-shadow: 0 6px 24px rgba(0,0,0,0.12) !important;
          border: 1px solid #e2e8f0 !important;
          padding: 14px 16px !important;
        }
        .ifn-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: normal !important;
          color: #1e293b !important;
        }
        .ifn-popup .leaflet-popup-tip {
          background: #ffffff !important;
        }
        .ifn-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
          font-size: 18px !important;
          top: 6px !important;
          right: 10px !important;
          font-weight: 700 !important;
        }
        .ifn-popup .leaflet-popup-close-button:hover {
          color: #1e293b !important;
        }
      `}</style>
    </div>
  );
}
