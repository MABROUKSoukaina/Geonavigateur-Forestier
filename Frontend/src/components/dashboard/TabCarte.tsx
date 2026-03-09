import { useState, useEffect, useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import type { DashboardData } from '../../services/dashboardApi';
import { fetchMapGeoJson, type MapFeature } from '../../services/dashboardApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const EQUIPE_COLORS = ['#818cf8', '#4ade80', '#f59e0b', '#ef4444', '#38bdf8', '#c084fc'];

const STRATE_PALETTE = [
  '#0ea5e9', '#8b5cf6', '#f97316', '#10b981', '#ec4899',
  '#eab308', '#06b6d4', '#84cc16', '#f43f5e', '#a78bfa',
  '#fb923c', '#34d399', '#60a5fa', '#f472b6', '#a3e635',
];

const BASEMAPS = [
  { id: 'carto-light',   label: 'Carto Light',      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',  attribution: '© CARTO',         maxZoom: 19 },
  { id: 'google-hybrid', label: 'Google Hybrid',    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',              attribution: '© Google',        maxZoom: 20 },
  { id: 'google-sat',    label: 'Google Satellite', url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',              attribution: '© Google',        maxZoom: 20 },
  { id: 'osm',           label: 'OpenStreetMap',    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',               attribution: '© OpenStreetMap', maxZoom: 19 },
  { id: 'topo',          label: 'Topographie',      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                 attribution: '© OpenTopoMap',   maxZoom: 17 },
] as const;
type BasemapId = typeof BASEMAPS[number]['id'];

const STATUT_ITEMS = [
  { key: 'programmee', label: 'Non réalisée',               color: '#94a3b8' },
  { key: 'visitee',    label: 'Réalisée (non contrôlée)',   color: '#10b981' },
  { key: 'controle',   label: 'Placette contrôle',          color: '#8b5cf6' },
] as const;

type ClassifyMode = 'statut' | 'equipe' | 'strate';

const MODE_LABELS: Record<ClassifyMode, string> = {
  statut: 'Par statut (réalisé / non réalisé)',
  equipe: 'Par équipe',
  strate: 'Par strate',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function equipeIndex(name: string): number {
  const m = name.match(/N°0?(\d+)/);
  return m ? (parseInt(m[1]) - 1) % EQUIPE_COLORS.length : 0;
}

function equipeShort(name: string): string {
  const m = name.match(/Equipe\s+(.+?)\s+\(/);
  return m ? m[1] : name;
}

function markerColor(f: MapFeature, mode: ClassifyMode, strateColors: Map<string, string>): string {
  if (mode === 'equipe') return f.properties.equipe ? EQUIPE_COLORS[equipeIndex(f.properties.equipe)] : '#94a3b8';
  if (mode === 'strate') return (f.properties.strate && strateColors.get(f.properties.strate)) || '#94a3b8';
  if (f.properties.statut === 'visitee')  return '#10b981';
  if (f.properties.statut === 'controle') return '#8b5cf6';
  return '#94a3b8';
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
      { padding: [40, 40], maxZoom: 12 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features]);
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
      borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
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
  const [selStrates,   setSelStrates]   = useState<Set<string>>(new Set());
  const [selStatuts,   setSelStatuts]   = useState<Set<string>>(new Set());
  const [openPanel,    setOpenPanel]    = useState<'classifier' | 'statuts' | 'equipes' | 'strates' | null>(null);
  const [legendOpen,   setLegendOpen]   = useState(true);
  const [basemap,      setBasemap]      = useState<BasemapId>('carto-light');
  const [basemapOpen,  setBasemapOpen]  = useState(false);

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

  // Derived lists and color map
  const equipeList  = data.equipes.map(e => e.equipe);
  const strateList  = data.strates.map(s => s.strate);
  const strateColors = new Map(strateList.map((s, i) => [s, STRATE_PALETTE[i % STRATE_PALETTE.length]]));

  // Filtered features (multi-criteria AND)
  const filtered = allFeatures
    .filter(f => selStatuts.size === 0 || selStatuts.has(f.properties.statut))
    .filter(f => selEquipes.size === 0 || (f.properties.equipe != null && selEquipes.has(f.properties.equipe)))
    .filter(f => selStrates.size === 0 || (f.properties.strate != null && selStrates.has(f.properties.strate)));

  const hasFilters = selStatuts.size > 0 || selEquipes.size > 0 || selStrates.size > 0;

  // Context-aware counts: each dropdown shows counts filtered by the OTHER active filter
  const equipeCtxMap = new Map<string, number>();
  allFeatures
    .filter(f => selStrates.size === 0 || (f.properties.strate != null && selStrates.has(f.properties.strate)))
    .forEach(f => {
      if (f.properties.equipe)
        equipeCtxMap.set(f.properties.equipe, (equipeCtxMap.get(f.properties.equipe) ?? 0) + 1);
    });

  const strateCtxMap = new Map<string, number>();
  allFeatures
    .filter(f => selEquipes.size === 0 || (f.properties.equipe != null && selEquipes.has(f.properties.equipe)))
    .forEach(f => {
      if (f.properties.strate)
        strateCtxMap.set(f.properties.strate, (strateCtxMap.get(f.properties.strate) ?? 0) + 1);
    });

  function togglePanel(p: 'classifier' | 'statuts' | 'equipes' | 'strates'): void {
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

  function toggleStrate(s: string) {
    setSelStrates(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div ref={toolbarRef} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '8px 14px', flexShrink: 0, position: 'relative',
      }}>

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

              {(['statut', 'equipe', 'strate'] as ClassifyMode[]).map(m => (
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

        {/* ── Filtrer par strate ─────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
          <FilterBtn
            label="Strates"
            active={openPanel === 'strates' || selStrates.size > 0}
            badge={selStrates.size || undefined}
            onClick={() => togglePanel('strates')}
          />
          {openPanel === 'strates' && (
            <DropPanel style={{ maxHeight: 380, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ ...SECTION_LABEL, marginBottom: 0 }}>Filtrer par strate</p>
                <button style={miniBtn} onClick={() => setSelStrates(selStrates.size > 0 ? new Set() : new Set(strateList))}>
                  {selStrates.size > 0 ? 'Effacer' : 'Tout'}
                </button>
              </div>

              {strateList.map(s => {
                const color = strateColors.get(s) ?? '#94a3b8';
                const count = strateCtxMap.get(s) ?? 0;
                return (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                    <Checkbox
                      size="small"
                      checked={selStrates.has(s)}
                      onChange={() => toggleStrate(s)}
                      sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color } }}
                    />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#334155', flex: 1 }}>{s}</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: count > 0 ? '#64748b' : '#cbd5e1' }}>{count}</span>
                  </label>
                );
              })}

              {selStrates.size > 0 && (
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
                  {selStrates.size} strate{selStrates.size > 1 ? 's' : ''} sélectionnée{selStrates.size > 1 ? 's' : ''}
                </p>
              )}
            </DropPanel>
          )}
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 22, background: '#e2e8f0' }} />

        {/* Count chip */}
        <Chip
          label={loading ? 'Chargement…' : `${filtered.length.toLocaleString()} placette${filtered.length > 1 ? 's' : ''}`}
          size="small"
          sx={{ fontSize: 11, height: 26, bgcolor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
        />

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={() => { setSelStatuts(new Set()); setSelEquipes(new Set()); setSelStrates(new Set()); }}
            style={{
              background: 'none', border: '1px solid #fca5a5', borderRadius: 7,
              padding: '4px 10px', cursor: 'pointer', fontSize: 11,
              color: '#ef4444', fontWeight: 500,
            }}
          >
            Réinitialiser
          </button>
        )}

      </div>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0, position: 'relative',
        borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0',
      }}>

        {/* ── Floating map legend (collapsible) ───────────────────────────── */}
        {!loading && (
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1000,
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
            borderRadius: 10, border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: legendOpen ? 165 : 'auto',
            overflow: 'hidden',
          }}>
            {/* Header — always visible */}
            <div
              onClick={() => setLegendOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: '7px 11px', cursor: 'pointer',
                borderBottom: legendOpen ? '1px solid #f1f5f9' : 'none',
                background: legendOpen ? '#f8fafc' : 'transparent',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <circle cx="3" cy="6" r="1.5" fill="#475569" stroke="none"/><circle cx="3" cy="12" r="1.5" fill="#475569" stroke="none"/><circle cx="3" cy="18" r="1.5" fill="#475569" stroke="none"/>
              </svg>
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
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', flexShrink: 0, display: 'inline-block' }} />
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

                {classifyMode === 'strate' && strateList.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: strateColors.get(s) ?? '#94a3b8', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#334155' }}>{s}</span>
                  </div>
                ))}

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

        <MapContainer center={[33.9, -6.0]} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer
            key={basemap}
            url={BASEMAPS.find(b => b.id === basemap)!.url}
            attribution={BASEMAPS.find(b => b.id === basemap)!.attribution}
            maxZoom={BASEMAPS.find(b => b.id === basemap)!.maxZoom}
          />

          {!loading && filtered.length > 0 && <MapFitter features={filtered} />}

          {filtered.map(f => {
            const [lon, lat] = f.geometry.coordinates;
            const color      = markerColor(f, classifyMode, strateColors);
            const statut     = f.properties.statut;
            const isVisitee  = statut === 'visitee';
            const isControle = statut === 'controle';
            const isDone     = isVisitee || isControle;
            const badgeLabel = isControle ? 'Contrôle ✓' : isVisitee ? 'Visitée ✓' : 'Programmée';
            const badgeBg    = isControle ? 'rgba(139,92,246,0.25)' : isVisitee ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.2)';
            const badgeColor = isControle ? '#c4b5fd' : isVisitee ? '#6ee7b7' : '#cbd5e1';
            return (
              <CircleMarker
                key={f.properties.num_placette}
                center={[lat, lon]}
                radius={3}
                pathOptions={{
                  color, fillColor: color,
                  fillOpacity: isDone ? 0.88 : 0.45,
                  weight:      isDone ? 1.5 : 1,
                }}
              >
                <Popup minWidth={210} className="ifn-popup" autoPan autoPanPadding={[30, 30]}>
                  <div style={{ fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 9, paddingBottom: 8, borderBottom: '1px solid #e2e8f0',
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                        {f.properties.num_placette}
                      </span>
                      {isDone && (
                        <span style={{
                          marginLeft: 'auto', marginRight: 20, fontSize: 10, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 20,
                          background: isControle ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)',
                          color: isControle ? '#7c3aed' : '#059669',
                        }}>
                          {badgeLabel}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 14px', fontSize: 12 }}>
                      {f.properties.equipe && <>
                        <span style={{ color: '#94a3b8' }}>Équipe</span>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{equipeShort(f.properties.equipe)}</span>
                      </>}
                      {f.properties.strate && <>
                        <span style={{ color: '#94a3b8' }}>Strate</span>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.strate}</span>
                      </>}
                      {f.properties.dpanef && <>
                        <span style={{ color: '#94a3b8' }}>DPANEF</span>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.dpanef}</span>
                      </>}
                      {f.properties.altitude != null && <>
                        <span style={{ color: '#94a3b8' }}>Altitude</span>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.altitude} m</span>
                      </>}
                      {f.properties.pente != null && <>
                        <span style={{ color: '#94a3b8' }}>Pente</span>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.pente}°</span>
                      </>}
                      {f.properties.distance_repere != null && <>
                        <span style={{ color: '#94a3b8' }}>Dist. repère</span>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{f.properties.distance_repere} m</span>
                      </>}
                    </div>
                    {f.properties.description_repere && (
                      <div style={{ marginTop: 8, paddingTop: 7, fontSize: 10.5, color: '#64748b', borderTop: '1px solid #e2e8f0', lineHeight: 1.45 }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>Repère : </span>{f.properties.description_repere}
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
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
