import { useNavigate } from 'react-router-dom';
import ForestIcon from '@mui/icons-material/Forest';
import { useAppStore } from '../../stores/useAppStore';
import { NavigationPanel } from '../panels/NavigationPanel';
import { PlacettesPanel } from '../panels/PlacettesPanel';
import { DataPanel } from '../panels/DataPanel';
import { LayersPanel } from '../panels/LayersPanel';
import type { TabType } from '../../types';

const TABS: { key: TabType; label: string }[] = [
  { key: 'navigation', label: 'Navigation' },
  { key: 'placettes', label: 'Placettes' },
  { key: 'data', label: 'Données' },
  { key: 'layers', label: 'Couches' },
];

interface SidebarProps { onShowDashboard?: () => void; }

export function Sidebar({ onShowDashboard }: SidebarProps) {
  const navigate = useNavigate();
  const { routingMode, setRoutingMode, activeTab, setActiveTab,
    showRoadRoutes, showRoadPistes, showRoadVoies,
    toggleRoadRoutes, toggleRoadPistes, toggleRoadVoies } = useAppStore();

  // Master toggle: active if at least one type is visible
  const showRoadNetwork = showRoadRoutes || showRoadPistes || showRoadVoies;
  const toggleRoadNetwork = () => {
    // If any are on → turn all off; if all off → turn all on
    const allOff = !showRoadRoutes && !showRoadPistes && !showRoadVoies;
    if (allOff) { toggleRoadRoutes(); toggleRoadPistes(); toggleRoadVoies(); }
    else { if (showRoadRoutes) toggleRoadRoutes(); if (showRoadPistes) toggleRoadPistes(); if (showRoadVoies) toggleRoadVoies(); }
  };

  return (
    <>
      {/* Header */}
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo">
            <ForestIcon style={{ fontSize: 26 }} />
          </div>
          <div className="panel-title">
            <h1>GeoNav</h1>
            <span>Placettes Forestières RSK</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          title="Tableau de bord IFN"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            color: 'var(--accent)', background: 'rgba(0,212,170,0.08)',
            border: '1px solid rgba(0,212,170,0.25)', cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
          </svg>
          Stats
        </button>
      </div>

      {/* Global Routing Toggle */}
      <div className="global-routing-toggle">
        <div className="routing-mode-toggle-compact">
          <button
            className={`routing-mode-btn-compact ${routingMode === 'offline' ? 'active' : ''}`}
            onClick={() => setRoutingMode('offline')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Offline
          </button>
          <button
            className={`routing-mode-btn-compact ${routingMode === 'online' ? 'active' : ''}`}
            onClick={() => setRoutingMode('online')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Online
          </button>
        </div>
        <div className="global-controls-row">
          <div className="routing-status">
            {routingMode === 'offline' ? '🗺️ Réseau local actif' : '⚡ Routage en ligne actif'}
          </div>
          <div className="network-toggle-compact" onClick={toggleRoadNetwork}>
            <div className={`toggle-switch-small ${showRoadNetwork ? 'active' : ''}`} />
            <span>Afficher réseau</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="panel-content">
        {activeTab === 'navigation' && <NavigationPanel />}
        {activeTab === 'placettes' && <PlacettesPanel />}
        {activeTab === 'data' && <DataPanel />}
        {activeTab === 'layers' && <LayersPanel />}
      </div>
    </>
  );
}
