import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapStore } from '../../stores/useMapStore';
import { useDataStore } from '../../stores/useDataStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useAppStore } from '../../stores/useAppStore';
import { TILE_URLS, DEFAULT_CENTER, DEFAULT_ZOOM } from '../../utils/constants';
import type { NavPoint, Placette, BasemapType } from '../../types';

// ===== MARKER ICONS =====
const icons = {
  placette: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#00d4aa,#00ffcc);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
  }),
  repere: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:24px;height:24px;background:linear-gradient(135deg,#ffd93d,#ffec8b);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#333" stroke="#333" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>
    </div>`,
    iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12],
  }),
  selected: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#ff00ff,#ff66ff);border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(255,0,255,0.6),0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
  }),
  start: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#4285f4,#6fa3f7);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">D</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  }),
  end: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#ff6b6b,#ff8e8e);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">A</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  }),
  gps: L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:20px;height:20px;background:#4285f4;border:3px solid white;border-radius:50%;box-shadow:0 0 0 8px rgba(66,133,244,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  }),
};

// Numbered marker for multi-point route order
function makeNumberedIcon(num: number) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#f59e0b,#fbbf24);border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(245,158,11,0.5),0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;font-family:'Space Mono',monospace;">${num}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
  });
}

// ===== POPUP BUILDERS =====
function buildPlacettePopup(p: Placette): string {
  return `
    <div class="popup-content">
      <div class="popup-header">
        <div class="popup-icon placette">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div>
          <div class="popup-title">Placette ${p.code}</div>
          <div class="popup-subtitle">${p.strate || 'Non classée'}</div>
        </div>
      </div>
      <div class="popup-grid">
        <div class="popup-item"><div class="popup-item-label">Longitude</div><div class="popup-item-value">${p.lng.toFixed(6)}</div></div>
        <div class="popup-item"><div class="popup-item-label">Latitude</div><div class="popup-item-value">${p.lat.toFixed(6)}</div></div>
        <div class="popup-item"><div class="popup-item-label">Altitude</div><div class="popup-item-value">${p.altitude ?? '--'} m</div></div>
        <div class="popup-item"><div class="popup-item-label">Pente</div><div class="popup-item-value">${p.pente ?? '--'}°</div></div>
        <div class="popup-item"><div class="popup-item-label">Exposition</div><div class="popup-item-value">${p.exposition ?? '--'}°</div></div>
        <div class="popup-item"><div class="popup-item-label">Distance repère</div><div class="popup-item-value">${p.distance ?? '--'} m</div></div>
      </div>
      <div class="popup-actions">
        <button class="popup-btn" onclick="window.__geonav_navigate('${p.id}')">Y aller</button>
        <button class="popup-btn" onclick="window.__geonav_navigateRepere('${p.id}')">Aller au repère</button>
        <button class="popup-btn select-btn" onclick="window.__geonav_select('${p.id}')">Sélectionner</button>
        <button class="popup-btn parcours-btn" onclick="window.__geonav_addParcours('${p.id}')">+ Parcours</button>
      </div>
    </div>`;
}

function buildReperePopup(p: Placette): string {
  return `
    <div class="popup-content">
      <div class="popup-header">
        <div class="popup-icon repere">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#333"><circle cx="12" cy="12" r="6"/></svg>
        </div>
        <div>
          <div class="popup-title">Repère - ${p.code}</div>
          <div class="popup-subtitle">${p.repere?.description || 'Point de repère'}</div>
        </div>
      </div>
      <div class="popup-grid">
        <div class="popup-item full"><div class="popup-item-label">Code placette</div><div class="popup-item-value">${p.code}</div></div>
        <div class="popup-item"><div class="popup-item-label">X Repère</div><div class="popup-item-value">${p.repere?.lng.toFixed(6)}</div></div>
        <div class="popup-item"><div class="popup-item-label">Y Repère</div><div class="popup-item-value">${p.repere?.lat.toFixed(6)}</div></div>
        <div class="popup-item"><div class="popup-item-label">Altitude</div><div class="popup-item-value">${p.altitude ?? '--'} m</div></div>
        <div class="popup-item"><div class="popup-item-label">Pente</div><div class="popup-item-value">${p.pente ?? '--'}°</div></div>
      </div>
      <div class="popup-actions">
        <button class="popup-btn" onclick="window.__geonav_navigate('${p.id}')">Aller à la placette</button>
        <button class="popup-btn parcours-btn" onclick="window.__geonav_addParcours('${p.id}')">+ Parcours</button>
      </div>
    </div>`;
}

// ===== MAP EVENT HANDLERS =====
function MapClickHandler() {
  const clickMode = useMapStore((s) => s.clickMode);
  const setClickMode = useMapStore((s) => s.setClickMode);
  const setStartPoint = useNavigationStore((s) => s.setStartPoint);
  const setEndPoint = useNavigationStore((s) => s.setEndPoint);
  const addMultiPointPlacette = useNavigationStore((s) => s.addMultiPointPlacette);
  const placettes = useDataStore((s) => s.placettes);

  useMapEvents({
    click(e) {
      const point: NavPoint = {
        type: 'map', lat: e.latlng.lat, lng: e.latlng.lng,
        label: `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`,
      };
      if (clickMode === 'setStart') { setStartPoint(point); setClickMode('none'); }
      else if (clickMode === 'setEnd') { setEndPoint(point); setClickMode('none'); }
      else if (clickMode === 'addMultiPoint') {
        let minDist = Infinity, nearest = null;
        for (const p of placettes) {
          const d = Math.hypot(p.lat - e.latlng.lat, p.lng - e.latlng.lng);
          if (d < minDist) { minDist = d; nearest = p; }
        }
        if (nearest && minDist < 0.05) addMultiPointPlacette(nearest.id);
      }
    },
  });
  return null;
}

function MapSync() {
  const map = useMap();
  const center = useMapStore((s) => s.center);
  const zoom = useMapStore((s) => s.zoom);
  const prev = useRef({ center, zoom });
  useEffect(() => {
    if (center !== prev.current.center || zoom !== prev.current.zoom) {
      map.setView(center, zoom);
      prev.current = { center, zoom };
    }
  }, [center, zoom, map]);
  return null;
}

function RouteFitBounds() {
  const map = useMap();
  const route = useNavigationStore((s) => s.route);
  const multiPointRoute = useNavigationStore((s) => s.multiPointRoute);

  useEffect(() => {
    const coords = route?.coordinates;
    if (coords && coords.length >= 2) {
      const bounds = L.latLngBounds(coords.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route, map]);

  useEffect(() => {
    const coords = multiPointRoute?.routeCoordinates;
    if (coords && coords.length >= 2) {
      const bounds = L.latLngBounds(coords.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [multiPointRoute, map]);

  return null;
}

// ===== SVG Eye icons =====
const EyeOpen = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeClosed = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ===== MAP LEGEND OVERLAY =====
function MapLegend({ customLayers }: { customLayers: { id: string; name: string; color: string; visible: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const showPlacettes = useAppStore((s) => s.showPlacettes);
  const showReperes = useAppStore((s) => s.showReperes);
  const showGpsMarker = useAppStore((s) => s.showGpsMarker);
  const showRoute = useAppStore((s) => s.showRoute);
  const showLastMile = useAppStore((s) => s.showLastMile);
  const togglePlacettes = useAppStore((s) => s.togglePlacettes);
  const toggleReperes = useAppStore((s) => s.toggleReperes);
  const toggleGpsMarker = useAppStore((s) => s.toggleGpsMarker);
  const toggleRoute = useAppStore((s) => s.toggleRoute);
  const toggleLastMile = useAppStore((s) => s.toggleLastMile);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);

  return (
    <div className="map-legend-overlay">
      <button className="map-legend-toggle" onClick={() => setOpen(!open)} title="Légende">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </button>
      {open && (
        <div className="map-legend-content">
          <div className="map-legend-title">Légende</div>
          <div className={`map-legend-item toggleable ${showPlacettes ? '' : 'hidden-layer'}`} onClick={togglePlacettes}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#00d4aa,#00ffcc)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span>Placettes</span>
            <span className="legend-eye">{showPlacettes ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showReperes ? '' : 'hidden-layer'}`} onClick={toggleReperes}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#ffd93d,#ffec8b)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#333" stroke="#333" strokeWidth="2"><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span>Repères</span>
            <span className="legend-eye">{showReperes ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showGpsMarker ? '' : 'hidden-layer'}`} onClick={toggleGpsMarker}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#4285f4', border: '2px solid white', boxShadow: '0 0 0 4px rgba(66,133,244,0.3), 0 1px 4px rgba(0,0,0,0.3)', flexShrink: 0 }} />
            <span>Position GPS</span>
            <span className="legend-eye">{showGpsMarker ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showRoute ? '' : 'hidden-layer'}`} onClick={toggleRoute}>
            <div style={{ width: 22, height: 4, background: '#00e5ff', borderRadius: 2, boxShadow: '0 0 4px rgba(0,229,255,0.4)', flexShrink: 0 }} />
            <span>Itinéraire</span>
            <span className="legend-eye">{showRoute ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          <div className={`map-legend-item toggleable ${showLastMile ? '' : 'hidden-layer'}`} onClick={toggleLastMile}>
            <div style={{ width: 22, height: 0, borderTop: '3px dashed #888', flexShrink: 0 }} />
            <span>Dernier km</span>
            <span className="legend-eye">{showLastMile ? <EyeOpen /> : <EyeClosed />}</span>
          </div>
          {customLayers.length > 0 && <div className="map-legend-sep" />}
          {customLayers.map((l) => (
            <div key={l.id} className={`map-legend-item toggleable ${l.visible ? '' : 'hidden-layer'}`} onClick={() => toggleLayerVisibility(l.id)}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, flexShrink: 0 }} />
              <span>{l.name}</span>
              <span className="legend-eye">{l.visible ? <EyeOpen /> : <EyeClosed />}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== MAP BASEMAP SWITCHER OVERLAY =====
const BASEMAP_OPTIONS: { value: BasemapType; label: string }[] = [
  { value: 'google-hybrid', label: 'Google Hybrid' },
  { value: 'google-sat', label: 'Google Satellite' },
  { value: 'google-sat-nolabel', label: 'Satellite (sans label)' },
  { value: 'cartodb-dark', label: 'Dark Mode' },
  { value: 'osm', label: 'OpenStreetMap' },
  { value: 'topo', label: 'Topographie' },
];

function MapBasemapSwitcher({ basemap }: { basemap: BasemapType }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="map-basemap-switcher">
      <button className="map-legend-toggle" onClick={() => setOpen(!open)} title="Fond de carte">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>
      </button>
      {open && (
        <div className="map-basemap-content">
          <div className="map-legend-title">Fond de carte</div>
          {BASEMAP_OPTIONS.map((bm) => (
            <button
              key={bm.value}
              className={`map-basemap-option ${basemap === bm.value ? 'active' : ''}`}
              onClick={() => { useMapStore.getState().setBasemap(bm.value); setOpen(false); }}
            >
              {bm.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== MAIN MAP COMPONENT =====
export function MapView() {
  const basemap = useMapStore((s) => s.basemap);
  const customLayers = useMapStore((s) => s.customLayers);
  const clickMode = useMapStore((s) => s.clickMode);
  const placettes = useDataStore((s) => s.placettes);
  const selectedPlacettes = useDataStore((s) => s.selectedPlacettes);
  const multiPointPlacettes = useNavigationStore((s) => s.multiPointPlacettes);
  const showPlacettes = useAppStore((s) => s.showPlacettes);
  const showReperes = useAppStore((s) => s.showReperes);
  const showGpsMarker = useAppStore((s) => s.showGpsMarker);
  const showRoute = useAppStore((s) => s.showRoute);
  const showLastMile = useAppStore((s) => s.showLastMile);
  const { startPoint, endPoint, route, multiPointRoute } = useNavigationStore();
  const showRoadNetwork = useAppStore((s) => s.showRoadNetwork);
  const tile = TILE_URLS[basemap];
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Determine if we're in active navigation mode (route calculated)
  const isNavigating = !!(route && route.coordinates.length > 0);
  const isMultiNavigating = !!(multiPointRoute && multiPointRoute.routeCoordinates.length > 0);

  // IDs of placettes involved in navigation
  const navigationPlacetteIds = new Set<string>();
  if (isNavigating) {
    // For simple route: start/end placette IDs
    if (startPoint?.id) navigationPlacetteIds.add(startPoint.id);
    if (endPoint?.id) navigationPlacetteIds.add(endPoint.id);
  }
  if (isMultiNavigating) {
    // For multi-point: all multiPointPlacettes
    multiPointPlacettes.forEach((id) => navigationPlacetteIds.add(id));
  }

  // Ordered placettes for multi-point (for numbered markers)
  const orderedMultiPlacettes = isMultiNavigating
    ? multiPointRoute!.orderedPlacettes.map((id) => placettes.find((p) => p.id === id)).filter(Boolean) as Placette[]
    : [];

  // Which placettes to show on map
  const visiblePlacettes = (isNavigating || isMultiNavigating)
    ? placettes.filter((p) => navigationPlacetteIds.has(p.id))
    : placettes;

  // Register global popup handlers
  useEffect(() => {
    (window as any).__geonav_navigate = (id: string) => {
      const p = useDataStore.getState().placettes.find((pl) => pl.id === id);
      if (p) {
        useNavigationStore.getState().setEndPoint({ type: 'placette', lat: p.lat, lng: p.lng, label: p.code, id: p.id });
        getAppStoreState().setActiveTab('navigation');
      }
    };
    (window as any).__geonav_navigateRepere = (id: string) => {
      const p = useDataStore.getState().placettes.find((pl) => pl.id === id);
      if (p?.repere) {
        useNavigationStore.getState().setEndPoint({ type: 'repere', lat: p.repere.lat, lng: p.repere.lng, label: `Repère ${p.code}` });
        getAppStoreState().setActiveTab('navigation');
      }
    };
    (window as any).__geonav_select = (id: string) => {
      useDataStore.getState().toggleSelectPlacette(id);
    };
    (window as any).__geonav_addParcours = (id: string) => {
      useNavigationStore.getState().addMultiPointPlacette(id);
      useNavigationStore.getState().setNavSubTab('multi');
      getAppStoreState().setActiveTab('navigation');
    };
  }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const getIcon = (pId: string) => {
    // During multi-point navigation (route calculated), use optimized order
    if (isMultiNavigating) {
      const idx = orderedMultiPlacettes.findIndex((p) => p.id === pId);
      if (idx >= 0) return makeNumberedIcon(idx + 1);
    }
    // Multi-point selection (before route calculation), show numbered orange markers
    const multiIdx = multiPointPlacettes.indexOf(pId);
    if (multiIdx >= 0) return makeNumberedIcon(multiIdx + 1);
    if (selectedPlacettes.includes(pId)) return icons.selected;
    return icons.placette;
  };

  return (
    <div style={{ width: '100%', height: '100%', cursor: clickMode !== 'none' ? 'crosshair' : undefined }}>
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={tile.maxZoom} />
        <MapClickHandler />
        <MapSync />
        <RouteFitBounds />

        {/* Placettes — only concerned ones during navigation */}
        {showPlacettes && visiblePlacettes.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={getIcon(p.id)}>
            <Popup maxWidth={320} minWidth={260}>
              <div dangerouslySetInnerHTML={{ __html: buildPlacettePopup(p) }} />
            </Popup>
          </Marker>
        ))}

        {/* Repères — only during non-navigation or for concerned placettes */}
        {showReperes && (isNavigating || isMultiNavigating
          ? visiblePlacettes.filter((p) => p.repere).map((p) => (
              <Marker key={`rep-${p.id}`} position={[p.repere!.lat, p.repere!.lng]} icon={icons.repere}>
                <Popup maxWidth={320} minWidth={240}>
                  <div dangerouslySetInnerHTML={{ __html: buildReperePopup(p) }} />
                </Popup>
              </Marker>
            ))
          : placettes.filter((p) => p.repere).map((p) => (
              <Marker key={`rep-${p.id}`} position={[p.repere!.lat, p.repere!.lng]} icon={icons.repere}>
                <Popup maxWidth={320} minWidth={240}>
                  <div dangerouslySetInnerHTML={{ __html: buildReperePopup(p) }} />
                </Popup>
              </Marker>
            ))
        )}

        {/* Start/End markers */}
        {startPoint && <Marker position={[startPoint.lat, startPoint.lng]} icon={icons.start}><Popup>Départ: {startPoint.label}</Popup></Marker>}
        {endPoint && <Marker position={[endPoint.lat, endPoint.lng]} icon={icons.end}><Popup>Arrivée: {endPoint.label}</Popup></Marker>}

        {/* GPS */}
        {showGpsMarker && userPos && <Marker position={userPos} icon={icons.gps}><Popup>Ma position</Popup></Marker>}

        {/* Simple route — VERY VISIBLE: border + thick colored line */}
        {showRoute && route && route.coordinates.length > 0 && (
          <>
            {/* Border / shadow */}
            <Polyline positions={route.coordinates} pathOptions={{ color: '#000000', weight: 9, opacity: 0.3 }} />
            {/* Main line */}
            <Polyline positions={route.coordinates} pathOptions={{ color: '#00e5ff', weight: 6, opacity: 0.95 }} />
            {/* Last mile: grey dashed lines from road to off-road placettes */}
            {showLastMile && route.lastMileStart && (
              <Polyline positions={route.lastMileStart} pathOptions={{ color: '#888888', weight: 4, opacity: 0.8, dashArray: '8, 8' }} />
            )}
            {showLastMile && route.lastMileEnd && (
              <Polyline positions={route.lastMileEnd} pathOptions={{ color: '#888888', weight: 4, opacity: 0.8, dashArray: '8, 8' }} />
            )}
          </>
        )}

        {/* Multi-point route — VERY VISIBLE */}
        {showRoute && multiPointRoute && multiPointRoute.routeCoordinates.length > 0 && (
          <>
            {/* Border */}
            <Polyline positions={multiPointRoute.routeCoordinates} pathOptions={{ color: '#000000', weight: 9, opacity: 0.3 }} />
            {/* Main line */}
            <Polyline positions={multiPointRoute.routeCoordinates} pathOptions={{ color: '#00e5ff', weight: 6, opacity: 0.95 }} />
            {/* Last mile segments from each route segment */}
            {showLastMile && multiPointRoute.segments?.map((seg, i) => (
              <React.Fragment key={`lm-${i}`}>
                {seg.lastMileStart && (
                  <Polyline positions={seg.lastMileStart} pathOptions={{ color: '#888888', weight: 4, opacity: 0.8, dashArray: '8, 8' }} />
                )}
                {seg.lastMileEnd && (
                  <Polyline positions={seg.lastMileEnd} pathOptions={{ color: '#888888', weight: 4, opacity: 0.8, dashArray: '8, 8' }} />
                )}
              </React.Fragment>
            ))}
          </>
        )}

        {/* Road network layer (from ROADS_GEOJSON) */}
        {showRoadNetwork && (window as any).ROADS_GEOJSON && (
          <GeoJSON
            key="road-network"
            data={(window as any).ROADS_GEOJSON}
            style={(feature: any) => {
              const type = feature?.properties?.t;
              if (type === 'R') return { color: '#ff6b6b', weight: 3, opacity: 0.8 };
              if (type === 'P') return { color: '#fbbf24', weight: 2, opacity: 0.6 };
              if (type === 'V') return { color: '#8b5cf6', weight: 2, opacity: 0.7 };
              return { color: '#888', weight: 1, opacity: 0.5 };
            }}
          />
        )}

        {/* Custom layers */}
        {customLayers.filter((l) => l.visible).map((layer) => <GeoJSON key={layer.id} data={layer.data as GeoJSON.GeoJsonObject} style={{ color: layer.color, weight: 2, opacity: 0.7 }} />)}
      </MapContainer>

      {/* Click mode overlay */}
      {clickMode !== 'none' && (
        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 10 }}>
          📍 {clickMode === 'setStart' ? 'Cliquez pour le départ' : clickMode === 'setEnd' ? "Cliquez pour l'arrivée" : 'Cliquez sur les placettes'}
          <button onClick={() => useMapStore.getState().setClickMode('none')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* Map controls */}
      <div className="map-controls">
        <button className={`map-btn ${gpsLoading ? 'gps-locating' : ''}`} onClick={() => {
          if (gpsLoading) return;
          setGpsLoading(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setGpsLoading(false);
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setUserPos([lat, lng]);
              useMapStore.getState().setCenter([lat, lng]);
              useMapStore.getState().setZoom(16);
            },
            () => { setGpsLoading(false); alert('Erreur GPS : position indisponible'); },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }} title="Ma position">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>
        </button>
        <button className="map-btn" onClick={() => useMapStore.getState().setZoom(Math.min(useMapStore.getState().zoom + 1, 18))} title="Zoom +">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6M11 8v6"/></svg>
        </button>
        <button className="map-btn" onClick={() => useMapStore.getState().setZoom(Math.max(useMapStore.getState().zoom - 1, 4))} title="Zoom -">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
        </button>
      </div>

      {/* ===== BASEMAP SWITCHER — top right ===== */}
      <MapBasemapSwitcher basemap={basemap} />

      {/* ===== MAP LEGEND — bottom left ===== */}
      <MapLegend customLayers={customLayers} />
    </div>
  );
}

const getAppStoreState = () => {
  return (window as any).__useAppStore?.getState?.() || { setActiveTab: () => {} };
};
