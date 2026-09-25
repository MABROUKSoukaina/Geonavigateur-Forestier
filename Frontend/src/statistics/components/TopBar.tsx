import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { T, labelStyle } from '../theme';
import { MultiSelectDropdown, Segmented } from './ui/Controls';
import { NO_FORMATION } from '../useMapFilters';

export type Page = 'synthese' | 'ecosysteme' | 'placettes';

/** Title sits beside its controls instead of on its own line above them — each group
 * is one row, not two, so the panel only takes the height its content actually needs. */
function Group({ title, children, style }: { title: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: 13,
      padding: '11px 14px', minWidth: 0,
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      ...style,
    }}>
      <div style={{ ...labelStyle, color: T.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{title}</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

export interface AnalyseSelection {
  ecosysteme: string[];
  composition: string[];
  strate: string[];
}

export function TopBar({
  page, onNavigate, analyse, onAnalyseChange, ecosystemeOptions, username, onLogout,
  activeLabel, activeCount, onClearAll, totalProgramme,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  analyse: AnalyseSelection;
  onAnalyseChange: (a: AnalyseSelection) => void;
  ecosystemeOptions: string[];
  username: string;
  onLogout: () => void;
  activeLabel: string;
  activeCount: number;
  onClearAll: () => void;
  totalProgramme?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Brand + session — navigation itself lives in the "Vue" control below. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Link to="/dashboard" title="Retour au tableau de bord" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
          borderRadius: 9, background: T.raised, color: T.muted, flexShrink: 0,
        }}>
          <ArrowBackIcon style={{ fontSize: 17 }} />
        </Link>
        <img src="/anef-logo.png" alt="ANEF" style={{ height: 40, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ width: 1, height: 34, background: T.border, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Inventaire Forestier National 2026 · Statistiques
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 3, fontWeight: 600, lineHeight: 1.3 }}>
            DRANEF Rabat-Salé-Kénitra{totalProgramme != null ? ` · ${totalProgramme} placettes programmées` : ''}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 14,
          borderLeft: `1px solid ${T.border}`,
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%', background: T.raised,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PersonIcon style={{ fontSize: 15, color: T.muted }} />
          </span>
          <span style={{ fontSize: 12, color: T.text }}>{username}</span>
          <button onClick={onLogout} title="Déconnexion" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: T.dim, display: 'flex', padding: 4,
          }}>
            <LogoutIcon style={{ fontSize: 17 }} />
          </button>
        </div>
      </div>

      {/* Groups hug their controls; the selection summary takes up the slack, so the row
          has no dead panel space and needs no separate line of its own. */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <Group title="Analyse forestière (carte + tableaux)">
          <MultiSelectDropdown
            inline label="Écosystème" width={168} value={analyse.ecosysteme} allLabel="Tous"
            onChange={v => onAnalyseChange({ ...analyse, ecosysteme: v })}
            options={[
              ...ecosystemeOptions.map(e => ({ value: e, label: e })),
              { value: NO_FORMATION, label: 'Non renseigné' },
            ]}
          />
          <MultiSelectDropdown
            inline label="Composition" width={136} value={analyse.composition} allLabel="Toutes"
            onChange={v => onAnalyseChange({ ...analyse, composition: v })}
            options={[
              { value: 'pure', label: 'Pure' },
              { value: 'melange', label: 'Mélange' },
            ]}
          />
          <MultiSelectDropdown
            inline label="Densité" width={136} value={analyse.strate} allLabel="Toutes"
            onChange={v => onAnalyseChange({ ...analyse, strate: v })}
            options={[
              { value: '1', label: 'Dense' },
              { value: '2', label: 'Moy. dense' },
              { value: '3', label: 'Claire' },
            ]}
          />
        </Group>

        <Group title="Sélection active" style={{ flex: '1 1 220px' }}>
          <span style={{ fontSize: 12.5, color: activeCount ? T.greenLite : T.dim }}>{activeLabel}</span>
          {activeCount > 0 && (
            <button onClick={onClearAll} style={{
              background: 'none', border: `1px solid ${T.borderStrong}`, borderRadius: 7,
              padding: '4px 10px', fontSize: 11, color: T.muted, cursor: 'pointer', fontFamily: 'inherit',
            }}>Tout effacer</button>
          )}
        </Group>

        {/* Rightmost — page navigation, kept last so it reads as "where am I", after the
            selection context that led there. */}
        <Group title="Vue">
          <Segmented
            value={page}
            onChange={onNavigate}
            options={[
              { value: 'synthese', label: 'Synthèse' },
              { value: 'ecosysteme', label: 'Écosystème' },
              { value: 'placettes', label: 'Placettes' },
            ]}
          />
        </Group>
      </div>
    </div>
  );
}
