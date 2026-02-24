import type { Placette } from '../types';

const BASE_URL = 'http://localhost:8080/api';

// ─── Raw API response shape ──────────────────────────────────────────────────

interface IfnProgrammeResponse {
  numPlacette: string;
  xCentre: number;
  yCentre: number;
  xRepere?: number;
  yRepere?: number;
  distanceRepere?: number;
  azimutRepere?: number;
  descriptionRepere?: string;
  pente?: number;
  altitude?: number;
  exposition?: number;
  strateCartographique?: string;
  essenceGroup?: string;
  dranef?: string;
  dpanef?: string;
  equipe?: string;
  observations?: string;
}

// ─── Mapper: API response → Placette ────────────────────────────────────────

function mapToPlacette(p: IfnProgrammeResponse): Placette {
  return {
    id: p.numPlacette,
    code: p.numPlacette,
    lat: p.yCentre,
    lng: p.xCentre,
    pente: p.pente,
    altitude: p.altitude,
    exposition: p.exposition,
    strate: p.strateCartographique,
    azimut: p.azimutRepere,
    distance: p.distanceRepere,
    description: [p.dranef, p.dpanef, p.equipe].filter(Boolean).join(' — ') || undefined,
    repere:
      p.xRepere !== undefined && p.yRepere !== undefined
        ? { lat: p.yRepere, lng: p.xRepere, description: p.descriptionRepere }
        : undefined,
  };
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function fetchPlacettes(params?: {
  dpanef?: string;
  dranef?: string;
  equipe?: string;
  strate?: string;
  essence?: string;
}): Promise<Placette[]> {
  const url = new URL(`${BASE_URL}/placettes`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const data: IfnProgrammeResponse[] = await res.json();
  return data.map(mapToPlacette);
}
