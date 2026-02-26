package com.ifn.service;

import com.ifn.entity.IfnProgramme;
import com.ifn.repository.IfnProgrammeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class IfnProgrammeService {

    private final IfnProgrammeRepository repository;

    public List<IfnProgramme> findAll() {
        return repository.findAll();
    }

    public Optional<IfnProgramme> findById(String numPlacette) {
        return repository.findById(numPlacette);
    }

    public List<IfnProgramme> findByDpanef(String dpanef) {
        return repository.findByDpanef(dpanef);
    }

    public List<IfnProgramme> findByDranef(String dranef) {
        return repository.findByDranef(dranef);
    }

    public List<IfnProgramme> findByEquipe(String equipe) {
        return repository.findByEquipe(equipe);
    }

    public List<IfnProgramme> findByStrate(String strate) {
        return repository.findByStrateCartographique(strate);
    }

    public List<IfnProgramme> findByEssence(String essence) {
        return repository.findByEssenceGroup(essence);
    }

    public long count() {
        return repository.count();
    }

    /**
     * Converts the full list of placettes to a GeoJSON FeatureCollection.
     */
    public Map<String, Object> toGeoJson(List<IfnProgramme> placettes) {
        List<Map<String, Object>> features = placettes.stream()
                .filter(p -> p.getXCentre() != null && p.getYCentre() != null)
                .map(p -> {
                    Map<String, Object> geometry = new LinkedHashMap<>();
                    geometry.put("type", "Point");
                    geometry.put("coordinates", new double[]{p.getXCentre(), p.getYCentre()});

                    Map<String, Object> properties = new LinkedHashMap<>();
                    properties.put("numPlacette", p.getNumPlacette());
                    properties.put("altitude", p.getAltitude());
                    properties.put("pente", p.getPente());
                    properties.put("exposition", p.getExposition());
                    properties.put("strateCartographique", p.getStrateCartographique());
                    properties.put("essenceGroup", p.getEssenceGroup());
                    properties.put("dranef", p.getDranef());
                    properties.put("dpanef", p.getDpanef());
                    properties.put("equipe", p.getEquipe());
                    properties.put("xRepere", p.getXRepere());
                    properties.put("yRepere", p.getYRepere());
                    properties.put("distanceRepere", p.getDistanceRepere());
                    properties.put("azimutRepere", p.getAzimutRepere());
                    properties.put("descriptionRepere", p.getDescriptionRepere());
                    properties.put("observations", p.getObservations());

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
