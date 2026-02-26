package com.ifn.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
        return ResponseEntity.ok(rows.isEmpty() ? Map.of() : rows.get(0));
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
     * Source: v_avancement_strate
     */
    @GetMapping("/strates")
    public ResponseEntity<List<Map<String, Object>>> getStrates() {
        return ResponseEntity.ok(jdbc.queryForList(
                "SELECT * FROM v_avancement_strate ORDER BY total_visite DESC, total_programme DESC"));
    }

    /**
     * GET /api/dashboard/accessibilite
     * Global + per-team accessibility rates.
     * Returns: { global: {...}, equipes: [...] }
     */
    @GetMapping("/accessibilite")
    public ResponseEntity<Map<String, Object>> getAccessibilite() {
        List<Map<String, Object>> globalRows = jdbc.queryForList("SELECT * FROM v_accessibilite_global");
        List<Map<String, Object>> equipeRows = jdbc.queryForList(
                "SELECT * FROM v_accessibilite_equipe ORDER BY total_visite DESC");
        return ResponseEntity.ok(Map.of(
                "global", globalRows.isEmpty() ? Map.of() : globalRows.get(0),
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
}
