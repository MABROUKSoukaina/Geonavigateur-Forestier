const BASE_URL = 'http://localhost:8080/api/dashboard';

// ─── Response types (matching the SQL views) ─────────────────────────────────

export interface KpiGlobal {
  total_programme: number;
  total_visitees: number;
  restantes: number;
  pct_avancement: number;
  nb_jours_terrain: number;
  moy_par_jour: number;
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

export interface AccessibiliteGlobal {
  total_visitees: number;
  nb_accessible: number;
  nb_a_pied: number;
  pct_accessible: number;
  pct_a_pied: number;
}

export interface AccessibiliteEquipe {
  equipe: string;
  total_visite: number;
  nb_accessible: number;
  nb_a_pied: number;
  pct_accessible: number;
  pct_a_pied: number;
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
  visited: number;
  nb_jours: number;
  moy_par_jour: number;
  jours_restants_estimes: number | null;
}

export interface DashboardData {
  kpi: KpiGlobal;
  equipes: AvancementEquipe[];
  strates: AvancementStrate[];
  accessibilite: {
    global: AccessibiliteGlobal;
    equipes: AccessibiliteEquipe[];
  };
  temporel: {
    visitesParJour: VisiteParJour[];
    moyParJourEquipe: MoyJourEquipe[];
    productivite: ProductiviteEquipe[];
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [kpi, equipes, strates, accessibilite, temporel] = await Promise.all([
    get<KpiGlobal>('/kpi'),
    get<AvancementEquipe[]>('/equipes'),
    get<AvancementStrate[]>('/strates'),
    get<{ global: AccessibiliteGlobal; equipes: AccessibiliteEquipe[] }>('/accessibilite'),
    get<{ visitesParJour: VisiteParJour[]; moyParJourEquipe: MoyJourEquipe[]; productivite: ProductiviteEquipe[] }>('/temporel'),
  ]);
  return { kpi, equipes, strates, accessibilite, temporel };
}
