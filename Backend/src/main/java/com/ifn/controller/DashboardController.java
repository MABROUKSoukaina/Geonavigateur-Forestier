package com.ifn.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller exposing pre-computed PostgreSQL views for the IFN dashboard.
 *
 * Base URL: /api/dashboard
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final JdbcTemplate jdbc;

    /**
     * GET /api/dashboard/kpi
     * Global KPIs: total programmed, visited, remaining, % progress, avg/day.
     * Source: v_kpi_global
     */
    @GetMapping("/kpi")
    public ResponseEntity<Map<String, Object>> getKpi() {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM v_kpi_global");
        if (rows.isEmpty()) return ResponseEntity.ok(Map.of());

        Map<String, Object> kpi = new java.util.LinkedHashMap<>(rows.get(0));

        // Control plots: plot_no ending with 'C' — verified by a second team, NOT regular visits
        Long nbControle = jdbc.queryForObject(
                "SELECT COUNT(*) FROM plot WHERE plot_no LIKE '%C'", Long.class);
        long ctrl = nbControle != null ? nbControle : 0L;

        // Subtract control plots from visited counts and recalculate derived fields
        long rawVisitees  = ((Number) kpi.get("total_visitees")).longValue();
        long totalVisitees = rawVisitees - ctrl;
        long totalProgramme = ((Number) kpi.get("total_programme")).longValue();
        long nbJours = ((Number) kpi.getOrDefault("nb_jours_terrain", 1L)).longValue();

        kpi.put("nb_controle",      ctrl);
        kpi.put("total_visitees",   totalVisitees);
        kpi.put("restantes",        totalProgramme - totalVisitees);
        kpi.put("pct_avancement",   totalProgramme > 0 ? (totalVisitees * 100.0 / totalProgramme) : 0.0);
        kpi.put("moy_par_jour",     nbJours > 0 ? (totalVisitees * 1.0 / nbJours) : 0.0);

        return ResponseEntity.ok(kpi);
    }

    /**
     * GET /api/dashboard/equipes
     * Progress per team: visited, remaining, % progress, avg/day.
     * Source: v_avancement_equipe
     */
    @GetMapping("/equipes")
    public ResponseEntity<List<Map<String, Object>>> getEquipes() {
        return ResponseEntity.ok(jdbc.queryForList("SELECT * FROM v_avancement_equipe ORDER BY pct_avancement DESC"));
    }

    /**
     * GET /api/dashboard/strates
     * Progress per cartographic stratum.
     * Visited count comes from plot.plot_stratum (first 3 chars matched to strate_cartographique),
     * excluding control plots (plot_no LIKE '%C').
     */
    @GetMapping("/strates")
    public ResponseEntity<List<Map<String, Object>>> getStrates() {
        String sql =
                "SELECT " +
                "  prog.strate_cartographique AS strate, " +
                "  COUNT(prog.num_placette)                          AS total_programme, " +
                "  COALESCE(MAX(v.total_visite), 0)                  AS total_visite, " +
                "  ROUND(COALESCE(MAX(v.total_visite), 0) * 100.0 " +
                "        / NULLIF(COUNT(prog.num_placette), 0), 1)   AS pct_avancement " +
                "FROM ifn_programme prog " +
                "LEFT JOIN ( " +
                "  SELECT LEFT(plot_stratum, 3) AS strate_key, COUNT(*) AS total_visite " +
                "  FROM plot " +
                "  WHERE plot_no NOT LIKE '%C' " +
                "    AND plot_stratum IS NOT NULL " +
                "  GROUP BY LEFT(plot_stratum, 3) " +
                ") v ON v.strate_key = prog.strate_cartographique " +
                "WHERE prog.strate_cartographique IS NOT NULL " +
                "GROUP BY prog.strate_cartographique " +
                "ORDER BY COALESCE(MAX(v.total_visite), 0) DESC, COUNT(prog.num_placette) DESC";
        return ResponseEntity.ok(jdbc.queryForList(sql));
    }

    /**
     * GET /api/dashboard/accessibilite
     * Global + per-team accessibility rates.
     * Returns: { global: {...}, equipes: [...] }
     */
    @GetMapping("/accessibilite")
    public ResponseEntity<Map<String, Object>> getAccessibilite() {
        // Global — exclude control plots; split plot_accessibility_a_pied into 3 distance categories
        // 0 = < 100 m  |  1 = 100–500 m  |  2 = > 500 m
        Map<String, Object> raw = jdbc.queryForMap(
                "SELECT " +
                "  COUNT(*) AS total_visitees, " +
                "  SUM(CASE WHEN plot_accessibilite        = 1 THEN 1 ELSE 0 END) AS nb_accessible, " +
                "  SUM(CASE WHEN plot_accessibility_a_pied = 0 THEN 1 ELSE 0 END) AS nb_a_pied_0, " +
                "  SUM(CASE WHEN plot_accessibility_a_pied = 1 THEN 1 ELSE 0 END) AS nb_a_pied_1, " +
                "  SUM(CASE WHEN plot_accessibility_a_pied = 2 THEN 1 ELSE 0 END) AS nb_a_pied_2  " +
                "FROM plot WHERE plot_no NOT LIKE '%C'");

        long total      = ((Number) raw.get("total_visitees")).longValue();
        long accessible = ((Number) raw.get("nb_accessible")).longValue();

        Map<String, Object> global = new LinkedHashMap<>(raw);
        global.put("pct_accessible", total > 0 ? (accessible * 100.0 / total) : 0.0);

        // Per-equipe — same 3-category split, excluding control plots
        List<Map<String, Object>> equipeRows = jdbc.queryForList(
                "SELECT prog.equipe, " +
                "  COUNT(*) AS total_visite, " +
                "  SUM(CASE WHEN pl.plot_accessibilite        = 1 THEN 1 ELSE 0 END) AS nb_accessible, " +
                "  SUM(CASE WHEN pl.plot_accessibility_a_pied = 0 THEN 1 ELSE 0 END) AS nb_a_pied_0, " +
                "  SUM(CASE WHEN pl.plot_accessibility_a_pied = 1 THEN 1 ELSE 0 END) AS nb_a_pied_1, " +
                "  SUM(CASE WHEN pl.plot_accessibility_a_pied = 2 THEN 1 ELSE 0 END) AS nb_a_pied_2, " +
                "  ROUND(SUM(CASE WHEN pl.plot_accessibilite = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS pct_accessible " +
                "FROM ifn_programme prog " +
                "JOIN plot pl ON pl.plot_no = prog.num_placette " +
                "WHERE pl.plot_no NOT LIKE '%C' " +
                "GROUP BY prog.equipe " +
                "ORDER BY total_visite DESC");

        return ResponseEntity.ok(Map.of(
                "global", global,
                "equipes", equipeRows
        ));
    }

    /**
     * GET /api/dashboard/temporel
     * Daily visit counts + per-team averages + productivity projections.
     * Returns: { visitesParJour: [...], parEquipe: [...], productivite: [...] }
     */
    @GetMapping("/temporel")
    public ResponseEntity<Map<String, Object>> getTemporel() {
        List<Map<String, Object>> parJour    = jdbc.queryForList("SELECT * FROM v_visites_par_jour ORDER BY date_visite");
        List<Map<String, Object>> moyEquipe  = jdbc.queryForList("SELECT * FROM v_moy_jour_equipe ORDER BY date_visite, equipe");
        List<Map<String, Object>> productivite = jdbc.queryForList("SELECT * FROM v_productivite_equipe ORDER BY moy_par_jour DESC");
        return ResponseEntity.ok(Map.of(
                "visitesParJour", parJour,
                "moyParJourEquipe", moyEquipe,
                "productivite", productivite
        ));
    }

    /**
     * GET /api/dashboard/essences
     * Visited plot counts grouped by strate_terrain_essence (field-recorded species code).
     * Excludes control plots (plot_no LIKE '%C').
     */
    @GetMapping("/essences")
    public ResponseEntity<List<Map<String, Object>>> getEssences() {
        String sql =
                "SELECT strate_terrain_essence AS essence, COUNT(*) AS total_visite " +
                "FROM plot " +
                "WHERE plot_no NOT LIKE '%C' " +
                "  AND strate_terrain_essence IS NOT NULL " +
                "GROUP BY strate_terrain_essence " +
                "ORDER BY total_visite DESC";
        return ResponseEntity.ok(jdbc.queryForList(sql));
    }

    /**
     * GET /api/dashboard/map
     * GeoJSON FeatureCollection joining ifn_programme + plot.
     * Each feature carries statut (visitee/programmee) and accessibility fields.
     */
    @GetMapping("/map")
    public ResponseEntity<Map<String, Object>> getMapData() {
        // Two separate joins: regular visit (exact match) + control visit (num_placette + 'C')
        String sql =
                "SELECT p.num_placette, p.x_centre AS lon, p.y_centre AS lat, " +
                "p.equipe, p.strate_cartographique AS strate, p.essence_group, p.dpanef, " +
                "p.altitude, p.pente, p.x_repere, p.y_repere, " +
                "p.description_repere, p.distance_repere, p.azimut_repere, " +
                "CASE WHEN ctrl.plot_no IS NOT NULL THEN 'controle' " +
                "     WHEN reg.plot_no  IS NOT NULL THEN 'visitee' " +
                "     ELSE 'programmee' END AS statut, " +
                "COALESCE(reg.plot_accessibilite, ctrl.plot_accessibilite) AS accessibilite, " +
                "COALESCE(reg.plot_accessibility_a_pied, ctrl.plot_accessibility_a_pied) AS a_pied " +
                "FROM ifn_programme p " +
                "LEFT JOIN plot reg  ON reg.plot_no  = p.num_placette " +
                "LEFT JOIN plot ctrl ON ctrl.plot_no = p.num_placette || 'C' " +
                "WHERE p.x_centre IS NOT NULL AND p.y_centre IS NOT NULL";

        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        List<Map<String, Object>> features = new ArrayList<>(rows.size());

        for (Map<String, Object> row : rows) {
            double lon = ((Number) row.get("lon")).doubleValue();
            double lat = ((Number) row.get("lat")).doubleValue();

            Map<String, Object> geometry = new LinkedHashMap<>();
            geometry.put("type", "Point");
            geometry.put("coordinates", new double[]{lon, lat});

            Map<String, Object> props = new LinkedHashMap<>(row);
            props.remove("lon");
            props.remove("lat");

            Map<String, Object> feature = new LinkedHashMap<>();
            feature.put("type", "Feature");
            feature.put("geometry", geometry);
            feature.put("properties", props);
            features.add(feature);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type", "FeatureCollection");
        result.put("totalFeatures", features.size());
        result.put("features", features);
        return ResponseEntity.ok(result);
    }
}
