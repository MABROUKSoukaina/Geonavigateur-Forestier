package com.ifn.controller;

import com.ifn.entity.Plot;
import com.ifn.service.PlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for surveyed field plots (plot table).
 *
 * Base URL: /api/plots
 */
@RestController
@RequestMapping("/api/plots")
@RequiredArgsConstructor
public class PlotController {

    private final PlotService service;

    /**
     * GET /api/plots
     * Returns all surveyed plots, with optional filters:
     *   ?dpanef=Kénitra
     *   ?valide=true
     */
    @GetMapping
    public ResponseEntity<List<Plot>> getAll(
            @RequestParam(required = false) String dpanef,
            @RequestParam(required = false) Boolean valide) {

        List<Plot> result;

        if (dpanef != null)      result = service.findByDpanef(dpanef);
        else if (valide != null) result = service.findByValide(valide);
        else                     result = service.findAll();

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/plots/{plotNo}
     * Returns a single surveyed plot by its primary key.
     */
    @GetMapping("/{plotNo}")
    public ResponseEntity<Plot> getById(@PathVariable String plotNo) {
        return service.findById(plotNo)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/plots/count
     * Returns the total number of surveyed plots.
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> count() {
        return ResponseEntity.ok(Map.of("count", service.count()));
    }

    /**
     * GET /api/plots/geojson
     * Returns all surveyed plots as a GeoJSON FeatureCollection.
     */
    @GetMapping("/geojson")
    public ResponseEntity<Map<String, Object>> getGeoJson(
            @RequestParam(required = false) Boolean valide) {

        List<Plot> plots = (valide != null)
                ? service.findByValide(valide)
                : service.findAll();

        return ResponseEntity.ok(service.toGeoJson(plots));
    }
}
