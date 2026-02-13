import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MapView } from './components/map/MapView';
import { useAppStore } from './stores/useAppStore';
import { useDataStore } from './stores/useDataStore';
import { DEFAULT_PLACETTES } from './services/defaultData';
import { initOfflineRouter } from './services/offlineRouter';

export default function App() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  // Load default data, init offline router, register store globally
  useEffect(() => {
    useDataStore.getState().setPlacettes(DEFAULT_PLACETTES);
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
      {/* Side panel */}
      <div className={`side-panel ${sidebarOpen ? '' : 'collapsed'}`}>
        <Sidebar />
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

      {/* Map fills entire background */}
      <div style={{ width: '100%', height: '100%' }}>
        <MapView />
      </div>
    </div>
  );
}
