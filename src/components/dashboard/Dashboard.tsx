import { useState, useEffect } from 'react';
import type {
  DashboardData, AvancementEquipe, AccessibiliteEquipe, ProductiviteEquipe,
} from '../../services/dashboardApi';
import { fetchDashboardData } from '../../services/dashboardApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EQUIPE_COLORS = ['#818cf8', '#4ade80', '#f59e0b', '#ef4444', '#38bdf8', '#c084fc'];
const BAR_COLORS    = ['#4ade80', '#38bdf8', '#f59e0b', '#c084fc', '#ef4444', '#fb923c'];


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

// ─── Tab panels ───────────────────────────────────────────────────────────────

function TabGlobal({ data }: { data: DashboardData }) {
  const { kpi, strates } = data;
  const pct = Number(kpi.pct_avancement);
  const visited = strates.filter(s => s.total_visite > 0);
  const unvisited = strates.filter(s => s.total_visite === 0);

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
            <StatBox label="Visitées" value={kpi.total_visitees} color="#059669" />
            <StatBox label="Restantes" value={kpi.restantes ?? kpi.total_programme - kpi.total_visitees} color="#dc2626" />
            <StatBox label="Jours terrain" value={kpi.nb_jours_terrain} color="#0284c7" />
          </div>
        </div>
      </Card>

      <Card title="Top strates visitées">
        {visited.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Aucune strate visitée</p>
        ) : (
          visited.map((s, i) => (
            <BarH key={s.strate}
              label={s.strate}
              value={s.total_visite} max={s.total_programme} count={s.total_programme}
              color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))
        )}
        {unvisited.length > 0 && (
          <div style={{ ...S.innerCard, fontSize: 12, color: '#64748b', marginTop: 12, border: '1px solid #e2e8f0' }}>
            {unvisited.length} strate(s) non encore visitée(s) sur {strates.length}
          </div>
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
                  { label: 'Visitées', val: eq.total_visite, color: undefined },
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
      <Card title="Comparaison des équipes">
        {equipes.map((eq: AvancementEquipe) => (
          <BarH key={eq.equipe} label={equipeShort(eq.equipe)}
            value={eq.total_visite} max={eq.total_affecte} count={eq.total_affecte}
            color={equipeColor(eq.equipe)} />
        ))}
      </Card>
    </div>
  );
}

function TabStrate({ data }: { data: DashboardData }) {
  const { strates, kpi } = data;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Placettes visitées par strate">
        {strates.map((s) => (
          <BarH key={s.strate} label={s.strate}
            value={s.total_visite} max={s.total_programme} count={s.total_programme}
            color={s.total_visite > 0 ? '#059669' : 'rgba(0,0,0,0.1)'} />
        ))}
      </Card>
      <Card title="Distribution du programme par strate">
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
          {strates.map((s) => {
            const pctProg = ((s.total_programme / kpi.total_programme) * 100).toFixed(1);
            return (
              <div key={s.strate}
                style={{
                  background: '#f8fafc', borderRadius: 10, padding: 12, minWidth: 130,
                  border: s.total_visite > 0 ? '1px solid rgba(16,185,129,0.4)' : '1px solid #e2e8f0',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.strate}</span>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{pctProg}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'flex-end' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18 }}>{s.total_programme}</span>
                  {s.total_visite > 0 && (
                    <span style={{ color: '#059669', fontSize: 11, fontWeight: 600 }}>✓ {s.total_visite}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
            Sur {kpi.nb_jours_terrain} jour(s) · {kpi.total_visitees} visitées
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
              <p style={{ fontSize: 14, fontWeight: 600 }}>{d.nb_placettes} placettes visitées</p>
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

function TabAccessibilite({ data }: { data: DashboardData }) {
  const { global: g, equipes } = data.accessibilite;
  const activeEquipes = (equipes as AccessibiliteEquipe[]).filter(eq => eq.total_visite > 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card title="Accessibilité globale">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <StatBox label="Accessibles" value={g.nb_accessible} color="#059669" sub={`/ ${g.total_visitees} visitées`} />
          <StatBox label="À pied" value={g.nb_a_pied} color="#0284c7" sub={`/ ${g.total_visitees} visitées`} />
        </div>
        <BarH label="Taux d'accessibilité" value={g.nb_accessible} max={g.total_visitees} count={g.total_visitees} color="#059669" />
        <BarH label="Taux accès à pied" value={g.nb_a_pied} max={g.total_visitees} count={g.total_visitees} color="#0284c7" />
      </Card>

      <Card title="Accessibilité par équipe">
        {activeEquipes.map((eq) => {
          const color = equipeColor(eq.equipe);
          return (
            <div key={eq.equipe} style={{ ...S.innerCard, marginBottom: 16, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color }}>{equipeShort(eq.equipe)}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{eq.total_visite} visitée(s)</span>
              </div>
              <BarH label="Accessibles" value={eq.nb_accessible} max={eq.total_visite} count={eq.total_visite} color={color} />
              <BarH label="À pied" value={eq.nb_a_pied} max={eq.total_visite} count={eq.total_visite} color="#0284c7" />
            </div>
          );
        })}
        {activeEquipes.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Aucune donnée</p>
        )}
      </Card>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'global',   label: 'Vue globale' },
  { id: 'equipe',   label: 'Par équipe' },
  { id: 'strate',   label: 'Par strate' },
  { id: 'temporel', label: 'Temporel' },
  { id: 'access',   label: 'Accessibilité' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
            <path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
          </svg>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#1e293b' }}>
              Tableau de Bord <span style={{ color: '#059669' }}>IFN 2026</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, padding: '16px 32px', flexShrink: 0 }}>
          {[
            { label: 'Placettes visitées', value: data.kpi.total_visitees, sub: `/ ${data.kpi.total_programme}`, color: '#059669' },
            { label: "Taux d'avancement", value: `${Number(data.kpi.pct_avancement).toFixed(1)}%`, color: '#059669' },
            { label: 'Moyenne / jour', value: Number(data.kpi.moy_par_jour).toFixed(1), sub: 'placettes/jour', color: '#0284c7' },
            { label: 'Accessibles', value: data.accessibilite.global.nb_accessible, sub: `/ ${data.kpi.total_visitees} visitées`, color: '#d97706' },
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '0 32px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              background: tab === id ? 'rgba(5,150,105,0.07)' : 'transparent',
              border: 'none', borderBottom: `2px solid ${tab === id ? '#059669' : 'transparent'}`,
              color: tab === id ? '#059669' : '#94a3b8',
              cursor: 'pointer', padding: '10px 16px', fontSize: 13, fontWeight: 500,
              transition: 'all 0.2s', marginBottom: -1,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
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
            {tab === 'strate'   && <TabStrate data={data} />}
            {tab === 'temporel' && <TabTemporel data={data} />}
            {tab === 'access'   && <TabAccessibilite data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
