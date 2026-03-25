import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import ForestIcon from '@mui/icons-material/Forest';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Sidebar } from './components/layout/Sidebar';
import { MapView } from './components/map/MapView';
import { Dashboard } from './components/dashboard/Dashboard';
import { useAppStore } from './stores/useAppStore';
import { useDataStore } from './stores/useDataStore';
import { initOfflineRouter } from './services/offlineRouter';

const MAP_PASSWORD = 'ifn_2026';

function MapLogin({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = () => {
    if (value === MAP_PASSWORD) { onUnlock(); }
    else { setError(true); setValue(''); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1628 0%, #0f2744 50%, #0a1628 100%)',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      {/* Decorative blurred circles */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(16,185,129,0.07)', filter: 'blur(80px)', top: '-10%', left: '-5%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(56,189,248,0.06)', filter: 'blur(60px)', bottom: '5%', right: '5%', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: '48px 52px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        minWidth: 360, backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
          boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
        }}>
          <ForestIcon style={{ fontSize: 32, color: '#fff' }} />
        </div>

        {/* Title */}
        <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 6 }}>
          Géo Navigateur Forestier
        </div>
        <div style={{ marginBottom: 36 }} />

        {/* Input */}
        <div style={{ width: '100%', marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: focused ? '#10b981' : '#475569', fontSize: 18, pointerEvents: 'none',
              transition: 'color 0.2s', display: 'flex', alignItems: 'center',
            }}>
              <LockOutlinedIcon style={{ fontSize: 18 }} />
            </span>
            <input
              type="password"
              placeholder="Mot de passe"
              value={value}
              onChange={e => { setValue(e.target.value); setError(false); }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                width: '100%', padding: '13px 14px 13px 42px',
                borderRadius: 12, fontSize: 14,
                background: 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${error ? '#ef4444' : focused ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              autoFocus
            />
          </div>
          <div style={{
            height: 18, marginTop: 6, paddingLeft: 4,
            color: '#ef4444', fontSize: 12,
            opacity: error ? 1 : 0, transition: 'opacity 0.2s',
          }}>
            Mot de passe incorrect
          </div>
        </div>

        {/* Button */}
        <button onClick={submit} style={{
          width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
          letterSpacing: '0.3px', transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Accéder
        </button>

        {/* Footer */}
        <div style={{ color: '#334155', fontSize: 11, marginTop: 28 }}>
          Inventaire Forestier National © 2026
        </div>
      </div>
    </div>
  );
}

function MapApp() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const { loadFromApi, error } = useDataStore();

  useEffect(() => {
    loadFromApi();
    (window as any).__useAppStore = useAppStore;
    const ready = initOfflineRouter();
    if (ready) {
      console.log('[App] Offline router ready');
    } else {
      console.log('[App] Offline router not available — place road_graph.js and roads_geojson.js in /public/');
    }
  }, []);

  return (
    <div className="app-layout">
      {error && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          color: '#fca5a5', fontSize: 12, padding: '6px 16px', borderRadius: 8, backdropFilter: 'blur(4px)',
        }}>
          Impossible de contacter le serveur : {error}
        </div>
      )}
      <div className={`side-panel ${sidebarOpen ? '' : 'collapsed'}`}>
        <Sidebar onShowDashboard={() => {}} />
      </div>
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
      <div className="map-wrapper" style={{ flex: 1, height: '100%', minWidth: 0, touchAction: 'none', overflow: 'hidden' }}>
        <MapView />
      </div>
    </div>
  );
}

function ProtectedMap() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('map_unlocked') === '1');
  const unlock = () => { sessionStorage.setItem('map_unlocked', '1'); setUnlocked(true); };
  return unlocked ? <MapApp /> : <MapLogin onUnlock={unlock} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedMap />} />
      <Route path="/dashboard" element={<Dashboard onClose={() => {}} />} />
    </Routes>
  );
}
