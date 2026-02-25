import { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MapView } from './components/map/MapView';
import { Dashboard } from './components/dashboard/Dashboard';
import { useAppStore } from './stores/useAppStore';
import { useDataStore } from './stores/useDataStore';
import { initOfflineRouter } from './services/offlineRouter';

export default function App() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const { loadFromApi, error } = useDataStore();
  const [showDashboard, setShowDashboard] = useState(false);

  // Load placettes from backend API, init offline router, register store globally
  useEffect(() => {
    loadFromApi();
    (window as any).__useAppStore = useAppStore;

    // Try to init offline router (loads from window.ROAD_GRAPH)
    const ready = initOfflineRouter();
    if (ready) {
      console.log('[App] Offline router ready');
    } else {
      console.log('[App] Offline router not available — place road_graph.js and roads_geojson.js in /public/');
    }
  }, []);

  return (
    <div className="app-layout">
      {/* Dashboard — rendered at root level so it sits above the Leaflet map */}
      {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}

      {/* API error banner */}
      {error && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          color: '#fca5a5', fontSize: 12, padding: '6px 16px', borderRadius: 8, backdropFilter: 'blur(4px)',
        }}>
          Impossible de contacter le serveur : {error}
        </div>
      )}

      {/* Side panel */}
      <div className={`side-panel ${sidebarOpen ? '' : 'collapsed'}`}>
        <Sidebar onShowDashboard={() => setShowDashboard(true)} />
      </div>

      {/* Toggle button */}
      <button
        className="toggle-btn"
        onClick={() => useAppStore.getState().toggleSidebar()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Map fills remaining space */}
      <div className="map-wrapper" style={{ flex: 1, height: '100%', minWidth: 0 }}>
        <MapView />
      </div>
    </div>
  );
}
