package com.ifn.controller;

import com.ifn.entity.IfnProgramme;
import com.ifn.service.IfnProgrammeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for planned forest plots (ifn_programme table).
 *
 * Base URL: /api/placettes
 */
@RestController
@RequestMapping("/api/placettes")
@RequiredArgsConstructor
public class IfnProgrammeController {

    private final IfnProgrammeService service;

    /**
     * GET /api/placettes
     * Returns all placettes, with optional filters:
     *   ?dpanef=Kénitra
     *   ?dranef=Rabat-Salé-Kénitra
     *   ?equipe=Equipe+Kénitra+(N°01/26)
     *   ?strate=QsH
     *   ?essence=Quercus+suber
     */
    @GetMapping
    public ResponseEntity<List<IfnProgramme>> getAll(
            @RequestParam(required = false) String dpanef,
            @RequestParam(required = false) String dranef,
            @RequestParam(required = false) String equipe,
            @RequestParam(required = false) String strate,
            @RequestParam(required = false) String essence) {

        List<IfnProgramme> result;

        if (dpanef != null)       result = service.findByDpanef(dpanef);
        else if (dranef != null)  result = service.findByDranef(dranef);
        else if (equipe != null)  result = service.findByEquipe(equipe);
        else if (strate != null)  result = service.findByStrate(strate);
        else if (essence != null) result = service.findByEssence(essence);
        else                      result = service.findAll();

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/placettes/{numPlacette}
     * Returns a single placette by its primary key.
     */
    @GetMapping("/{numPlacette}")
    public ResponseEntity<IfnProgramme> getById(@PathVariable String numPlacette) {
        return service.findById(numPlacette)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/placettes/count
     * Returns the total number of placettes.
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> count() {
        return ResponseEntity.ok(Map.of("count", service.count()));
    }

    /**
     * GET /api/placettes/geojson
     * Returns all placettes (or filtered subset) as a GeoJSON FeatureCollection.
     */
    @GetMapping("/geojson")
    public ResponseEntity<Map<String, Object>> getGeoJson(
            @RequestParam(required = false) String dpanef,
            @RequestParam(required = false) String dranef,
            @RequestParam(required = false) String strate,
            @RequestParam(required = false) String essence) {

        List<IfnProgramme> placettes;

        if (dpanef != null)       placettes = service.findByDpanef(dpanef);
        else if (dranef != null)  placettes = service.findByDranef(dranef);
        else if (strate != null)  placettes = service.findByStrate(strate);
        else if (essence != null) placettes = service.findByEssence(essence);
        else                      placettes = service.findAll();

        return ResponseEntity.ok(service.toGeoJson(placettes));
    }
}
