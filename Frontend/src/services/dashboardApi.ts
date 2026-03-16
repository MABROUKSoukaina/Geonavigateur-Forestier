const BACKEND = 'http://localhost:8080';
const BASE_URL = `${BACKEND}/api/dashboard`;
const PLACETTES_BASE = `${BACKEND}/api/placettes`;

// ─── GeoJSON types ────────────────────────────────────────────────────────────

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    numPlacette: string;
    equipe: string | null;
    strateCartographique: string | null;
    altitude: number | null;
    pente: number | null;
    exposition: number | null;
    dpanef: string | null;
    dranef: string | null;
    xRepere: number | null;
    yRepere: number | null;
    distanceRepere: number | null;
    azimutRepere: number | null;
    descriptionRepere: string | null;
    observations: string | null;
  };
}

export interface GeoJsonCollection {
  type: 'FeatureCollection';
  totalFeatures: number;
  features: GeoJsonFeature[];
}

export async function fetchPlacettesGeoJson(
  filters: { equipe?: string; strate?: string } = {}
): Promise<GeoJsonCollection> {
  const params = new URLSearchParams();
  if (filters.equipe) params.set('equipe', filters.equipe);
  if (filters.strate) params.set('strate', filters.strate);
  const qs = params.toString();
  const url = `${PLACETTES_BASE}/geojson${qs ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GeoJSON → ${res.status}`);
  return res.json();
}

// ─── Map GeoJSON types (dashboard/map — joins ifn_programme + plot) ───────────

export interface MapFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    num_placette: string;
    equipe: string | null;
    strate: string | null;
    essence_group: string | null;
    dpanef: string | null;
    altitude: number | null;
    pente: number | null;
    x_repere: number | null;
    y_repere: number | null;
    description_repere: string | null;
    distance_repere: number | null;
    azimut_repere: number | null;
    statut: 'visitee' | 'programmee' | 'controle';
    accessibilite: number | null;
    a_pied: number | null;
    date_modified: string | null;
  };
}

export interface MapCollection {
  type: 'FeatureCollection';
  totalFeatures: number;
  features: MapFeature[];
}

export async function fetchMapGeoJson(): Promise<MapCollection> {
  const res = await fetch(`${BASE_URL}/map`);
  if (!res.ok) throw new Error(`Map GeoJSON → ${res.status}`);
  return res.json();
}

// ─── Response types (matching the SQL views) ─────────────────────────────────

export interface KpiGlobal {
  total_programme: number;
  total_visitees: number;
  restantes: number;
  pct_avancement: number;
  nb_jours_terrain: number;
  moy_par_jour: number;
  nb_controle: number;
}

export interface AvancementEquipe {
  equipe: string;
  total_affecte: number;
  total_visite: number;
  restantes: number;
  pct_avancement: number;
  moy_par_jour: number;
}

export interface AvancementStrate {
  strate: string;
  total_programme: number;
  total_visite: number;
  pct_avancement: number;
}

export interface AvancementEssence {
  essence: string;
  total_visite: number;
}

export interface StrateParEquipe {
  equipe: string;
  essence: string;
  nb_visite: number;
}

export interface AvancementGroupe {
  groupe: string;
  total_programme: number;
  total_visite: number;
  pct_avancement: number;
}

export interface AccessibiliteGlobal {
  total_visitees: number;
  nb_accessible: number;
  nb_inaccessible: number;
  pct_accessible: number;
  /** plot_accessibility_a_pied = 0 → < 100 m */
  nb_a_pied_0: number;
  /** plot_accessibility_a_pied = 1 → 100–500 m */
  nb_a_pied_1: number;
  /** plot_accessibility_a_pied = 2 → > 500 m */
  nb_a_pied_2: number;
}

export interface AccessibiliteEquipe {
  equipe: string;
  total_visite: number;
  nb_accessible: number;
  nb_inaccessible: number;
  pct_accessible: number;
  nb_a_pied_0: number;
  nb_a_pied_1: number;
  nb_a_pied_2: number;
}

export interface VisiteParJour {
  date_visite: string;
  nb_placettes: number;
  nb_accessibles: number;
  cumul_placettes: number;
}

export interface MoyJourEquipe {
  equipe: string;
  date_visite: string;
  nb_visite: number;
  moy_par_jour: number;
}

export interface ProductiviteEquipe {
  equipe: string;
  total_affecte: number;
  total_visite: number;
  nb_jours: number;
  moy_par_jour: number;
  jours_restants_estimes: number | null;
}

export interface ControleParEquipe {
  equipe: string;
  nb_controle: number;
}

export interface DashboardData {
  kpi: KpiGlobal;
  equipes: AvancementEquipe[];
  strates: AvancementStrate[];
  essences: AvancementEssence[];
  groupes: AvancementGroupe[];
  stratesParEquipe: StrateParEquipe[];
  accessibilite: {
    global: AccessibiliteGlobal;
    equipes: AccessibiliteEquipe[];
  };
  temporel: {
    visitesParJour: VisiteParJour[];
    moyParJourEquipe: MoyJourEquipe[];
    productivite: ProductiviteEquipe[];
  };
  controleParEquipe: ControleParEquipe[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [kpi, equipes, strates, essences, groupes, stratesParEquipe, accessibilite, temporel, controleParEquipe] = await Promise.all([
    get<KpiGlobal>('/kpi'),
    get<AvancementEquipe[]>('/equipes'),
    get<AvancementStrate[]>('/strates'),
    get<AvancementEssence[]>('/essences'),
    get<AvancementGroupe[]>('/groupes'),
    get<StrateParEquipe[]>('/strates-par-equipe'),
    get<{ global: AccessibiliteGlobal; equipes: AccessibiliteEquipe[] }>('/accessibilite'),
    get<{ visitesParJour: VisiteParJour[]; moyParJourEquipe: MoyJourEquipe[]; productivite: ProductiviteEquipe[] }>('/temporel'),
    get<ControleParEquipe[]>('/controle-par-equipe'),
  ]);
  return { kpi, equipes, strates, essences, groupes, stratesParEquipe, accessibilite, temporel, controleParEquipe };
}
