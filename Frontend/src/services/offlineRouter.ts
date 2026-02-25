/**
 * Offline Router V2 — Dijkstra + TSP sur graphe routier local
 * 
 * Utilise les fichiers:
 * - public/road_graph.js → window.ROAD_GRAPH (graphe routier)
 * - public/roads_geojson.js → window.ROADS_GEOJSON (géométries)
 */

// Types pour le graphe routier
interface GraphNode {
  lat: number;
  lng: number;
  edges: { to: string; dist: number }[];
}

interface RoadGraph {
  nodes: Record<string, GraphNode>;
}

interface RouteResultOffline {
  path: [number, number][];
  distance: number;
  lastMileStart?: [number, number][];
  lastMileEnd?: [number, number][];
}

// Min-Heap pour Dijkstra
class MinHeap {
  private heap: { node: string; priority: number }[] = [];

  insert(node: string, priority: number) {
    this.heap.push({ node, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin(): string | null {
    if (this.heap.length === 0) return null;
    const min = this.heap[0].node;
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private bubbleDown(i: number) {
    const n = this.heap.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

export class OfflineRouterV2 {
  private nodes: Record<string, GraphNode>;
  private nodeIds: string[];
  private geojson: any;
  private edgeGeometries: Map<string, [number, number][]> = new Map();

  constructor(graph: RoadGraph, geojson?: any) {
    this.nodes = graph.nodes;
    this.nodeIds = Object.keys(this.nodes);
    this.geojson = geojson;

    // Index des géométries d'arêtes depuis le GeoJSON
    if (geojson?.features) {
      for (const feature of geojson.features) {
        const geomType = feature.geometry?.type;
        if ((geomType === 'LineString' || geomType === 'MultiLineString') && feature.properties) {
          const from = feature.properties.from || feature.properties.f;
          const to = feature.properties.to || feature.properties.t_node;
          if (from && to) {
            let rawCoords: number[][];
            if (geomType === 'MultiLineString') {
              // Flatten all line segments into a single coordinate array
              rawCoords = (feature.geometry.coordinates as number[][][]).flat();
            } else {
              rawCoords = feature.geometry.coordinates;
            }
            const coords: [number, number][] = rawCoords.map(
              (c: number[]) => [c[1], c[0]] as [number, number] // GeoJSON [lng,lat] → [lat,lng]
            );
            this.edgeGeometries.set(`${from}->${to}`, coords);
            this.edgeGeometries.set(`${to}->${from}`, [...coords].reverse());
          }
        }
      }
      console.log(`[OfflineRouter] ${this.edgeGeometries.size} edge geometries indexed`);
    }

    console.log(`[OfflineRouter] Initialized with ${this.nodeIds.length} nodes`);
  }

  // Haversine distance in meters
  haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Find nearest graph node to a coordinate
  findNearestNode(lat: number, lng: number): string {
    let minDist = Infinity;
    let nearest = this.nodeIds[0];

    for (const id of this.nodeIds) {
      const n = this.nodes[id];
      const d = this.haversine(lat, lng, n.lat, n.lng);
      if (d < minDist) {
        minDist = d;
        nearest = id;
      }
    }
    return nearest;
  }

  // Dijkstra shortest path
  dijkstra(startId: string, endId: string): { path: string[]; distance: number } | null {
    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    const heap = new MinHeap();

    for (const id of this.nodeIds) {
      dist[id] = Infinity;
      prev[id] = null;
    }

    dist[startId] = 0;
    heap.insert(startId, 0);

    while (!heap.isEmpty()) {
      const current = heap.extractMin()!;

      if (current === endId) break;
      if (dist[current] === Infinity) break;

      const node = this.nodes[current];
      if (!node?.edges) continue;

      for (const edge of node.edges) {
        const alt = dist[current] + edge.dist;
        if (alt < (dist[edge.to] ?? Infinity)) {
          dist[edge.to] = alt;
          prev[edge.to] = current;
          heap.insert(edge.to, alt);
        }
      }
    }

    if (dist[endId] === Infinity) return null;

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = endId;
    while (current) {
      path.unshift(current);
      current = prev[current];
    }

    return { path, distance: dist[endId] };
  }

  // Get geometry for a path of node IDs
  private getPathGeometry(nodeIds: string[]): [number, number][] {
    const coords: [number, number][] = [];

    for (let i = 0; i < nodeIds.length - 1; i++) {
      const from = nodeIds[i];
      const to = nodeIds[i + 1];
      const key = `${from}->${to}`;

      const edgeCoords = this.edgeGeometries.get(key);
      if (edgeCoords && edgeCoords.length > 0) {
        // Use precise GeoJSON geometry
        if (coords.length > 0) {
          coords.push(...edgeCoords.slice(1)); // skip first (duplicate)
        } else {
          coords.push(...edgeCoords);
        }
      } else {
        // Fallback: straight line between nodes
        const fromNode = this.nodes[from];
        const toNode = this.nodes[to];
        if (fromNode && toNode) {
          if (coords.length === 0) coords.push([fromNode.lat, fromNode.lng]);
          coords.push([toNode.lat, toNode.lng]);
        }
      }
    }

    return coords;
  }

  // Route between two points
  route(lat1: number, lng1: number, lat2: number, lng2: number): RouteResultOffline | null {
    const startNode = this.findNearestNode(lat1, lng1);
    const endNode = this.findNearestNode(lat2, lng2);

    if (startNode === endNode) {
      return {
        path: [[lat1, lng1], [lat2, lng2]],
        distance: this.haversine(lat1, lng1, lat2, lng2),
      };
    }

    const result = this.dijkstra(startNode, endNode);
    if (!result) return null;

    // Build geometry
    let path = this.getPathGeometry(result.path);

    // Separate last-mile segments for distinct styling
    let lastMileStart: [number, number][] | undefined;
    let lastMileEnd: [number, number][] | undefined;
    if (path.length > 0) {
      const first = path[0];
      const last = path[path.length - 1];
      if (this.haversine(lat1, lng1, first[0], first[1]) > 10) {
        lastMileStart = [[lat1, lng1], first];
      }
      if (this.haversine(lat2, lng2, last[0], last[1]) > 10) {
        lastMileEnd = [last, [lat2, lng2]];
      }
    } else {
      path = [[lat1, lng1], [lat2, lng2]];
    }

    return { path, distance: result.distance, lastMileStart, lastMileEnd };
  }

  // TSP: solve for multiple points (nearest-neighbor heuristic)
  routeMulti(points: { lat: number; lng: number; id: string }[]): {
    orderedPoints: { lat: number; lng: number; id: string }[];
    totalDistance: number;
    fullPath: [number, number][];
    segments: RouteResultOffline[];
  } {
    if (points.length <= 1) {
      return { orderedPoints: points, totalDistance: 0, fullPath: [], segments: [] };
    }

    // Snap to nearest nodes
    const snapped = points.map((p) => ({
      ...p,
      nodeId: this.findNearestNode(p.lat, p.lng),
    }));

    // Nearest neighbor TSP
    const remaining = [...snapped];
    const ordered = [remaining.shift()!];

    while (remaining.length > 0) {
      const current = ordered[ordered.length - 1];
      let minDist = Infinity;
      let minIdx = 0;

      for (let i = 0; i < remaining.length; i++) {
        const result = this.dijkstra(current.nodeId, remaining[i].nodeId);
        const d = result?.distance ?? this.haversine(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
        if (d < minDist) {
          minDist = d;
          minIdx = i;
        }
      }

      ordered.push(remaining.splice(minIdx, 1)[0]);
    }

    // Build full path with routing
    const segments: RouteResultOffline[] = [];
    let fullPath: [number, number][] = [];
    let totalDistance = 0;

    for (let i = 0; i < ordered.length - 1; i++) {
      const seg = this.route(ordered[i].lat, ordered[i].lng, ordered[i + 1].lat, ordered[i + 1].lng);
      if (seg) {
        segments.push(seg);
        fullPath = fullPath.concat(seg.path);
        totalDistance += seg.distance;
      } else {
        // Fallback straight line
        const d = this.haversine(ordered[i].lat, ordered[i].lng, ordered[i + 1].lat, ordered[i + 1].lng);
        segments.push({ path: [[ordered[i].lat, ordered[i].lng], [ordered[i + 1].lat, ordered[i + 1].lng]], distance: d });
        fullPath.push([ordered[i].lat, ordered[i].lng], [ordered[i + 1].lat, ordered[i + 1].lng]);
        totalDistance += d;
      }
    }

    return {
      orderedPoints: ordered,
      totalDistance,
      fullPath,
      segments,
    };
  }
}

// Singleton
let routerInstance: OfflineRouterV2 | null = null;

/**
 * Convert the flat ROAD_GRAPH format into the { nodes } structure expected by OfflineRouterV2.
 * Flat format: { "lng,lat": [lat, lng, [["toLngLat", dist, time], ...]], ... }
 */
function convertFlatGraph(flat: Record<string, any>): RoadGraph {
  const nodes: Record<string, GraphNode> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (!Array.isArray(value) || value.length < 3) continue;
    const [lat, lng, edgesArr] = value as [number, number, [string, number, number][]];
    const edges = (edgesArr || []).map(([to, dist]: [string, number, number]) => ({ to, dist }));
    nodes[key] = { lat, lng, edges };
  }
  return { nodes };
}

export function initOfflineRouter(): boolean {
  const rawGraph = (window as any).ROAD_GRAPH;
  const geojson = (window as any).ROADS_GEOJSON;

  if (!rawGraph) {
    console.warn('[OfflineRouter] ROAD_GRAPH not found. Place road_graph.js in /public/');
    return false;
  }

  // Detect flat format (no .nodes property) and convert
  let graph: RoadGraph;
  if (rawGraph.nodes) {
    graph = rawGraph as RoadGraph;
  } else {
    console.log('[OfflineRouter] Converting flat graph format...');
    graph = convertFlatGraph(rawGraph);
    console.log(`[OfflineRouter] Converted ${Object.keys(graph.nodes).length} nodes`);
  }

  routerInstance = new OfflineRouterV2(graph, geojson || undefined);
  console.log('[OfflineRouter] ✅ Ready');
  return true;
}

export function getOfflineRouter(): OfflineRouterV2 | null {
  if (!routerInstance) initOfflineRouter();
  return routerInstance;
}

export function isOfflineRouterReady(): boolean {
  if (!routerInstance) initOfflineRouter();
  return routerInstance !== null;
}
