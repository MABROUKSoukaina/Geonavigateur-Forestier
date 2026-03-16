package com.ifn.service;

import com.ifn.entity.Plot;
import com.ifn.repository.PlotRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PlotService {

    private final PlotRepository repository;

    public List<Plot> findAll() {
        return repository.findAll();
    }

    public Optional<Plot> findById(String plotNo) {
        return repository.findById(plotNo);
    }

    public List<Plot> findByDpanef(String dpanef) {
        return repository.findByPlotDpanef(dpanef);
    }

    public List<Plot> findByValide(Boolean valide) {
        return repository.findByPlotValide(valide);
    }

    public long count() {
        return repository.count();
    }

    /**
     * Imports plots from a CSV file. Updates existing rows (by plot_no), inserts new ones.
     * Returns a map with "inserted" and "updated" counts.
     */
    public Map<String, Integer> importCsv(MultipartFile file) throws IOException {
        int inserted = 0, updated = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .setIgnoreEmptyLines(true)
                     .build()
                     .parse(reader)) {

            for (CSVRecord rec : parser) {
                String plotNo = str(rec, "plot_no");
                if (plotNo == null || plotNo.isBlank()) continue;

                boolean exists = repository.existsById(plotNo);
                Plot p = exists ? repository.findById(plotNo).orElse(new Plot()) : new Plot();

                p.setPlotNo(plotNo);
                p.setPlotCoordinateCenterX(dbl(rec, "plot_coordinate_center_x"));
                p.setPlotCoordinateCenterY(dbl(rec, "plot_coordinate_center_y"));
                p.setPlotCoordinateCenterSrs(str(rec, "plot_coordinate_center_srs"));
                p.setPlotCoordinateAccesX(dbl(rec, "plot_coordinate_acces_x"));
                p.setPlotCoordinateAccesY(dbl(rec, "plot_coordinate_acces_y"));
                p.setPlotRepereCoordX(dbl(rec, "plot_repere_coord_x"));
                p.setPlotRepereCoordY(dbl(rec, "plot_repere_coord_y"));
                p.setPlotDistanceCentre(dbl(rec, "plot_distance_centre"));
                p.setPlotAzimutCentre(integer(rec, "plot_azimut_centre"));
                p.setPlotElevation(integer(rec, "donnees_topographiques_plot_elevation"));
                p.setPlotPente(dbl(rec, "donnees_topographiques_plot_pente"));
                p.setPlotExposition(integer(rec, "donnees_topographiques_plot_topo_exposition"));
                p.setPlotTopoPosition(integer(rec, "donnees_topographiques_plot_topo_position"));
                p.setPlotStratum(str(rec, "plot_stratum"));
                p.setStrateTerrainEssence(str(rec, "strate_terrain_essence"));
                p.setStrateTerrainHauteur(str(rec, "strate_terrain_hauteur"));
                p.setStrateTerrainDensite(integer(rec, "strate_terrain_densite"));
                p.setStrateTerrainRegime(str(rec, "strate_terrain_regime"));
                p.setPlotStratumInterpretation(str(rec, "plot_stratum_interpretation"));
                p.setPlotStratumD(str(rec, "plot_stratum_d"));
                p.setPlotAccessibilite(integer(rec, "plot_accessibilite"));
                p.setPlotAccessibilityAPied(integer(rec, "plot_accessibility_a_pied"));
                p.setPlotCenter(bool(rec, "plot_center"));
                p.setPlotRepereAccessibilite(bool(rec, "plot_repere_accessibilite"));
                p.setPlotDranef(str(rec, "plot_dranef"));
                p.setPlotDpanef(str(rec, "plot_dpanef"));
                p.setPlotDateStartYear(integer(rec, "plot_date_start_year"));
                p.setPlotDateStartMonth(integer(rec, "plot_date_start_month"));
                p.setPlotDateStartDay(integer(rec, "plot_date_start_day"));
                p.setPlotDateEndYear(integer(rec, "plot_date_end_year"));
                p.setPlotDateEndMonth(integer(rec, "plot_date_end_month"));
                p.setPlotDateEndDay(integer(rec, "plot_date_end_day"));
                p.setCouvertureVegetaleDuSol(integer(rec, "couverture_vegetale_couverture_du_sol"));
                p.setHauteurMoyenneDominante(dbl(rec, "couverture_vegetale_hauteur_moyenne_dominante"));
                p.setPedologiqueSubstrat(integer(rec, "description_pedologique_substrat"));
                p.setPedologiqueProfondeur(integer(rec, "description_pedologique_profondeur_du_sol"));
                p.setPlotValide(bool(rec, "plot_valide"));
                p.setMsgValide(str(rec, "msg_valide"));
                p.setObservationsIdentif(str(rec, "observations_identif"));
                p.setCountryCode(integer(rec, "country_code"));

                repository.save(p);
                if (exists) updated++; else inserted++;
            }
        }
        return Map.of("inserted", inserted, "updated", updated);
    }

    // ─── CSV parsing helpers ───────────────────────────────────────────────────

    private String str(CSVRecord rec, String col) {
        if (!rec.isMapped(col)) return null;
        String v = rec.get(col);
        return (v == null || v.isBlank()) ? null : v.trim();
    }

    private Double dbl(CSVRecord rec, String col) {
        String v = str(rec, col);
        if (v == null) return null;
        try { return Double.parseDouble(v); } catch (NumberFormatException e) { return null; }
    }

    private Integer integer(CSVRecord rec, String col) {
        String v = str(rec, col);
        if (v == null) return null;
        try { return Integer.parseInt(v); } catch (NumberFormatException e) {
            try { return (int) Double.parseDouble(v); } catch (NumberFormatException e2) { return null; }
        }
    }

    private Boolean bool(CSVRecord rec, String col) {
        String v = str(rec, col);
        if (v == null) return null;
        return "true".equalsIgnoreCase(v) || "1".equals(v) || "yes".equalsIgnoreCase(v);
    }

    /**
     * Converts surveyed plots to a GeoJSON FeatureCollection.
     */
    public Map<String, Object> toGeoJson(List<Plot> plots) {
        List<Map<String, Object>> features = plots.stream()
                .filter(p -> p.getPlotCoordinateCenterX() != null && p.getPlotCoordinateCenterY() != null)
                .map(p -> {
                    Map<String, Object> geometry = new LinkedHashMap<>();
                    geometry.put("type", "Point");
                    geometry.put("coordinates", new double[]{
                            p.getPlotCoordinateCenterX(), p.getPlotCoordinateCenterY()
                    });

                    Map<String, Object> properties = new LinkedHashMap<>();
                    properties.put("plotNo", p.getPlotNo());
                    properties.put("plotElevation", p.getPlotElevation());
                    properties.put("plotPente", p.getPlotPente());
                    properties.put("plotExposition", p.getPlotExposition());
                    properties.put("plotStratum", p.getPlotStratum());
                    properties.put("strateTerrainEssence", p.getStrateTerrainEssence());
                    properties.put("plotStratumInterpretation", p.getPlotStratumInterpretation());
                    properties.put("plotDranef", p.getPlotDranef());
                    properties.put("plotDpanef", p.getPlotDpanef());
                    properties.put("plotValide", p.getPlotValide());
                    properties.put("plotRepereCoordX", p.getPlotRepereCoordX());
                    properties.put("plotRepereCoordY", p.getPlotRepereCoordY());
                    properties.put("plotDistanceCentre", p.getPlotDistanceCentre());
                    properties.put("plotAzimutCentre", p.getPlotAzimutCentre());
                    properties.put("plotAccessibilite", p.getPlotAccessibilite());
                    properties.put("observationsIdentif", p.getObservationsIdentif());

                    Map<String, Object> feature = new LinkedHashMap<>();
                    feature.put("type", "Feature");
                    feature.put("geometry", geometry);
                    feature.put("properties", properties);
                    return feature;
                }).toList();

        Map<String, Object> featureCollection = new LinkedHashMap<>();
        featureCollection.put("type", "FeatureCollection");
        featureCollection.put("totalFeatures", features.size());
        featureCollection.put("features", features);
        return featureCollection;
    }
}
