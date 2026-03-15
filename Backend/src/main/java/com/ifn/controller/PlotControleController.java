package com.ifn.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST controller for controlled placettes (plot_no ending with 'C').
 * Queries the plot_controle view.
 *
 * Base URL: /api/plots/controle
 */
@RestController
@RequestMapping("/api/plots/controle")
@RequiredArgsConstructor
public class PlotControleController {

    private final JdbcTemplate jdbc;

    // ─── List ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/plots/controle
     * Returns all controlled plots.
     * Optional filters: ?dpanef=  ?dranef=
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll(
            @RequestParam(required = false) String dpanef,
            @RequestParam(required = false) String dranef) {

        StringBuilder sql = new StringBuilder(
                "SELECT plot_no, plot_no_base, plot_dranef, plot_dpanef, " +
                "plot_coordinate_center_x, plot_coordinate_center_y, " +
                "plot_accessibilite, plot_accessibility_a_pied, " +
                "plot_stratum, strate_terrain_essence, " +
                "donnees_topographiques_plot_elevation, " +
                "donnees_topographiques_plot_pente, " +
                "donnees_topographiques_plot_topo_exposition, " +
                "plot_date_start_year, plot_date_start_month, plot_date_start_day, " +
                "plot_date_end_year,   plot_date_end_month,   plot_date_end_day, " +
                "plot_valide, observations_identif, date_created, date_modified " +
                "FROM plot_controle WHERE 1=1");

        List<Object> params = new ArrayList<>();

        if (dpanef != null && !dpanef.isBlank()) {
            sql.append(" AND plot_dpanef = ?");
            params.add(dpanef);
        }
        if (dranef != null && !dranef.isBlank()) {
            sql.append(" AND plot_dranef = ?");
            params.add(dranef);
        }

        sql.append(" ORDER BY plot_no");

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), params.toArray());
        return ResponseEntity.ok(rows);
    }

    // ─── Single ────────────────────────────────────────────────────────────────

    /**
     * GET /api/plots/controle/{plotNo}
     * Returns a single controlled plot by its ID (must end with 'C').
     */
    @GetMapping("/{plotNo}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable String plotNo) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM plot_controle WHERE plot_no = ?", plotNo);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(rows.get(0));
    }

    // ─── Count ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/plots/controle/count
     * Returns the total number of controlled plots.
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> count() {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM plot_controle", Long.class);
        return ResponseEntity.ok(Map.of("count", total != null ? total : 0L));
    }

    // ─── GeoJSON ───────────────────────────────────────────────────────────────

    /**
     * GET /api/plots/controle/geojson
     * Returns controlled plots as a GeoJSON FeatureCollection.
     * Joins with ifn_programme to get coordinates when plot coordinates are missing.
     * Optional filters: ?dpanef=  ?dranef=
     */
    @GetMapping("/geojson")
    public ResponseEntity<Map<String, Object>> getGeoJson(
            @RequestParam(required = false) String dpanef,
            @RequestParam(required = false) String dranef) {

        StringBuilder sql = new StringBuilder(
                "SELECT " +
                "  pc.plot_no, pc.plot_no_base, pc.plot_dranef, pc.plot_dpanef, " +
                "  COALESCE(pc.plot_coordinate_center_x, ip.x_centre) AS lng, " +
                "  COALESCE(pc.plot_coordinate_center_y, ip.y_centre) AS lat, " +
                "  pc.plot_accessibilite, pc.plot_accessibility_a_pied, " +
                "  pc.plot_stratum, pc.strate_terrain_essence, " +
                "  pc.donnees_topographiques_plot_elevation    AS altitude, " +
                "  pc.donnees_topographiques_plot_pente        AS pente, " +
                "  pc.donnees_topographiques_plot_topo_exposition AS exposition, " +
                "  pc.plot_date_start_year, pc.plot_date_start_month, pc.plot_date_start_day, " +
                "  pc.plot_valide, pc.observations_identif, " +
                "  pc.date_created, pc.date_modified, " +
                "  ip.equipe " +
                "FROM plot_controle pc " +
                "LEFT JOIN ifn_programme ip ON ip.num_placette = pc.plot_no_base " +
                "WHERE (pc.plot_coordinate_center_x IS NOT NULL OR ip.x_centre IS NOT NULL) " +
                "  AND (pc.plot_coordinate_center_y IS NOT NULL OR ip.y_centre IS NOT NULL)");

        List<Object> params = new ArrayList<>();

        if (dpanef != null && !dpanef.isBlank()) {
            sql.append(" AND pc.plot_dpanef = ?");
            params.add(dpanef);
        }
        if (dranef != null && !dranef.isBlank()) {
            sql.append(" AND pc.plot_dranef = ?");
            params.add(dranef);
        }

        sql.append(" ORDER BY pc.plot_no");

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), params.toArray());

        // Build GeoJSON FeatureCollection
        List<Map<String, Object>> features = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Number lng = (Number) row.get("lng");
            Number lat = (Number) row.get("lat");
            if (lng == null || lat == null) continue;

            Map<String, Object> geometry = new LinkedHashMap<>();
            geometry.put("type", "Point");
            geometry.put("coordinates", List.of(lng.doubleValue(), lat.doubleValue()));

            Map<String, Object> properties = new LinkedHashMap<>();
            properties.put("plot_no",           row.get("plot_no"));
            properties.put("plot_no_base",       row.get("plot_no_base"));
            properties.put("plot_dranef",        row.get("plot_dranef"));
            properties.put("plot_dpanef",        row.get("plot_dpanef"));
            properties.put("equipe",             row.get("equipe"));
            properties.put("accessibilite",      row.get("plot_accessibilite"));
            properties.put("a_pied",             row.get("plot_accessibility_a_pied"));
            properties.put("stratum",            row.get("plot_stratum"));
            properties.put("essence",            row.get("strate_terrain_essence"));
            properties.put("altitude",           row.get("altitude"));
            properties.put("pente",              row.get("pente"));
            properties.put("exposition",         row.get("exposition"));
            properties.put("date_start_year",    row.get("plot_date_start_year"));
            properties.put("date_start_month",   row.get("plot_date_start_month"));
            properties.put("date_start_day",     row.get("plot_date_start_day"));
            properties.put("valide",             row.get("plot_valide"));
            properties.put("observations",       row.get("observations_identif"));
            properties.put("date_created",       row.get("date_created"));
            properties.put("date_modified",      row.get("date_modified"));

            Map<String, Object> feature = new LinkedHashMap<>();
            feature.put("type", "Feature");
            feature.put("geometry", geometry);
            feature.put("properties", properties);
            features.add(feature);
        }

        Map<String, Object> collection = new LinkedHashMap<>();
        collection.put("type", "FeatureCollection");
        collection.put("totalFeatures", features.size());
        collection.put("features", features);

        return ResponseEntity.ok(collection);
    }
}
