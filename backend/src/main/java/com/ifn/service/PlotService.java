package com.ifn.service;

import com.ifn.entity.Plot;
import com.ifn.repository.PlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
