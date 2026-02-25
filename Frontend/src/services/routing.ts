import { haversine, bearing, cardinalDirection } from '../utils/geo';
import { getOfflineRouter, isOfflineRouterReady } from './offlineRouter';
import type { RouteResult, TransportMode, MultiPointResult, Placette } from '../types';
import { TRANSPORT_SPEEDS } from '../types';

// ===== VOL D'OISEAU =====
export function calculateBirdFlight(
  startLat: number, startLng: number,
  endLat: number, endLng: number
): RouteResult & { bearing: number; direction: string } {
  const dist = haversine(startLat, startLng, endLat, endLng);
  const b = bearing(startLat, startLng, endLat, endLng);
  const dir = cardinalDirection(b);
  const durationWalk = (dist / 1000) / 4 * 3600;
  return {
    coordinates: [[startLat, startLng], [endLat, endLng]],
    distance: dist, duration: durationWalk,
    bearing: b, direction: dir,
    instructions: [`Direction ${dir} (${Math.round(b)}°)`],
  };
}

// ===== OFFLINE — graphe routier local (Dijkstra) =====
export function calculateOfflineGraphRoute(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  mode: TransportMode
): RouteResult & { isOfflineGraph: boolean } {
  if (mode === 'fly') {
    return { ...calculateBirdFlight(startLat, startLng, endLat, endLng), isOfflineGraph: false };
  }

  const router = getOfflineRouter();
  if (!router) {
    // Fallback: estimation ligne droite × 1.4
    return calculateOfflineFallback(startLat, startLng, endLat, endLng, mode);
  }

  const result = router.route(startLat, startLng, endLat, endLng);
  if (!result || result.path.length < 2) {
    return calculateOfflineFallback(startLat, startLng, endLat, endLng, mode);
  }

  const speed = TRANSPORT_SPEEDS[mode];
  const duration = (result.distance / 1000) / speed * 3600;

  return {
    coordinates: result.path,
    distance: result.distance,
    duration,
    isOfflineGraph: true,
    lastMileStart: result.lastMileStart,
    lastMileEnd: result.lastMileEnd,
  };
}

// ===== OFFLINE FALLBACK — ligne droite × 1.4 =====
function calculateOfflineFallback(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  mode: TransportMode
): RouteResult & { isOfflineGraph: boolean } {
  const dist = haversine(startLat, startLng, endLat, endLng);
  const roadDist = dist * 1.4;
  const speed = TRANSPORT_SPEEDS[mode];
  const duration = (roadDist / 1000) / speed * 3600;
  const steps = 20;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    coords.push([startLat + (endLat - startLat) * t, startLng + (endLng - startLng) * t]);
  }
  return { coordinates: coords, distance: roadDist, duration, isOfflineGraph: false };
}

// ===== ONLINE — OSRM =====
export async function calculateOnlineRoute(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  mode: TransportMode
): Promise<RouteResult & { isOSRM?: boolean }> {
  if (mode === 'fly') {
    return calculateBirdFlight(startLat, startLng, endLat, endLng);
  }

  const profile = mode === 'car' ? 'car' : 'foot';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map(
        (c: number[]) => [c[1], c[0]] as [number, number]
      );

      // Separate "last mile" segments — grey dashed lines from road to off-road placettes
      let lastMileStart: [number, number][] | undefined;
      let lastMileEnd: [number, number][] | undefined;
      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (haversine(startLat, startLng, first[0], first[1]) > 10) {
          lastMileStart = [[startLat, startLng], first];
        }
        if (haversine(endLat, endLng, last[0], last[1]) > 10) {
          lastMileEnd = [last, [endLat, endLng]];
        }
      }

      // For car: use OSRM's duration (accounts for road types/speed limits)
      // For walk/bike: recalculate from distance using our speed constants
      // (OSRM's public server only has a reliable 'driving' profile)
      const duration = mode === 'car'
        ? route.duration
        : (route.distance / 1000) / TRANSPORT_SPEEDS[mode] * 3600;

      console.log(`[OSRM] ✅ ${(route.distance/1000).toFixed(1)}km, ${Math.round(duration/60)}min (${mode})`);
      return { coordinates: coords, distance: route.distance, duration, isOSRM: true, lastMileStart, lastMileEnd };
    }
    throw new Error('No route');
  } catch (e: any) {
    console.warn(`[OSRM] ❌ ${e.message}, trying offline...`);
    // Fallback to offline graph
    const offResult = calculateOfflineGraphRoute(startLat, startLng, endLat, endLng, mode);
    return { ...offResult, isOSRM: false };
  }
}

// ===== MAIN ROUTE FUNCTION — respects Online/Offline toggle =====
export async function calculateRoute(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  mode: TransportMode,
  routingMode: 'offline' | 'online'
): Promise<RouteResult & { source: 'osrm' | 'offline-graph' | 'offline-fallback' | 'vol' }> {
  if (mode === 'fly') {
    return { ...calculateBirdFlight(startLat, startLng, endLat, endLng), source: 'vol' };
  }

  if (routingMode === 'online') {
    const result = await calculateOnlineRoute(startLat, startLng, endLat, endLng, mode);
    if ((result as any).isOSRM) return { ...result, source: 'osrm' };
    if ((result as any).isOfflineGraph) return { ...result, source: 'offline-graph' };
    return { ...result, source: 'offline-fallback' };
  }

  // Offline mode
  const result = calculateOfflineGraphRoute(startLat, startLng, endLat, endLng, mode);
  return { ...result, source: result.isOfflineGraph ? 'offline-graph' : 'offline-fallback' };
}

// ===== TSP — Multi-point routing =====
export async function solveTSPRoute(
  placettes: Placette[],
  startLat: number, startLng: number,
  mode: TransportMode,
  routingMode: 'offline' | 'online'
): Promise<MultiPointResult & { source: string }> {
  if (placettes.length === 0) {
    return { orderedPlacettes: [], segments: [], totalDistance: 0, totalDuration: 0, routeCoordinates: [], source: '' };
  }

  // Try offline graph TSP first if offline mode
  if (routingMode === 'offline' && isOfflineRouterReady() && mode !== 'fly') {
    const router = getOfflineRouter()!;
    const points = [
      { lat: startLat, lng: startLng, id: '__start__' },
      ...placettes.map((p) => ({ lat: p.lat, lng: p.lng, id: p.id })),
    ];

    const result = router.routeMulti(points);

    // Remove __start__ from ordered
    const orderedIds = result.orderedPoints.filter((p) => p.id !== '__start__').map((p) => p.id);
    const speed = TRANSPORT_SPEEDS[mode];
    const totalDuration = (result.totalDistance / 1000) / speed * 3600;

    return {
      orderedPlacettes: orderedIds,
      segments: result.segments.map((s) => ({ coordinates: s.path, distance: s.distance, duration: (s.distance / 1000) / speed * 3600, lastMileStart: s.lastMileStart, lastMileEnd: s.lastMileEnd })),
      totalDistance: result.totalDistance,
      totalDuration: totalDuration,
      routeCoordinates: result.fullPath,
      source: 'offline-graph',
    };
  }

  // Nearest-neighbor TSP with per-segment routing
  const remaining = [...placettes];
  const ordered: Placette[] = [];
  let curLat = startLat, curLng = startLng;

  while (remaining.length > 0) {
    let minDist = Infinity, minIdx = 0;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(curLat, curLng, remaining[i].lat, remaining[i].lng);
      if (d < minDist) { minDist = d; minIdx = i; }
    }
    const next = remaining.splice(minIdx, 1)[0];
    ordered.push(next);
    curLat = next.lat;
    curLng = next.lng;
  }

  const segments: RouteResult[] = [];
  let allCoords: [number, number][] = [];
  let totalDist = 0, totalDur = 0;
  let prevLat = startLat, prevLng = startLng;
  let source = '';

  for (const p of ordered) {
    const seg = await calculateRoute(prevLat, prevLng, p.lat, p.lng, mode, routingMode);
    if (!source) source = seg.source;
    segments.push(seg);
    allCoords = allCoords.concat(seg.coordinates);
    totalDist += seg.distance;
    totalDur += seg.duration;
    prevLat = p.lat;
    prevLng = p.lng;
  }

  return {
    orderedPlacettes: ordered.map((p) => p.id),
    segments, totalDistance: totalDist, totalDuration: totalDur,
    routeCoordinates: allCoords,
    source,
  };
}

// Legacy exports for compatibility
export { calculateOfflineGraphRoute as calculateOfflineRoute };
export { solveTSPRoute as solveTSPOnline };
export function solveTSP(
  placettes: Placette[], startLat: number, startLng: number, mode: TransportMode
): MultiPointResult {
  // Synchronous fallback — nearest neighbor + straight lines
  const remaining = [...placettes];
  const ordered: Placette[] = [];
  let curLat = startLat, curLng = startLng;
  while (remaining.length > 0) {
    let minDist = Infinity, minIdx = 0;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(curLat, curLng, remaining[i].lat, remaining[i].lng);
      if (d < minDist) { minDist = d; minIdx = i; }
    }
    const next = remaining.splice(minIdx, 1)[0];
    ordered.push(next);
    curLat = next.lat; curLng = next.lng;
  }
  const segments: RouteResult[] = [];
  let allCoords: [number, number][] = [];
  let totalDist = 0, totalDur = 0;
  let prevLat2 = startLat, prevLng2 = startLng;
  for (const p of ordered) {
    const result = calculateOfflineGraphRoute(prevLat2, prevLng2, p.lat, p.lng, mode);
    segments.push(result);
    allCoords = allCoords.concat(result.coordinates);
    totalDist += result.distance;
    totalDur += result.duration;
    prevLat2 = p.lat; prevLng2 = p.lng;
  }
  return { orderedPlacettes: ordered.map((p) => p.id), segments, totalDistance: totalDist, totalDuration: totalDur, routeCoordinates: allCoords };
}
