import { useState, useEffect } from 'react';
import type {
  DashboardData, AvancementEquipe, AvancementEssence, AccessibiliteEquipe, ProductiviteEquipe,
} from '../../services/dashboardApi';
import { fetchDashboardData } from '../../services/dashboardApi';
import { TabCarte } from './TabCarte';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EQUIPE_COLORS = ['#818cf8', '#4ade80', '#f59e0b', '#ef4444', '#38bdf8', '#c084fc'];
const BAR_COLORS    = ['#4ade80', '#38bdf8', '#f59e0b', '#c084fc', '#ef4444', '#fb923c'];
const ESSENCE_COLORS = [
  '#0ea5e9', '#8b5cf6', '#f97316', '#10b981', '#ec4899',
  '#eab308', '#06b6d4', '#84cc16', '#f43f5e', '#a78bfa',
  '#fb923c', '#34d399', '#60a5fa', '#f472b6', '#a3e635',
];


function equipeIndex(name: string): number {
  const m = name.match(/N°0?(\d+)/);
  return m ? (parseInt(m[1]) - 1) % EQUIPE_COLORS.length : 0;
}
function equipeColor(name: string): string { return EQUIPE_COLORS[equipeIndex(name)]; }
function equipeShort(name: string): string {
  const m = name.match(/Equipe\s+(.+?)\s+\(/);
  return m ? m[1] : name;
}

// ─── Base styles ──────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed' as const, inset: 0, zIndex: 3000,
    display: 'flex', flexDirection: 'column' as const,
    background: '#f0f4f8', color: '#1e293b',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 32px', borderBottom: '1px solid #e2e8f0',
    background: 'linear-gradient(180deg, rgba(16,185,129,0.05) 0%, transparent 100%)',
    flexShrink: 0,
  },
  card: {
    background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 12, padding: 24,
  },
  innerCard: {
    background: '#f1f5f9', borderRadius: 10, padding: '8px 12px',
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

function ProgressRing({ pct, size = 80, stroke = 6, color = '#4ade80' }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}

function BarH({ label, value, max, count, color = '#4ade80' }: {
  label: string; value: number; max: number; count?: number; color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{label}</span>
        <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11, flexShrink: 0 }}>
          {count !== undefined ? `${value}/${count}` : value}
          <span style={{ marginLeft: 4, color: '#94a3b8' }}>({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color = '#e4e7ef', sub }: {
  label: string; value: string | number; color?: string; sub?: string;
}) {
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 12, textAlign: 'center' }}>
      <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={S.card}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

// ─── Donut chart — team distribution ─────────────────────────────────────────

function DonutChart({ equipes }: { equipes: AvancementEquipe[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 180, cx = size / 2, cy = size / 2, outerR = 74, innerR = 46;
  const total = equipes.reduce((s, eq) => s + eq.total_affecte, 0);
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
                <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
              </g>
            ) : (
              <path
                key={i} d={s.d} fill={s.color} stroke="#fff"
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
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color: '#1e293b' }}>{total.toLocaleString()}</span>
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
            <span style={{ fontSize: 11, color: '#334155' }}>{equipeShort(s.eq.equipe)}</span>
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
  const sorted = [...essences].sort((a, b) => b.total_visite - a.total_visite);
  const size = 180, cx = size / 2, cy = size / 2, outerR = 74, innerR = 46;
  const total = sorted.reduce((s, e) => s + e.total_visite, 0);
  if (total === 0) return null;

  let angle = -Math.PI / 2;
  const slices = sorted.map((ess, i) => {
    const sweep = (ess.total_visite / total) * 2 * Math.PI;
    const mid = angle + sweep / 2;
    const a0 = angle, a1 = angle + sweep;
    angle = a1;
    const color = ESSENCE_COLORS[i % ESSENCE_COLORS.length];
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
                <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
              </g>
            ) : (
              <path
                key={i} d={s.d} fill={s.color} stroke="#fff"
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
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color: '#1e293b' }}>{total.toLocaleString()}</span>
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
            <span style={{ fontSize: 11, color: '#334155' }}>{s.ess.essence}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8' }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function TabGlobal({ data }: { data: DashboardData }) {
  const { kpi, essences } = data;
  const pct = Number(kpi.pct_avancement);
  const topEssences = essences.slice(0, 8);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Avancement global">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ProgressRing pct={pct} size={120} stroke={10} color="#059669" />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 22, color: '#059669' }}>{pct.toFixed(1)}%</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
            <StatBox label="Programmées" value={kpi.total_programme} color="#64748b" />
            <StatBox label="Réalisées" value={kpi.total_visitees} color="#059669" />
            <StatBox label="Restantes" value={kpi.restantes ?? kpi.total_programme - kpi.total_visitees} color="#dc2626" />
            <StatBox label="Jours terrain" value={kpi.nb_jours_terrain} color="#0284c7" />
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
  const { equipes } = data;
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
                  { label: 'Réalisées', val: eq.total_visite, color: undefined },
                  { label: 'Total', val: eq.total_affecte, color: undefined },
                  { label: 'Restantes', val: eq.restantes, color: '#ef4444' },
                ].map(({ label, val, color: c }) => (
                  <div key={label} style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 4px' }}>
                    <p style={{ color: '#94a3b8', fontSize: 9, marginBottom: 2 }}>{label}</p>
                    <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: c ?? '#1e293b' }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Card title="Répartition des placettes par équipe">
        <DonutChart equipes={equipes} />
      </Card>
    </div>
  );
}

function TabEssence({ data }: { data: DashboardData }) {
  const { essences } = data;
  const maxVisite = essences[0]?.total_visite ?? 1;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Placettes réalisées par essence">
        {essences.map((e, i) => (
          <BarH key={e.essence} label={e.essence}
            value={e.total_visite} max={maxVisite}
            color={ESSENCE_COLORS[i % ESSENCE_COLORS.length]} />
        ))}
      </Card>
      <Card title="Distribution des essences réalisées">
        <EssenceDonutChart essences={essences} />
      </Card>
    </div>
  );
}

function TabTemporel({ data }: { data: DashboardData }) {
  const { temporel, kpi } = data;
  const { visitesParJour, productivite } = temporel;
  const moy = Number(kpi.moy_par_jour);
  const remaining = kpi.restantes ?? kpi.total_programme - kpi.total_visitees;
  const jrsRestants = moy > 0 ? Math.ceil(remaining / moy) : '—';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Moyenne globale par jour">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 48, color: '#0284c7' }}>{moy.toFixed(1)}</p>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>placettes / jour (moyenne globale)</p>
          <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
            Sur {kpi.nb_jours_terrain} jour(s) · {kpi.total_visitees} réalisées
          </p>
        </div>
        <div style={{ ...S.innerCard, marginTop: 16 }}>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Projection au rythme actuel</p>
          <p style={{ fontSize: 14 }}>
            <span style={{ color: '#0284c7', fontWeight: 700, fontFamily: 'monospace' }}>{jrsRestants}</span>
            <span style={{ color: '#64748b', marginLeft: 6 }}>
              jours restants pour les {remaining.toLocaleString()} placettes restantes
            </span>
          </p>
        </div>
        {visitesParJour.map((d) => (
          <div key={d.date_visite}
            style={{ ...S.innerCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: '#64748b' }}>{d.date_visite}</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{d.nb_placettes} placettes réalisées</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: '#64748b' }}>Accessibles</p>
              <p style={{ color: '#059669', fontWeight: 700 }}>{d.nb_accessibles}</p>
            </div>
          </div>
        ))}
      </Card>

      <Card title="Productivité & projections par équipe">
        {productivite.map((eq: ProductiviteEquipe, i) => {
          const color = equipeColor(eq.equipe);
          return (
            <div key={eq.equipe}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                background: i % 2 === 0 ? '#f1f5f9' : 'transparent',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 14 }}>{equipeShort(eq.equipe)}</p>
                  {eq.jours_restants_estimes != null && (
                    <p style={{ fontSize: 10, color: '#94a3b8' }}>~{eq.jours_restants_estimes} jours restants</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color }}>
                  {Number(eq.moy_par_jour).toFixed(1)}
                </span>
                <span style={{ color: '#64748b', fontSize: 12 }}>/ jour</span>
              </div>
            </div>
          );
        })}
        {productivite.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Aucune donnée</p>
        )}
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10 }}>
          <p style={{ fontSize: 12, color: '#f59e0b' }}>
            Les projections s'affineront avec l'accumulation des jours de terrain.
          </p>
        </div>
      </Card>
    </div>
  );
}

// Series definition for accessibility (used in both chart and header)
const ACC_SERIES = [
  { key: 'nb_accessible' as const, label: 'Accessibles',  color: '#059669', bg: '#f0fdf4' },
  { key: 'nb_a_pied_0'  as const, label: '< 100 m',       color: '#4ade80', bg: '#f0fdf4' },
  { key: 'nb_a_pied_1'  as const, label: '100 – 500 m',   color: '#f97316', bg: '#fff7ed' },
  { key: 'nb_a_pied_2'  as const, label: '> 500 m',       color: '#ef4444', bg: '#fef2f2' },
] as const;

type AccKey = typeof ACC_SERIES[number]['key'];

// ─── Grouped SVG bar chart ────────────────────────────────────────────────────

function GroupedBarChart({ equipes }: { equipes: AccessibiliteEquipe[] }) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; label: string; equipe: string; value: number; color: string;
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
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%"
      style={{ display: 'block', overflow: 'visible' }}>

      {/* Y-axis grid lines + tick labels */}
      {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
        const val = Math.round((yMax * i) / Y_TICKS);
        const y   = toY(val);
        return (
          <g key={i}>
            <line x1={ML} x2={VW - MR} y1={y} y2={y}
              stroke={i === 0 ? '#94a3b8' : '#e2e8f0'}
              strokeWidth={i === 0 ? 1.5 : 1} />
            <text x={ML - 6} y={y} textAnchor="end" dominantBaseline="middle"
              fontSize={10} fill="#64748b">{val}</text>
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
                  onMouseEnter={() => {
                    const cx = bx + (barW - 2) / 2;
                    setTooltip({
                      x: Math.min(Math.max(cx - TW / 2, ML), VW - MR - TW),
                      y: by - TH - 10,
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
              textAnchor="middle" fontSize={10} fill="#475569">
              {equipeShort(eq.equipe)}
            </text>
          </g>
        );
      })}

      {/* Legend row */}
      {ACC_SERIES.map((s, i) => {
        const lx = ML + i * (cW / ACC_SERIES.length);
        return (
          <g key={s.key} transform={`translate(${lx}, ${legendY})`}>
            <rect width={10} height={10} fill={s.color} rx={2} />
            <text x={14} y={9} fontSize={11} fill="#475569">{s.label}</text>
          </g>
        );
      })}

      {/* Hover tooltip — rendered last so it floats on top */}
      {tooltip && (
        <g style={{ pointerEvents: 'none' }}>
          <rect x={tooltip.x} y={tooltip.y} width={TW} height={TH}
            fill="#ffffff" rx={6} opacity={1}
            stroke="#e2e8f0" strokeWidth={1} />
          {/* triangle pointer */}
          <polygon
            points={`
              ${tooltip.x + TW / 2 - 6},${tooltip.y + TH}
              ${tooltip.x + TW / 2 + 6},${tooltip.y + TH}
              ${tooltip.x + TW / 2},${tooltip.y + TH + 7}
            `}
            fill="#ffffff"
          />
          <line
            x1={tooltip.x + TW / 2 - 6} y1={tooltip.y + TH}
            x2={tooltip.x + TW / 2}     y2={tooltip.y + TH + 7}
            stroke="#e2e8f0" strokeWidth={1}
          />
          <line
            x1={tooltip.x + TW / 2 + 6} y1={tooltip.y + TH}
            x2={tooltip.x + TW / 2}     y2={tooltip.y + TH + 7}
            stroke="#e2e8f0" strokeWidth={1}
          />
          <text x={tooltip.x + TW / 2} y={tooltip.y + 13}
            textAnchor="middle" fontSize={10} fill="#94a3b8">
            {tooltip.equipe}
          </text>
          <text x={tooltip.x + TW / 2} y={tooltip.y + 29}
            textAnchor="middle" fontSize={12} fontWeight="bold" fill={tooltip.color}>
            {tooltip.label} : {tooltip.value}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

function TabAccessibilite({ data }: { data: DashboardData }) {
  const { global: g, equipes } = data.accessibilite;
  const activeEquipes = (equipes as AccessibiliteEquipe[]).filter(eq => eq.total_visite > 0);
  const total = g.total_visitees || 1;

  const headerStats = [
    { label: 'Total réalisées', value: g.total_visitees, pct: null,                                           color: '#475569', bg: '#f1f5f9' },
    ...ACC_SERIES.map(s => ({
      label: s.label,
      value: g[s.key],
      pct:   +(g[s.key] / total * 100).toFixed(1),
      color: s.color,
      bg:    s.bg,
    })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Global indicator header ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {headerStats.map(s => (
          <div key={s.label} style={{
            ...S.card, background: s.bg, padding: '16px 20px', textAlign: 'center',
            borderLeft: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            {s.pct !== null && (
              <div style={{ fontSize: 12, color: s.color, opacity: 0.75, marginTop: 4 }}>
                {s.pct} %
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Multi-series bar chart per équipe ── */}
      <Card title="Distance parcourue à pied — par équipe">
        <GroupedBarChart equipes={activeEquipes} />
      </Card>

    </div>
  );
}

// ─── Contrôle Qualité tab ─────────────────────────────────────────────────────

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
            <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth={2}
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
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 22, color: '#1e293b' }}>{total}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>total</span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {paths.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: hovered === i ? `${p.color}12` : '#f8fafc', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ flex: 1, fontSize: 13, color: '#334155' }}>{p.label}</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: p.color }}>{p.value}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 40, textAlign: 'right' }}>{p.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabControleQualite({ data }: { data: DashboardData }) {
  const { kpi } = data;
  const controle  = kpi.nb_controle ?? 0;
  const realise   = kpi.total_visitees;
  const restantes = kpi.total_programme - controle - realise;
  const pctCtrl   = realise > 0 ? (controle / realise * 100) : 0;

  const slices = [
    { label: 'Contrôlées',             value: controle,          color: '#8b5cf6' },
    { label: 'Réalisées non contrôlées', value: realise,            color: '#10b981' },
    { label: 'Non réalisées',           value: restantes,          color: '#cbd5e1' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI header ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Placettes contrôlées',    value: controle,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.07)', sub: 'vérification qualité' },
          { label: 'Réalisées non contrôlées', value: realise,   color: '#10b981', bg: 'rgba(16,185,129,0.07)', sub: `sur ${kpi.total_programme} programmées` },
          { label: 'Taux de contrôle',         value: `${pctCtrl.toFixed(1)}%`, color: '#0284c7', bg: 'rgba(2,132,199,0.07)', sub: 'des réalisées contrôlées' },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, background: s.bg, padding: '16px 20px', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Pie chart ── */}
      <Card title="Répartition des placettes">
        <ControlePieChart slices={slices} />
      </Card>

    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'global',   label: 'Vue globale' },
  { id: 'equipe',   label: 'Par équipe' },
  { id: 'essence',  label: 'Par essence' },
  { id: 'temporel', label: 'Temporel' },
  { id: 'access',   label: 'Accessibilité' },
  { id: 'controle', label: 'Contrôle Qualité' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface Props { onClose: () => void; }

export function Dashboard({ onClose }: Props) {
  const [tab, setTab] = useState<TabId>('global');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await fetchDashboardData()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur de connexion'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={S.overlay}>
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
          <div style={{ width: 1, height: 40, background: '#e2e8f0', flexShrink: 0 }} />
          {/* Title */}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#1e293b' }}>
              Inventaire Forestier National 2026
            </h1>
            {data && (
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                DRANEF Rabat-Salé-Kénitra · {data.kpi.total_programme} placettes programmées · {data.kpi.nb_jours_terrain} jour(s) de terrain
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={loading} title="Rafraîchir"
            style={{ ...S.iconBtn, opacity: loading ? 0.4 : 1 }}>
            ↺
          </button>
          <button onClick={onClose} title="Fermer" style={S.iconBtn}>✕</button>
        </div>
      </div>

      {/* KPI strip */}
      {data && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, padding: '16px 32px', flexShrink: 0 }}>
          {[
            { label: 'Placettes réalisées', value: data.kpi.total_visitees, sub: `/ ${data.kpi.total_programme}`, color: '#059669' },
            { label: "Taux d'avancement", value: `${Number(data.kpi.pct_avancement).toFixed(1)}%`, color: '#C67F89' },
            { label: 'Moyenne / jour', value: Math.round(Number(data.kpi.moy_par_jour)), sub: 'placettes/jour', color: '#0284c7' },
            { label: 'Accessibles', value: data.accessibilite.global.nb_accessible, sub: `/ ${data.kpi.total_visitees} réalisées`, color: '#d97706' },
            { label: 'Placettes contrôlées', value: data.kpi.nb_controle ?? 0, sub: 'vérification qualité', color: '#8b5cf6' },
          ].map((kpi, i) => (
            <div key={i} style={{ ...S.card, position: 'relative', overflow: 'hidden', padding: '20px 24px 16px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: kpi.color, opacity: 0.6 }} />
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>{kpi.label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 28, color: kpi.color }}>{kpi.value}</span>
                {kpi.sub && <span style={{ color: '#94a3b8', fontSize: 13 }}>{kpi.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-column content area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* LEFT — tabs + panel content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2, padding: '0 24px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                style={{
                  background: tab === id ? 'rgba(5,150,105,0.07)' : 'transparent',
                  border: 'none', borderBottom: `2px solid ${tab === id ? '#059669' : 'transparent'}`,
                  color: tab === id ? '#059669' : '#94a3b8',
                  cursor: 'pointer', padding: '10px 14px', fontSize: 13, fontWeight: 500,
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
                <p style={{ color: '#dc2626', fontSize: 14 }}>Erreur : {error}</p>
                <button onClick={load} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
                  Réessayer
                </button>
              </div>
            )}
            {data && !loading && (
              <>
                {tab === 'global'   && <TabGlobal data={data} />}
                {tab === 'equipe'   && <TabEquipe data={data} />}
                {tab === 'essence'  && <TabEssence data={data} />}
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
                background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
              }}>
                {loading ? 'Chargement de la carte…' : ''}
              </div>
          }
        </div>

      </div>
    </div>
  );
}
