import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type {
  DashboardData, AvancementEquipe, AvancementEssence, AccessibiliteEquipe, ProductiviteEquipe, StrateParEquipe, MoyJourEquipe,
} from '../../services/dashboardApi';
import { fetchDashboardData, importPlotsCsv } from '../../services/dashboardApi';
import { TabCarte } from './TabCarte';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EQUIPE_COLORS = ['#a5b4fc', '#86efac', '#fbbf24', '#f472b6', '#7dd3fc', '#d8b4fe'];
const BAR_COLORS    = ['#86efac', '#7dd3fc', '#fbbf24', '#d8b4fe', '#f87171', '#fdba74'];
const ESSENCE_COLORS = [
  '#38bdf8', '#d946ef', '#fb923c', '#34d399', '#f472b6',
  '#facc15', '#22d3ee', '#bef264', '#fb7185', '#c4b5fd',
  '#fdba74', '#6ee7b7', '#93c5fd', '#f9a8d4', '#bef264',
];


function equipeNum(name: string): number {
  const m = name.match(/N°0?(\d+)/);
  return m ? parseInt(m[1]) : 99;
}
function equipeIndex(name: string): number { return (equipeNum(name) - 1) % EQUIPE_COLORS.length; }
function lightenHex(hex: string, factor = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * factor));
  const ng = Math.min(255, Math.round(g + (255 - g) * factor));
  const nb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}
function equipeColor(name: string): string {
  const base = EQUIPE_COLORS[equipeIndex(name)];
  if (name.includes('Maâmora') || name.includes('Maamora')) return lightenHex(base);
  return base;
}
function equipeShort(name: string): string {
  const m = name.match(/Equipe\s+(.+?)\s+\(/);
  const s = m ? m[1] : name;
  return s.replace(/_\w+$/, ''); // strip _Romani, _xxx suffixes
}
function sortByNum<T extends { equipe: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => equipeNum(a.equipe) - equipeNum(b.equipe));
}

// ─── Base styles ──────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed' as const, inset: 0, zIndex: 3000,
    display: 'flex', flexDirection: 'column' as const,
    background: '#0d1b2a', color: '#edf1f5',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(16,185,129,0.07) 0%, transparent 100%)',
    flexShrink: 0,
  },
  card: {
    background: '#162035', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 24,
  },
  innerCard: {
    background: '#0b1629', borderRadius: 10, padding: '8px 12px',
  },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#94a3b8', padding: 8, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, lineHeight: 1,
    transition: 'color 0.2s, background 0.2s',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 80, stroke = 6, color = '#86efac' }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}

function BarH({ label, value, max, count, color = '#86efac' }: {
  label: string; value: number; max: number; count?: number; color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: '#dde4ec', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{label}</span>
        <span style={{ color: '#bac4d0', fontFamily: 'monospace', fontSize: 11, flexShrink: 0 }}>
          {count !== undefined ? `${value}/${count}` : value}
          <span style={{ marginLeft: 4, color: '#94a3b8' }}>({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color = '#e4e7ef', sub }: {
  label: string; value: string | number; color?: string; sub?: string;
}) {
  return (
    <div style={{ background: '#0b1629', borderRadius: 10, padding: 12, textAlign: 'center' }}>
      <p style={{ fontSize: 10, color: '#bac4d0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#edf1f5', margin: 0 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Donut chart — team distribution ─────────────────────────────────────────

function DonutChart({ equipes, totalOverride }: { equipes: AvancementEquipe[]; totalOverride?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 180, cx = size / 2, cy = size / 2, outerR = 74, innerR = 46;
  const total = totalOverride ?? equipes.reduce((s, eq) => s + eq.total_affecte, 0);
  if (total === 0) return null;

  let angle = -Math.PI / 2;
  const slices = equipes.map(eq => {
    const sweep = (eq.total_affecte / total) * 2 * Math.PI;
    const mid = angle + sweep / 2;
    const a0 = angle, a1 = angle + sweep;
    angle = a1;
    const color = EQUIPE_COLORS[equipeIndex(eq.equipe)];
    const pct   = (eq.total_affecte / total) * 100;
    if (sweep >= 2 * Math.PI - 0.001) return { eq, color, pct, mid, isCircle: true, d: '' };
    const large = sweep > Math.PI ? 1 : 0;
    const ox0 = cx + outerR * Math.cos(a0), oy0 = cy + outerR * Math.sin(a0);
    const ox1 = cx + outerR * Math.cos(a1), oy1 = cy + outerR * Math.sin(a1);
    const ix0 = cx + innerR * Math.cos(a0), iy0 = cy + innerR * Math.sin(a0);
    const ix1 = cx + innerR * Math.cos(a1), iy1 = cy + innerR * Math.sin(a1);
    const d = `M ${ix0} ${iy0} L ${ox0} ${oy0} A ${outerR} ${outerR} 0 ${large} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix0} ${iy0} Z`;
    return { eq, color, pct, mid, isCircle: false, d };
  });

  const hov = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Donut */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          {slices.map((s, i) => {
            const isHov = hovered === i;
            const dx = isHov ? Math.cos(s.mid) * 7 : 0;
            const dy = isHov ? Math.sin(s.mid) * 7 : 0;
            return s.isCircle ? (
              <g key={i}>
                <circle cx={cx} cy={cy} r={outerR} fill={s.color} />
                <circle cx={cx} cy={cy} r={innerR} fill="#0d1b2a" />
              </g>
            ) : (
              <path
                key={i} d={s.d} fill={s.color} stroke="#0d1b2a"
                strokeWidth={isHov ? 3 : 2.5}
                style={{
                  cursor: 'pointer',
                  transform: `translate(${dx}px, ${dy}px)`,
                  transition: 'transform 0.18s ease, opacity 0.18s',
                  opacity: hovered !== null && !isHov ? 0.45 : 1,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        {/* Center label */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {hov ? (
            <>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 17, color: hov.color, transition: 'color 0.15s' }}>
                {hov.eq.total_affecte}
              </span>
              <span style={{ fontSize: 10, color: hov.color, opacity: 0.8, marginTop: 1 }}>{hov.pct.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color: '#edf1f5' }}>{total.toLocaleString()}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>placettes</span>
            </>
          )}
        </div>
      </div>

      {/* Legend — bottom, wrapping */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', justifyContent: 'center', width: '100%' }}>
        {slices.map((s, i) => (
          <div
            key={s.eq.equipe}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              opacity: hovered !== null && hovered !== i ? 0.4 : 1,
              transition: 'opacity 0.18s',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#dde4ec' }}>{equipeShort(s.eq.equipe)}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8' }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Donut chart — essence distribution ──────────────────────────────────────

function EssenceDonutChart({ essences }: { essences: AvancementEssence[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const sorted = [...essences].sort((a, b) => {
    if (a.essence === 'Non recensé') return 1;
    if (b.essence === 'Non recensé') return -1;
    return b.total_visite - a.total_visite;
  });
  const size = 180, cx = size / 2, cy = size / 2, outerR = 74, innerR = 46;
  const total = sorted.reduce((s, e) => s + e.total_visite, 0);
  if (total === 0) return null;

  let angle = -Math.PI / 2;
  const slices = sorted.map((ess, i) => {
    const sweep = (ess.total_visite / total) * 2 * Math.PI;
    const mid = angle + sweep / 2;
    const a0 = angle, a1 = angle + sweep;
    angle = a1;
    const color = ess.essence === 'Non recensé' ? '#94a3b8' : ESSENCE_COLORS[i % ESSENCE_COLORS.length];
    const pct   = (ess.total_visite / total) * 100;
    if (sweep >= 2 * Math.PI - 0.001) return { ess, color, pct, mid, isCircle: true, d: '' };
    const large = sweep > Math.PI ? 1 : 0;
    const ox0 = cx + outerR * Math.cos(a0), oy0 = cy + outerR * Math.sin(a0);
    const ox1 = cx + outerR * Math.cos(a1), oy1 = cy + outerR * Math.sin(a1);
    const ix0 = cx + innerR * Math.cos(a0), iy0 = cy + innerR * Math.sin(a0);
    const ix1 = cx + innerR * Math.cos(a1), iy1 = cy + innerR * Math.sin(a1);
    const d = `M ${ix0} ${iy0} L ${ox0} ${oy0} A ${outerR} ${outerR} 0 ${large} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix0} ${iy0} Z`;
    return { ess, color, pct, mid, isCircle: false, d };
  });

  const hov = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Donut */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          {slices.map((s, i) => {
            const isHov = hovered === i;
            const dx = isHov ? Math.cos(s.mid) * 7 : 0;
            const dy = isHov ? Math.sin(s.mid) * 7 : 0;
            return s.isCircle ? (
              <g key={i}>
                <circle cx={cx} cy={cy} r={outerR} fill={s.color} />
                <circle cx={cx} cy={cy} r={innerR} fill="#0d1b2a" />
              </g>
            ) : (
              <path
                key={i} d={s.d} fill={s.color} stroke="#0d1b2a"
                strokeWidth={isHov ? 3 : 2.5}
                style={{
                  cursor: 'pointer',
                  transform: `translate(${dx}px, ${dy}px)`,
                  transition: 'transform 0.18s ease, opacity 0.18s',
                  opacity: hovered !== null && !isHov ? 0.45 : 1,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        {/* Center label */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {hov ? (
            <>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: hov.color }}>{hov.ess.total_visite}</span>
              <span style={{ fontSize: 9, color: hov.color, opacity: 0.8, marginTop: 1 }}>{hov.pct.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color: '#edf1f5' }}>{total.toLocaleString()}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>visitées</span>
            </>
          )}
        </div>
      </div>

      {/* Legend — bottom, wrapping, scrollable */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', width: '100%', maxHeight: 120, overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {slices.map((s, i) => (
          <div
            key={s.ess.essence}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              opacity: hovered !== null && hovered !== i ? 0.4 : 1,
              transition: 'opacity 0.18s',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#dde4ec' }}>{s.ess.essence}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8' }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TabGlobal({ data }: { data: DashboardData }) {
  const { kpi, essences } = data;
  const pct = Number(kpi.pct_avancement);
  const topEssences = essences.slice(0, 4);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Avancement global">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ProgressRing pct={pct} size={120} stroke={10} color="#10b981" />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 22, color: '#10b981' }}>{pct.toFixed(1)}%</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
            <StatBox label="Programmées" value={kpi.total_programme} color="#7a8a9c" />
            <StatBox label="Réalisées" value={kpi.total_visitees} color="#10b981" />
            <StatBox label="Restantes" value={kpi.restantes ?? kpi.total_programme - kpi.total_visitees} color="#ef4444" />
            <StatBox label="Jours terrain" value={kpi.nb_jours_terrain} color="#0ea5e9" />
          </div>
        </div>
      </Card>

      <Card title="Top essences réalisées">
        {topEssences.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Aucune essence réalisée</p>
        ) : (
          topEssences.map((e, i) => (
            <BarH key={e.essence}
              label={e.essence}
              value={e.total_visite} max={essences[0]?.total_visite ?? 1}
              color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))
        )}
      </Card>
    </div>
  );
}

function TabEquipe({ data }: { data: DashboardData }) {
  const equipes = sortByNum(data.equipes);
  const totalProgramme = data.kpi.total_programme;
  const productivite = sortByNum(data.temporel.productivite);
  const moyGlobale = productivite.length > 0
    ? productivite.reduce((s: number, eq: ProductiviteEquipe) => s + Number(eq.moy_par_jour || 0), 0) / productivite.length
    : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {equipes.map((eq: AvancementEquipe) => {
          const color = equipeColor(eq.equipe);
          const pct = Number(eq.pct_avancement);
          return (
            <div key={eq.equipe}
              style={{ ...S.card, position: 'relative', overflow: 'hidden', padding: 20 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>N°{equipeIndex(eq.equipe) + 1}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color }}>{equipeShort(eq.equipe)}</p>
                </div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <ProgressRing pct={pct} size={56} stroke={5} color={color} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color }}>{pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', fontSize: 11 }}>
                {[
                  { label: 'Total', val: eq.total_affecte, color: undefined },
                  { label: 'Réalisées', val: eq.total_visite, color: '#10b981' },
                  { label: 'Restantes', val: eq.restantes, color: '#f87171' },
                ].map(({ label, val, color: c }) => (
                  <div key={label} style={{ background: '#0b1629', borderRadius: 8, padding: '8px 4px' }}>
                    <p style={{ color: '#94a3b8', fontSize: 9, marginBottom: 2 }}>{label}</p>
                    <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: c ?? '#edf1f5' }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Per-team productivity */}
      <Card title="Moyenne des placettes réalisées par équipe">
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', top: -38, right: 0, zIndex: 1,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.4)',
            borderRadius: 8, padding: '3px 10px',
          }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#93c5fd' }}>{moyGlobale.toFixed(1)}</span>
            <span style={{ fontSize: 10, color: '#93c5fd' }}>moyenne globale / jour</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {productivite.map((eq: ProductiviteEquipe) => {
            const color = equipeColor(eq.equipe);
            return (
              <div key={eq.equipe} style={{ ...S.innerCard, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{equipeShort(eq.equipe)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 24, color }}>{Number(eq.moy_par_jour).toFixed(1)}</span>
                  <span style={{ color: '#7a8a9c', fontSize: 12 }}>/ jour</span>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8' }}>
                  {eq.total_visite} réalisées · {eq.nb_jours} jours travaillés
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Répartition des placettes par équipe">
        <DonutChart equipes={equipes} totalOverride={totalProgramme} />
      </Card>

      <Card title="Essences collectées par équipe">
        <StrateParEquipeChart rows={data.stratesParEquipe} />
      </Card>

      <Card title="Distribution des essences réalisées">
        <EssenceDonutChart essences={data.essences} />
      </Card>
    </div>
  );
}

// ─── Stacked bar: essences collected per équipe ───────────────────────────────

const STRATE_COLORS = [
  '#38bdf8', '#d946ef', '#fb923c', '#34d399', '#f472b6',
  '#facc15', '#22d3ee', '#fb7185', '#c4b5fd', '#fdba74',
  '#6ee7b7', '#93c5fd', '#f9a8d4', '#bef264', '#86efac',
];

function StrateParEquipeChart({ rows }: { rows: StrateParEquipe[] }) {
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; equipe: string; essence: string; n: number } | null>(null);

  if (rows.length === 0) return <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>Aucune donnée</p>;

  // Unique essences sorted by total desc
  const essTotal: Record<string, number> = {};
  rows.forEach(r => { essTotal[r.essence] = (essTotal[r.essence] ?? 0) + r.nb_visite; });
  const allEss = Object.entries(essTotal).sort((a, b) => {
    if (a[0] === 'Non recensé') return 1;
    if (b[0] === 'Non recensé') return -1;
    return b[1] - a[1];
  }).map(([e]) => e);
  const essColor = Object.fromEntries(allEss.map((e, i) => [e, e === 'Non recensé' ? '#94a3b8' : STRATE_COLORS[i % STRATE_COLORS.length]]));

  // Pivot: equipe → { essence: count }
  const pivot: Record<string, Record<string, number>> = {};
  rows.forEach(r => {
    if (!pivot[r.equipe]) pivot[r.equipe] = {};
    pivot[r.equipe][r.essence] = r.nb_visite;
  });
  // Sort equipes by N° number
  const byNum = (name: string) => parseInt(name.match(/N°(\d+)/)?.[1] ?? '99');
  const equipes = Object.keys(pivot).sort((a, b) => byNum(a) - byNum(b));
  const totals = Object.fromEntries(
    equipes.map(eq => [eq, allEss.reduce((s, e) => s + (pivot[eq][e] ?? 0), 0)])
  );
  const yMax = Math.max(...Object.values(totals), 1);

  // Extract "N°02" (no /26) and the city noun from full equipe name
  const getNum  = (name: string) => { const m = name.match(/N°(\d+)/); return m ? `N°${m[1]}` : ''; };
  const getNoun = (name: string) => {
    let s = name.replace(/^Equipe\s+/, '').replace(/\s*\(N°[^)]+\)/, '').trim();
    if (s.startsWith('Khémisset-')) s = s.slice('Khémisset-'.length);
    if (s.includes('_')) s = s.slice(s.lastIndexOf('_') + 1);
    return s;
  };

  // Vertical stacked bar layout — fits container, no scroll
  const ML = 36, MR = 16, MT = 24, MB = 48;
  const cH = 220;
  const VH = MT + cH + MB;
  const VW = 560; // fixed — fills the card
  const cW = VW - ML - MR;
  const BAR_W  = Math.min(52, Math.floor(cW / equipes.length * 0.55));
  const BAR_GAP = Math.floor(cW / equipes.length) - BAR_W;

  const toX  = (i: number) => ML + i * (BAR_W + BAR_GAP) + BAR_GAP / 2;
  const toY  = (v: number) => MT + cH - (v / yMax) * cH;
  const Y_TICKS = 5;
  const TW = 170, TH = 44;

  return (
    <div style={{ position: 'relative' }}>
      <div>
        <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block', overflow: 'visible' }}>

          {/* Y grid + axis */}
          {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
            const val = Math.round((yMax * i) / Y_TICKS);
            const y   = toY(val);
            return (
              <g key={i}>
                <line x1={ML} x2={VW - MR} y1={y} y2={y}
                  stroke={i === 0 ? '#94a3b8' : 'rgba(255,255,255,0.08)'} strokeWidth={i === 0 ? 1.5 : 1} />
                <text x={ML - 5} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#7a8a9c">{val}</text>
              </g>
            );
          })}

          {/* Vertical stacked bars */}
          {equipes.map((eq, i) => {
            const bx = toX(i);
            let cumY = MT + cH; // build upward
            return (
              <g key={eq}>
                {allEss.map(e => {
                  const n = pivot[eq][e] ?? 0;
                  if (n === 0) return null;
                  const bh = (n / yMax) * cH;
                  cumY -= bh;
                  const segY = cumY;
                  return (
                    <rect key={e} x={bx} y={segY} width={BAR_W} height={bh}
                      fill={essColor[e]} rx={0} opacity={0.88}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={ev => setTooltip({ cx: ev.clientX, cy: ev.clientY, equipe: eq, essence: e, n })}
                      onMouseLeave={() => setTooltip(null)} />
                  );
                })}

                {/* Total above bar */}
                <text x={bx + BAR_W / 2} y={toY(totals[eq]) - 5}
                  textAnchor="middle" fontSize={10} fill="#bac4d0" fontWeight="700">
                  {totals[eq]}
                </text>

                {/* Equipe number — centered, straight */}
                <text x={bx + BAR_W / 2} y={MT + cH + 14}
                  textAnchor="middle" fontSize={10} fill="#bac4d0" fontWeight="600">
                  {getNum(eq)}
                </text>
                {/* Equipe noun — horizontal, smaller font */}
                <text x={bx + BAR_W / 2} y={MT + cH + 28}
                  textAnchor="middle" fontSize={8.5} fill="#dde4ec">
                  {getNoun(eq)}
                </text>
              </g>
            );
          })}

        </svg>
      </div>

      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.cx - TW / 2, top: tooltip.cy - TH - 10,
          width: TW, background: 'rgba(30,41,59,0.93)', borderRadius: 6,
          padding: '7px 12px', pointerEvents: 'none', zIndex: 9999,
        }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4 }}>{getNoun(tooltip.equipe)}</div>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, textAlign: 'center' }}>{tooltip.essence} — {tooltip.n} placettes</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8, justifyContent: 'center' }}>
        {allEss.map(e => (
          <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#bac4d0' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: essColor[e], flexShrink: 0 }} />
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}


function fmtDate(raw: string): string {
  const d = new Date(raw);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function getYear(raw: string): number {
  return new Date(raw).getFullYear();
}

const BAR_STEP = 28; // px per day — stays constant regardless of day count

function DailyBarChart({ days }: { days: { date_visite: string; nb_placettes: number; cumul_placettes: number }[] }) {
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; label: string; daily: number; cumul: number } | null>(null);

  if (days.length === 0) return <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>Aucune donnée</p>;

  const ML = 44, MR = 56, MT = 20, MB = 48; // MB for slanted labels
  const VH = 300;
  const cH = VH - MT - MB;

  // Fixed bar step — chart grows horizontally, container scrolls
  const cW   = days.length * BAR_STEP;
  const VW   = cW + ML + MR;
  const barW = BAR_STEP * 0.6;

  const maxDaily = Math.max(...days.map(d => d.nb_placettes), 1);
  const maxCumul = Math.max(...days.map(d => d.cumul_placettes), 1);
  const yMaxL = Math.ceil(maxDaily / 5) * 5;
  const yMaxR = Math.ceil(maxCumul / 10) * 10;
  const Y_TICKS = 5;

  // Label every 7 days to avoid overlap
  const labelStep = days.length > 60 ? 14 : days.length > 20 ? 7 : 1;

  const toX  = (i: number) => ML + (i + 0.5) * BAR_STEP;
  const toYL = (v: number) => MT + cH - (v / yMaxL) * cH;
  const toYR = (v: number) => MT + cH - (v / yMaxR) * cH;

  const linePoints = days.map((d, i) => `${toX(i)},${toYR(d.cumul_placettes)}`).join(' ');

  const TW = 160, TH = 52;

  return (
    // Outer div: sticky Y-axes, horizontal scroll on the chart body
    <div style={{ position: 'relative' }}>
      <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 4 }}>
        <svg width={VW} height={VH} style={{ display: 'block', overflow: 'visible', minWidth: VW }}>

          {/* Grid + left Y axis */}
          {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
            const val = Math.round((yMaxL * i) / Y_TICKS);
            const y   = toYL(val);
            return (
              <g key={i}>
                <line x1={ML} x2={VW - MR} y1={y} y2={y}
                  stroke={i === 0 ? '#94a3b8' : 'rgba(255,255,255,0.08)'} strokeWidth={i === 0 ? 1.5 : 1} />
                <text x={ML - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#7a8a9c">{val}</text>
              </g>
            );
          })}

          {/* Right Y axis (cumulative) */}
          {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
            const val = Math.round((yMaxR * i) / Y_TICKS);
            const y   = toYR(val);
            return (
              <text key={i} x={VW - MR + 6} y={y} textAnchor="start" dominantBaseline="middle" fontSize={10} fill="#0ea5e9">{val}</text>
            );
          })}

          {/* Bars */}
          {days.map((d, i) => {
            const bh = Math.max((d.nb_placettes / yMaxL) * cH, 2);
            const bx = toX(i) - barW / 2;
            const by = toYL(d.nb_placettes);
            return (
              <rect key={d.date_visite} x={bx} y={by} width={barW} height={bh}
                fill="#34d399" rx={2} opacity={0.82}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => setTooltip({ cx: e.clientX, cy: e.clientY, label: fmtDate(d.date_visite), daily: d.nb_placettes, cumul: d.cumul_placettes })}
                onMouseLeave={() => setTooltip(null)} />
            );
          })}

          {/* Cumulative line */}
          <polyline points={linePoints} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {days.map((d, i) => (
            <circle key={d.date_visite} cx={toX(i)} cy={toYR(d.cumul_placettes)} r={3}
              fill="#0ea5e9" stroke="#0d1b2a" strokeWidth={1.5}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => setTooltip({ cx: e.clientX, cy: e.clientY, label: fmtDate(d.date_visite), daily: d.nb_placettes, cumul: d.cumul_placettes })}
              onMouseLeave={() => setTooltip(null)} />
          ))}

          {/* X axis labels — slanted DD/MM, every N days */}
          {days.map((d, i) => {
            if (i % labelStep !== 0) return null;
            const lx = toX(i);
            const ly = MT + cH + 12;
            return (
              <text key={d.date_visite}
                x={lx} y={ly}
                textAnchor="end" fontSize={10} fill="#7a8a9c"
                transform={`rotate(-45, ${lx}, ${ly})`}>
                {fmtDate(d.date_visite)}
              </text>
            );
          })}

          {/* Year boundary markers — vertical dashed line + year label */}
          {days.map((d, i) => {
            if (i === 0) return null;
            const prevYear = getYear(days[i - 1].date_visite);
            const curYear  = getYear(d.date_visite);
            if (prevYear === curYear) return null;
            const lx = toX(i) - BAR_STEP / 2;
            return (
              <g key={`year-${i}`}>
                <line x1={lx} x2={lx} y1={MT} y2={MT + cH}
                  stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />
                <text x={lx + 4} y={MT + 10} fontSize={10} fill="#bac4d0" fontWeight="600">
                  {curYear}
                </text>
              </g>
            );
          })}

          {/* Year label at start (always shown) */}
          <text x={ML + 4} y={MT + 10} fontSize={10} fill="#bac4d0" fontWeight="600">
            {getYear(days[0].date_visite)}
          </text>

        </svg>
      </div>

      {/* Legend — centered below chart, outside scroll */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 8, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, background: '#34d399', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: '#7a8a9c' }}>Placettes / jour</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width={8} height={8}><circle cx={4} cy={4} r={4} fill="#0ea5e9" /></svg>
          <span style={{ fontSize: 11, color: '#0ea5e9' }}>Cumul</span>
        </div>
      </div>

      {/* Tooltip — fixed to viewport so it never gets clipped by scroll */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.cx - TW / 2,
          top: tooltip.cy - TH - 10,
          width: TW,
          background: 'rgba(30,41,59,0.93)',
          borderRadius: 6,
          padding: '7px 12px',
          pointerEvents: 'none',
          zIndex: 9999,
        }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4 }}>{tooltip.label}</div>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, textAlign: 'center' }}>{tooltip.daily} placettes — cumul {tooltip.cumul}</div>
        </div>
      )}
      {/* Scroll hint — only shown when chart overflows */}
      {days.length > 20 && (
        <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>
          ← défiler pour voir tous les jours ({days.length} jours)
        </p>
      )}
    </div>
  );
}

// ─── Mini bar chart — one per team ───────────────────────────────────────────

const MINI_BAR_STEP = 20;

function MiniTeamBarChart({ days, color, fullWidth = false }: {
  days: { date_visite: string; nb_visite: number }[];
  color: string;
  fullWidth?: boolean;
}) {
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; label: string; n: number; cumul: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  useEffect(() => {
    if (!fullWidth) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width));
    ro.observe(el);
    setContainerW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [fullWidth]);

  if (days.length === 0) return (
    <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>Aucune donnée</p>
  );

  const ML = 32, MR = 36, MT = 12, MB = 36;
  const VH = fullWidth ? 260 : 180;
  const cH = VH - MT - MB;

  // In fullWidth mode: derive step from measured container width so bars fill edge-to-edge
  const STEP = fullWidth && containerW > 0
    ? (containerW - ML - MR) / days.length
    : MINI_BAR_STEP;
  const cW = days.length * STEP;
  const VW = fullWidth && containerW > 0 ? containerW : cW + ML + MR;
  const barW = STEP * 0.6;

  const maxVal = Math.max(...days.map(d => d.nb_visite), 1);
  const yMax   = Math.ceil(maxVal / 3) * 3 || 3;
  const Y_TICKS = 3;

  let cumul = 0;
  const cumulArr = days.map(d => { cumul += d.nb_visite; return cumul; });
  const maxCumul = cumulArr[cumulArr.length - 1] || 1;

  const labelStep = days.length > 30 ? 7 : days.length > 14 ? 3 : 1;

  const toX  = (i: number) => ML + (i + 0.5) * STEP;
  const toYL = (v: number) => MT + cH - (v / yMax) * cH;
  const toYR = (v: number) => MT + cH - (v / maxCumul) * cH;

  const linePoints = cumulArr.map((c, i) => `${toX(i)},${toYR(c)}`).join(' ');
  const TW = 130, TH = 44;

  const svgEl = (
    <svg
      width={fullWidth ? '100%' : VW}
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ display: 'block', overflow: 'visible', ...(fullWidth ? { width: '100%' } : { minWidth: VW }) }}
    >
      {/* Grid + Y axis */}
      {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
        const val = Math.round((yMax * i) / Y_TICKS);
        const y   = toYL(val);
        return (
          <g key={i}>
            <line x1={ML} x2={VW - MR} y1={y} y2={y}
              stroke={i === 0 ? '#94a3b8' : 'rgba(255,255,255,0.06)'} strokeWidth={i === 0 ? 1 : 1} />
            <text x={ML - 4} y={y} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#7a8a9c">{val}</text>
          </g>
        );
      })}

      {/* Right Y axis (cumulative) */}
      {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
        const val = Math.round((maxCumul * i) / Y_TICKS);
        const y = toYR(val);
        return (
          <text key={i} x={VW - MR + 4} y={y} textAnchor="start" dominantBaseline="middle" fontSize={9} fill="#0ea5e9">{val}</text>
        );
      })}

      {/* Bars */}
      {days.map((d, i) => {
        const bh = Math.max((d.nb_visite / yMax) * cH, 2);
        const bx = toX(i) - barW / 2;
        const by = toYL(d.nb_visite);
        return (
          <g key={d.date_visite}>
            <rect x={bx} y={by} width={barW} height={bh} fill={color} rx={2} opacity={0.8} />
            {/* Transparent full-column hit area */}
            <rect x={toX(i) - MINI_BAR_STEP / 2} y={MT} width={MINI_BAR_STEP} height={cH}
              fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={e => setTooltip({ cx: e.clientX, cy: e.clientY, label: fmtDate(d.date_visite), n: d.nb_visite, cumul: cumulArr[i] })}
              onMouseLeave={() => setTooltip(null)} />
          </g>
        );
      })}

      {/* Cumulative line */}
      <polyline points={linePoints} fill="none" stroke="#0ea5e9" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {cumulArr.map((c, i) => (
        <circle key={i} cx={toX(i)} cy={toYR(c)} r={2.5}
          fill="#0ea5e9" stroke="#0d1b2a" strokeWidth={1} />
      ))}

      {/* X labels */}
      {days.map((d, i) => {
        if (i % labelStep !== 0) return null;
        const lx = toX(i);
        const ly = MT + cH + 10;
        return (
          <text key={d.date_visite} x={lx} y={ly}
            textAnchor="end" fontSize={9} fill="#7a8a9c"
            transform={`rotate(-45, ${lx}, ${ly})`}>
            {fmtDate(d.date_visite)}
          </text>
        );
      })}
    </svg>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {fullWidth
        ? <div style={{ paddingBottom: 2 }}>{svgEl}</div>
        : <div style={{ overflowX: 'auto', overflowY: 'visible', height: VH, paddingBottom: 2 }}>{svgEl}</div>
      }
      {tooltip && createPortal(
        <div style={{
          position: 'fixed', left: tooltip.cx - TW / 2, top: tooltip.cy - TH - 10,
          width: TW, background: 'rgba(30,41,59,0.93)', borderRadius: 6,
          padding: '7px 12px', pointerEvents: 'none', zIndex: 99999,
        }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4 }}>{tooltip.label}</div>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, textAlign: 'center' }}>
            {tooltip.n} placette{tooltip.n > 1 ? 's' : ''} — cumul {tooltip.cumul}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function TabTemporel({ data }: { data: DashboardData }) {
  const { temporel, kpi } = data;
  const { visitesParJour, moyParJourEquipe } = temporel;
  const moy = Number(kpi.moy_par_jour);
  const remaining = kpi.restantes ?? kpi.total_programme - kpi.total_visitees;
  const jrsRestants = moy > 0 ? Math.ceil(remaining / moy) : '—';
  const [modalOpen, setModalOpen] = useState(false);

  // Group per-team daily data
  const byTeam = moyParJourEquipe.reduce((acc: Record<string, { date_visite: string; nb_visite: number }[]>, row: MoyJourEquipe) => {
    if (!acc[row.equipe]) acc[row.equipe] = [];
    acc[row.equipe].push({ date_visite: row.date_visite, nb_visite: row.nb_visite });
    return acc;
  }, {});
  const teamEntries = sortByNum(Object.keys(byTeam).map(eq => ({ equipe: eq }))).map(e => e.equipe);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Global bar + line chart */}
      <Card title="Placettes réalisées par jour · cumul">
        <div style={{ position: 'relative' }}>
          {jrsRestants != null && (
            <div style={{
              position: 'absolute', top: -32, right: 0, zIndex: 1,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8, padding: '3px 10px',
            }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#fbbf24' }}>{jrsRestants}</span>
              <span style={{ fontSize: 10, color: '#fcd34d' }}>jours restants estimés</span>
            </div>
          )}
          <DailyBarChart days={visitesParJour} />
        </div>
      </Card>

      {/* Per-team 2×3 grid */}
      <Card title="Progression des placettes réalisées par équipe" action={
        <button onClick={() => setModalOpen(true)} title="Agrandir" style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          color: '#bac4d0', fontSize: 11,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          Agrandir
        </button>
      }>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {teamEntries.map(eq => {
          const color = equipeColor(eq);
          const days  = byTeam[eq] ?? [];
          const total = days.reduce((s, d) => s + d.nb_visite, 0);
          return (
            <div key={eq} style={{ ...S.card, padding: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#edf1f5' }}>{equipeShort(eq)}</span>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                  {total} réalisée{total > 1 ? 's' : ''}
                </span>
              </div>
              <MiniTeamBarChart days={days} color={color} />
            </div>
          );
        })}
      </div>
      </Card>

      {/* ── Expanded modal ───────────────────────────────────────────────── */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px',
        }} onClick={() => setModalOpen(false)}>
          <div style={{
            background: '#0f1a2e', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, width: '100%', maxWidth: 900,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
            height: 'calc(100vh - 64px)',
          }} onClick={e => e.stopPropagation()}>

            {/* Modal header — sticky */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#edf1f5', margin: 0 }}>
                Progression des placettes réalisées par équipe
              </h2>
              <button onClick={() => setModalOpen(false)} style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 13,
              }}>✕</button>
            </div>

            {/* Scrollable charts */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {teamEntries.map(eq => {
                const color = equipeColor(eq);
                const days  = byTeam[eq] ?? [];
                const total = days.reduce((s, d) => s + d.nb_visite, 0);
                return (
                  <div key={eq} style={{
                    background: '#162035', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.07)',
                    position: 'relative', overflow: 'hidden', flexShrink: 0,
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#edf1f5' }}>{equipeShort(eq)}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                        {total} réalisée{total > 1 ? 's' : ''}
                      </span>
                    </div>
                    <MiniTeamBarChart days={days} color={color} fullWidth />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Series definition for accessibility (used in both chart and header)
const ACC_SERIES = [
  { key: 'nb_a_pied_0'  as const, label: '< 100 m',       color: '#34d399', bg: '#f0fdf4' },
  { key: 'nb_a_pied_1'  as const, label: '100 – 500 m',   color: '#f59e0b', bg: '#fffbeb' },
  { key: 'nb_a_pied_2'  as const, label: '> 500 m',       color: '#f97316', bg: '#fff7ed' },
] as const;

// ─── Grouped SVG bar chart ────────────────────────────────────────────────────

function GroupedBarChart({ equipes }: { equipes: AccessibiliteEquipe[] }) {
  const [tooltip, setTooltip] = useState<{
    cx: number; cy: number; label: string; equipe: string; value: number; color: string;
  } | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (equipes.length === 0) {
    return <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>Aucune donnée équipe</p>;
  }

  // SVG viewport
  const ML = 44, MR = 20, MT = 24, MB = 72;
  const VW = 660, VH = 300;
  const cW = VW - ML - MR;
  const cH = VH - MT - MB;

  // Y scale
  const allVals = equipes.flatMap(eq => ACC_SERIES.map(s => eq[s.key] ?? 0));
  const rawMax = Math.max(...allVals, 1);
  const yMax = Math.ceil(rawMax / 5) * 5;
  const Y_TICKS = 5;

  // Bar geometry
  const groupW = cW / equipes.length;
  const barGroupW = groupW * 0.78;
  const barW = barGroupW / ACC_SERIES.length;
  const groupPad = (groupW - barGroupW) / 2;

  const toY = (v: number) => MT + cH - (v / yMax) * cH;
  const toH = (v: number) => Math.max((v / yMax) * cH, 0);

  const legendY = MT + cH + 46;

  // Tooltip box size
  const TW = 138, TH = 40;

  return (
    <div style={{ position: 'relative' }}>
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%"
      style={{ display: 'block', overflow: 'visible' }}>

      {/* Y-axis grid lines + tick labels */}
      {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
        const val = Math.round((yMax * i) / Y_TICKS);
        const y   = toY(val);
        return (
          <g key={i}>
            <line x1={ML} x2={VW - MR} y1={y} y2={y}
              stroke={i === 0 ? '#94a3b8' : 'rgba(255,255,255,0.08)'}
              strokeWidth={i === 0 ? 1.5 : 1} />
            <text x={ML - 6} y={y} textAnchor="end" dominantBaseline="middle"
              fontSize={10} fill="#7a8a9c">{val}</text>
          </g>
        );
      })}

      {/* Grouped bars + x-axis label per équipe */}
      {equipes.map((eq, gi) => {
        const gx     = ML + gi * groupW + groupPad;
        const labelX = ML + gi * groupW + groupW / 2;
        return (
          <g key={eq.equipe}>
            {ACC_SERIES.map((s, si) => {
              const bh   = toH(eq[s.key] ?? 0);
              const by   = toY(eq[s.key] ?? 0);
              const bx   = gx + si * barW + 1;
              const bKey = `${gi}-${si}`;
              return (
                <rect key={s.key}
                  x={bx} y={by}
                  width={Math.max(barW - 2, 2)} height={bh}
                  fill={s.color} rx={3}
                  opacity={hoveredKey === bKey ? 1 : 0.82}
                  style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                  onMouseEnter={ev => {
                    setTooltip({
                      cx: ev.clientX,
                      cy: ev.clientY,
                      label: s.label,
                      equipe: equipeShort(eq.equipe),
                      value: eq[s.key] ?? 0,
                      color: s.color,
                    });
                    setHoveredKey(bKey);
                  }}
                  onMouseLeave={() => { setTooltip(null); setHoveredKey(null); }}
                />
              );
            })}
            <text x={labelX} y={MT + cH + 14}
              textAnchor="middle" fontSize={10} fill="#bac4d0">
              {equipeShort(eq.equipe)}
            </text>
          </g>
        );
      })}

      {/* Legend row — centered */}
      {(() => {
        const ITEM_W = 110;
        const startX = (VW - ACC_SERIES.length * ITEM_W) / 2;
        return ACC_SERIES.map((s, i) => (
          <g key={s.key} transform={`translate(${startX + i * ITEM_W}, ${legendY})`}>
            <rect width={10} height={10} fill={s.color} rx={2} />
            <text x={14} y={9} fontSize={11} fill="#bac4d0">{s.label}</text>
          </g>
        ));
      })()}

    </svg>

    {tooltip && (
      <div style={{
        position: 'fixed', left: tooltip.cx - TW / 2, top: tooltip.cy - TH - 10,
        width: TW, background: 'rgba(30,41,59,0.93)', borderRadius: 6,
        padding: '7px 12px', pointerEvents: 'none', zIndex: 9999,
      }}>
        <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4 }}>{tooltip.equipe}</div>
        <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', color: tooltip.color }}>{tooltip.label} : {tooltip.value}</div>
      </div>
    )}
    </div>
  );
}

// ─── Accessible / Inaccessible stacked bar chart per équipe ──────────────────

function AccessParEquipeChart({ equipes }: { equipes: AccessibiliteEquipe[] }) {
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; equipe: string; acc: number; inacc: number } | null>(null);

  const active = equipes.filter(e => e.total_visite > 0);
  if (active.length === 0) return <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>Aucune donnée</p>;

  const yMax = Math.max(...active.map(e => e.total_visite), 1);
  const ML = 36, MR = 16, MT = 24, MB = 48;
  const cH = 220, VH = MT + cH + MB, VW = 560;
  const cW = VW - ML - MR;
  const BAR_W  = Math.min(52, Math.floor(cW / active.length * 0.55));
  const BAR_GAP = Math.floor(cW / active.length) - BAR_W;
  const toX = (i: number) => ML + i * (BAR_W + BAR_GAP) + BAR_GAP / 2;
  const toY = (v: number) => MT + cH - (v / yMax) * cH;
  const Y_TICKS = 5;
  const getNum  = (name: string) => { const m = name.match(/N°(\d+)/); return m ? `N°${m[1]}` : ''; };
  const getNoun = (name: string) => {
    let s = name.replace(/^Equipe\s+/, '').replace(/\s*\(N°[^)]+\)/, '').trim();
    if (s.startsWith('Khémisset-')) s = s.slice('Khémisset-'.length);
    if (s.includes('_')) s = s.slice(s.lastIndexOf('_') + 1);
    return s;
  };
  const TW = 190, TH = 56;

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block', overflow: 'visible' }}>

        {/* Y grid */}
        {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
          const val = Math.round((yMax * i) / Y_TICKS);
          const y = toY(val);
          return (
            <g key={i}>
              <line x1={ML} x2={VW - MR} y1={y} y2={y} stroke={i === 0 ? '#94a3b8' : 'rgba(255,255,255,0.08)'} strokeWidth={i === 0 ? 1.5 : 1} />
              <text x={ML - 5} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#7a8a9c">{val}</text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {active.map((eq, i) => {
          const bx     = toX(i);
          const baseY  = MT + cH;
          const accH   = (eq.nb_accessible   / yMax) * cH;
          const inaccH = (eq.nb_inaccessible / yMax) * cH;
          return (
            <g key={eq.equipe} style={{ cursor: 'pointer' }}
              onMouseEnter={ev => setTooltip({ cx: ev.clientX, cy: ev.clientY, equipe: eq.equipe, acc: eq.nb_accessible, inacc: eq.nb_inaccessible })}
              onMouseLeave={() => setTooltip(null)}>
              <rect x={bx} y={baseY - accH} width={BAR_W} height={accH} fill="#10b981" opacity={0.85} />
              <rect x={bx} y={baseY - accH - inaccH} width={BAR_W} height={inaccH} fill="#f87171" opacity={0.85} />
              <text x={bx + BAR_W / 2} y={toY(eq.total_visite) - 5} textAnchor="middle" fontSize={10} fill="#bac4d0" fontWeight="700">{eq.total_visite}</text>
              <text x={bx + BAR_W / 2} y={MT + cH + 14} textAnchor="middle" fontSize={10} fill="#bac4d0" fontWeight="600">{getNum(eq.equipe)}</text>
              <text x={bx + BAR_W / 2} y={MT + cH + 28} textAnchor="middle" fontSize={8.5} fill="#dde4ec">{getNoun(eq.equipe)}</text>
            </g>
          );
        })}

      </svg>

      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.cx - TW / 2, top: tooltip.cy - TH - 10,
          width: TW, background: 'rgba(30,41,59,0.93)', borderRadius: 6,
          padding: '7px 12px', pointerEvents: 'none', zIndex: 9999,
        }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4 }}>{getNoun(tooltip.equipe)}</div>
          <div style={{ fontSize: 12, textAlign: 'center' }}>
            <span style={{ color: '#86efac', fontWeight: 700 }}>● {tooltip.acc}</span>
            <span style={{ color: '#94a3b8', margin: '0 6px' }}>·</span>
            <span style={{ color: '#f87171', fontWeight: 700 }}>● {tooltip.inacc}</span>
          </div>
          <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 3 }}>accessibles · inaccessibles</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 8, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#bac4d0' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#10b981' }} /> Accessible
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#bac4d0' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f87171' }} /> Inaccessible
        </div>
      </div>
    </div>
  );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

function TabAccessibilite({ data }: { data: DashboardData }) {
  const { global: g, equipes } = data.accessibilite;
  const activeEquipes = (equipes as AccessibiliteEquipe[]).filter(eq => eq.total_visite > 0);
  const total = g.total_visitees || 1;

  const nbInacc = g.nb_inaccessible ?? 0;

  const row1 = [
    { label: 'Placettes réalisées', value: g.total_visitees, pct: null,                                        color: '#94a3b8', bg: 'rgba(71,85,105,0.2)' },
    { label: 'Placettes accessibles',     value: g.nb_accessible,  pct: +(g.nb_accessible / total * 100).toFixed(1), color: '#6ee7b7', bg: 'rgba(5,150,105,0.15)' },
    { label: 'Placettes inaccessibles',   value: nbInacc,          pct: +(nbInacc         / total * 100).toFixed(1), color: '#f87171', bg: 'rgba(225,29,72,0.15)' },
  ];

  const row2 = [
    { label: '< 100 m à pied',    value: g.nb_a_pied_0, pct: +(g.nb_a_pied_0 / total * 100).toFixed(1), color: '#6ee7b7', bg: 'rgba(5,150,105,0.15)' },
    { label: '100 – 500 m',       value: g.nb_a_pied_1, pct: +(g.nb_a_pied_1 / total * 100).toFixed(1), color: '#fcd34d', bg: 'rgba(245,158,11,0.15)' },
    { label: '> 500 m',           value: g.nb_a_pied_2, pct: +(g.nb_a_pied_2 / total * 100).toFixed(1), color: '#fdba74', bg: 'rgba(234,88,12,0.15)' },
  ];

  function StatCard({ s }: { s: { label: string; value: number; pct: number | null; color: string; bg: string } }) {
    return (
      <div style={{ ...S.card, background: s.bg, padding: '10px 6px 2px', textAlign: 'center', borderLeft: `4px solid ${s.color}` }}>
        <div style={{ fontSize: 10, color: '#bac4d0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          {s.label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
        {s.pct !== null && (
          <div style={{ fontSize: 11, color: s.color, opacity: 0.75, marginTop: 3 }}>{s.pct} %</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Row 1: main access summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {row1.map(s => <StatCard key={s.label} s={s} />)}
      </div>

      {/* ── Row 2: distance on foot breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {row2.map(s => <StatCard key={s.label} s={s} />)}
      </div>

      {/* ── Accessible / Inaccessible per équipe ── */}
      <Card title="Placettes accessibles / inaccessibles par équipe">
        <AccessParEquipeChart equipes={activeEquipes} />
      </Card>

      {/* ── Multi-series bar chart per équipe ── */}
      <Card title="Distance parcourue à pied par équipe">
        <GroupedBarChart equipes={activeEquipes} />
      </Card>

    </div>
  );
}

// ─── Contrôle Qualité tab ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ControlePieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;

  const SIZE = 200, CX = 100, CY = 100, R = 72, INNER = 44;
  let angle = -Math.PI / 2;

  const paths = slices.map((sl, i) => {
    const pct   = sl.value / total;
    const sweep = pct * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    angle += sweep;
    const x2 = CX + R * Math.cos(angle);
    const y2 = CY + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const xi1 = CX + INNER * Math.cos(angle - sweep);
    const yi1 = CY + INNER * Math.sin(angle - sweep);
    const xi2 = CX + INNER * Math.cos(angle);
    const yi2 = CY + INNER * Math.sin(angle);
    const midA = angle - sweep / 2;
    const dx = hovered === i ? Math.cos(midA) * 6 : 0;
    const dy = hovered === i ? Math.sin(midA) * 6 : 0;
    return {
      d: `M ${xi1} ${yi1} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${INNER} ${INNER} 0 ${large} 0 ${xi1} ${yi1} Z`,
      dx, dy, pct: pct * 100, ...sl,
    };
  });

  const hov = hovered !== null ? paths[hovered] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} stroke="#0d1b2a" strokeWidth={2}
              style={{ cursor: 'pointer', transform: `translate(${p.dx}px,${p.dy}px)`, transition: 'transform 0.18s', opacity: hovered !== null && hovered !== i ? 0.5 : 1 }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {hov ? (
            <>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: hov.color }}>{hov.value}</span>
              <span style={{ fontSize: 9, color: hov.color, marginTop: 2 }}>{hov.pct.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 22, color: '#edf1f5' }}>{total}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>total</span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {paths.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: hovered === i ? `${p.color}22` : '#1a2540', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ flex: 1, fontSize: 13, color: '#dde4ec' }}>{p.label}</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: p.color }}>{p.value}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 40, textAlign: 'right' }}>{p.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabControleQualite({ data }: { data: DashboardData }) {
  const { kpi, controleParEquipe, controleServiceParEquipe, equipes } = data;
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; label: string; n: number } | null>(null);

  const controleC  = kpi.nb_controle ?? 0;
  const controleCS = kpi.nb_controle_service ?? 0;
  const controle   = controleC + controleCS;
  const realise    = kpi.total_visitees;
  const pctCtrl    = realise > 0 ? (controle / realise * 100) : 0;

  // Build per-equipe stacked data combining C + CS
  const byNum   = (name: string) => parseInt(name.match(/N°(\d+)/)?.[1] ?? '99');
  const getNum  = (name: string) => { const m = name.match(/N°(\d+)/); return m ? `N°${m[1]}` : ''; };
  const getNoun = (name: string) => {
    let s = name.replace(/^Equipe\s+/, '').replace(/\s*\(N°[^)]+\)/, '').trim();
    if (s.startsWith('Khémisset-')) s = s.slice('Khémisset-'.length);
    if (s.includes('_')) s = s.slice(s.lastIndexOf('_') + 1);
    return s;
  };

  // Merge C and CS counts per equipe
  const ctrlMap = new Map<string, number>();
  for (const ce of controleParEquipe) ctrlMap.set(ce.equipe, (ctrlMap.get(ce.equipe) ?? 0) + ce.nb_controle);
  for (const ce of controleServiceParEquipe) ctrlMap.set(ce.equipe, (ctrlMap.get(ce.equipe) ?? 0) + ce.nb_controle_service);

  const rows = [...ctrlMap.entries()]
    .map(([equipe, ctrl]) => {
      const eq = equipes.find(e => e.equipe === equipe);
      const totalVisite = eq?.total_visite ?? 0;
      const nonCtrl = Math.max(totalVisite - ctrl, 0);
      return { equipe, nonCtrl, ctrl, total: nonCtrl + ctrl };
    })
    .sort((a, b) => byNum(a.equipe) - byNum(b.equipe));

  const yMax  = Math.max(...rows.map(r => r.total), 1);
  const ML = 36, MR = 16, MT = 24, MB = 52;
  const cH = 220;
  const VH = MT + cH + MB;
  const VW = 560;
  const cW = VW - ML - MR;
  const BAR_W  = Math.min(52, Math.floor(cW / rows.length * 0.55));
  const BAR_GAP = Math.floor(cW / rows.length) - BAR_W;
  const toX = (i: number) => ML + i * (BAR_W + BAR_GAP) + BAR_GAP / 2;
  const toY = (v: number) => MT + cH - (v / yMax) * cH;
  const Y_TICKS = 5;
  const TW = 190, TH = 44;

  const SEGS = [
    { key: 'nonCtrl' as const, color: '#34d399', label: 'Réalisées non contrôlées' },
    { key: 'ctrl'    as const, color: '#d946ef', label: 'Contrôlées' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI header ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Placettes contrôlées',      value: controle,                 pct: +((controle / (realise || 1)) * 100).toFixed(1), color: '#d946ef', bg: 'rgba(217,70,239,0.07)' },
          { label: 'Placettes non contrôlées',   value: realise - controle,       pct: +(((realise - controle) / (realise || 1)) * 100).toFixed(1), color: '#34d399', bg: 'rgba(16,185,129,0.07)' },
          { label: 'Taux de contrôle',           value: `${pctCtrl.toFixed(1)}%`, pct: null,                                                       color: '#0ea5e9', bg: 'rgba(2,132,199,0.07)' },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, background: s.bg, padding: '10px 6px 2px', textAlign: 'center', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 10, color: '#bac4d0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            {s.pct !== null && <div style={{ fontSize: 11, color: s.color, opacity: 0.75, marginTop: 3 }}>{s.pct} %</div>}
          </div>
        ))}
      </div>

      {/* ── Stacked bar chart: contrôlées vs non-contrôlées par équipe ── */}
      <Card title="Avancement du contrôle qualité pour chaque équipe">
        <div style={{ position: 'relative' }}>
          <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block', overflow: 'visible' }}>

            {/* Y grid */}
            {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
              const val = Math.round((yMax * i) / Y_TICKS);
              const y   = toY(val);
              return (
                <g key={i}>
                  <line x1={ML} x2={VW - MR} y1={y} y2={y}
                    stroke={i === 0 ? '#94a3b8' : 'rgba(255,255,255,0.08)'} strokeWidth={i === 0 ? 1.5 : 1} />
                  <text x={ML - 5} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#7a8a9c">{val}</text>
                </g>
              );
            })}

            {/* Bars */}
            {rows.map((r, i) => {
              const bx = toX(i);
              let cumY = MT + cH;
              return (
                <g key={r.equipe}>
                  {SEGS.map(seg => {
                    const n  = r[seg.key];
                    if (n === 0) return null;
                    const bh = (n / yMax) * cH;
                    cumY -= bh;
                    const segY = cumY;
                    return (
                      <rect key={seg.key} x={bx} y={segY} width={BAR_W} height={bh}
                        fill={seg.color} rx={0} opacity={0.88} style={{ cursor: 'pointer' }}
                        onMouseEnter={ev => setTooltip({ cx: ev.clientX, cy: ev.clientY, label: `${getNoun(r.equipe)} — ${seg.label}`, n })}
                        onMouseLeave={() => setTooltip(null)} />
                    );
                  })}
                  {/* Total */}
                  <text x={bx + BAR_W / 2} y={toY(r.total) - 5} textAnchor="middle" fontSize={10} fill="#bac4d0" fontWeight="700">{r.total}</text>
                  {/* Equipe N° */}
                  <text x={bx + BAR_W / 2} y={MT + cH + 14} textAnchor="middle" fontSize={10} fill="#bac4d0" fontWeight="600">{getNum(r.equipe)}</text>
                  {/* Equipe noun */}
                  <text x={bx + BAR_W / 2} y={MT + cH + 28} textAnchor="middle" fontSize={8.5} fill="#dde4ec">{getNoun(r.equipe)}</text>
                </g>
              );
            })}

          </svg>

          {tooltip && (
            <div style={{
              position: 'fixed', left: tooltip.cx - TW / 2, top: tooltip.cy - TH - 10,
              width: TW, background: 'rgba(30,41,59,0.93)', borderRadius: 6,
              padding: '7px 12px', pointerEvents: 'none', zIndex: 9999,
            }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 4 }}>{tooltip.label}</div>
              <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, textAlign: 'center' }}>{tooltip.n} placettes</div>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
            {SEGS.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#bac4d0' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </Card>

    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'equipe',   label: 'Équipes' },
  { id: 'temporel', label: 'Progression' },
  { id: 'access',   label: 'Accessibilité' },
  { id: 'controle', label: 'Contrôle qualité' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface Props { onClose: () => void; }

export function Dashboard({ onClose }: Props) {
  const navigate = useNavigate();
  const handleClose = () => { onClose(); navigate('/'); };
  const [tab, setTab] = useState<TabId>('equipe');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await fetchDashboardData()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur de connexion'); }
    finally { setLoading(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await importPlotsCsv(file);
      setImportMsg({ text: `Import réussi : ${res.inserted} ajoutées, ${res.updated} mises à jour`, ok: true });
      load();
    } catch (err) {
      setImportMsg({ text: err instanceof Error ? err.message : 'Erreur import', ok: false });
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(null), 6000);
    }
  };

  useEffect(() => {
    load();
    const es = new EventSource('/api/dashboard/events');
    es.addEventListener('refresh', () => load());
    return () => es.close();
  }, []);

  return (
    <div style={S.overlay} data-dashboard>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* ANEF Logo */}
          <img
            src="/anef-logo.png"
            alt="ANEF"
            style={{ height: 52, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          {/* Divider */}
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
          {/* Title */}
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#edf1f5' }}>
              Inventaire Forestier National 2026
            </h1>
            {data && (
              <p style={{ color: '#bac4d0', fontSize: 14, marginTop: 3, fontWeight: 600 }}>
                DRANEF Rabat-Salé-Kénitra · {data.kpi.total_programme} placettes programmées
                <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                    · Dernière mise à jour : <strong>{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                  </span>
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Import toast */}
          {importMsg && (
            <span style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 6, fontWeight: 500,
              background: importMsg.ok ? '#dcfce7' : '#fee2e2',
              color: importMsg.ok ? '#166534' : '#991b1b',
              border: `1px solid ${importMsg.ok ? '#86efac' : '#fca5a5'}`,
            }}>
              {importMsg.text}
            </span>
          )}
          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          {/* Import CSV button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            title="Importer des placettes (CSV)"
            style={{ ...S.iconBtn, opacity: importing ? 0.4 : 1, fontSize: 18 }}
          >
            ↓
          </button>
          <button onClick={load} disabled={loading} title="Rafraîchir"
            style={{ ...S.iconBtn, opacity: loading ? 0.4 : 1 }}>
            ↺
          </button>
          <button onClick={handleClose} title="Fermer" style={S.iconBtn}>✕</button>
        </div>
      </div>

      {/* KPI strip */}
      {data && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, padding: '4px 32px 12px', flexShrink: 0 }}>
          {(() => {
            const prod = data.temporel.productivite.filter((e: ProductiviteEquipe) => Number(e.moy_par_jour) > 0);
            const moyParEquipe = prod.length > 0
              ? prod.reduce((s: number, e: ProductiviteEquipe) => s + Number(e.moy_par_jour), 0) / prod.length
              : 0;
            return [
              { label: 'Placettes réalisées', value: data.kpi.total_visitees, sub: `/ ${data.kpi.total_programme}`, color: '#10b981' },
              { label: 'Placettes restantes', value: data.kpi.restantes, sub: `/ ${data.kpi.total_programme}`, color: '#fb923c' },
              { label: 'Jours terrain', value: data.kpi.nb_jours_terrain, color: '#0ea5e9' },
              { label: "Taux d'avancement", value: `${Number(data.kpi.pct_avancement).toFixed(1)}%`, color: '#3b82f6' },
              { label: 'Moyenne de placet/jour', value: moyParEquipe.toFixed(1), sub: 'placettes/équipe/jour', color: '#fbbf24' },
              { label: 'Placettes contrôlées', value: (data.kpi.nb_controle ?? 0) + (data.kpi.nb_controle_service ?? 0), sub: `/ ${data.kpi.total_visitees}`, color: '#d946ef' },
            ];
          })().map((kpi, i) => (
            <div key={i} style={{ ...S.card, position: 'relative', overflow: 'hidden', padding: '20px 16px 16px', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: kpi.color, opacity: 0.6 }} />
              <p style={{ fontSize: 12, color: '#bac4d0', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 800, marginBottom: 6, lineHeight: 1.3, whiteSpace: 'nowrap', textAlign: 'center' as const }}>{kpi.label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 36, color: kpi.color, lineHeight: 1 }}>{kpi.value}</span>
                {kpi.sub && <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>{kpi.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-column content area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* LEFT — tabs + panel content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2, padding: '12px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                style={{
                  background: tab === id ? 'rgba(5,150,105,0.07)' : 'transparent',
                  border: 'none', borderBottom: `2px solid ${tab === id ? '#10b981' : 'transparent'}`,
                  color: tab === id ? '#10b981' : '#bac4d0',
                  cursor: 'pointer', padding: '10px 14px', fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
                  transition: 'all 0.2s', marginBottom: -1,
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#94a3b8', fontSize: 14 }}>
                Chargement des statistiques…
              </div>
            )}
            {error && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 16 }}>
                <p style={{ color: '#ef4444', fontSize: 14 }}>Erreur : {error}</p>
                <button onClick={load} style={{ background: 'none', border: 'none', color: '#7a8a9c', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
                  Réessayer
                </button>
              </div>
            )}
            {data && !loading && (
              <>
                {tab === 'equipe'   && <TabEquipe data={data} />}
                {tab === 'temporel' && <TabTemporel data={data} />}
                {tab === 'access'   && <TabAccessibilite data={data} />}
                {tab === 'controle' && <TabControleQualite data={data} />}
              </>
            )}
          </div>
        </div>

        {/* RIGHT — permanent map panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 12 }}>
          {data && !loading
            ? <TabCarte data={data} />
            : <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94a3b8', fontSize: 13,
                background: '#1a2540', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {loading ? 'Chargement de la carte…' : ''}
              </div>
          }
        </div>

      </div>
    </div>
  );
}
