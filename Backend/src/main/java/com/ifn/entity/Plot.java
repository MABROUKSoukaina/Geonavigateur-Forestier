package com.ifn.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "plot")
@Getter @Setter @NoArgsConstructor
public class Plot {

    @Id
    @Column(name = "plot_no", length = 50)
    private String plotNo;

    // ─── Location ──────────────────────────────────────────────────────────────
    @Column(name = "plot_coordinate_center_x")
    private Double plotCoordinateCenterX;

    @Column(name = "plot_coordinate_center_y")
    private Double plotCoordinateCenterY;

    @Column(name = "plot_coordinate_center_srs", length = 20)
    private String plotCoordinateCenterSrs;

    @Column(name = "plot_coordinate_acces_x")
    private Double plotCoordinateAccesX;

    @Column(name = "plot_coordinate_acces_y")
    private Double plotCoordinateAccesY;

    @Column(name = "plot_repere_coord_x")
    private Double plotRepereCoordX;

    @Column(name = "plot_repere_coord_y")
    private Double plotRepereCoordY;

    @Column(name = "plot_distance_centre")
    private Double plotDistanceCentre;

    @Column(name = "plot_azimut_centre")
    private Integer plotAzimutCentre;

    // ─── Topography ────────────────────────────────────────────────────────────
    @Column(name = "donnees_topographiques_plot_elevation")
    private Integer plotElevation;

    @Column(name = "donnees_topographiques_plot_pente")
    private Double plotPente;

    @Column(name = "donnees_topographiques_plot_topo_exposition")
    private Integer plotExposition;

    @Column(name = "donnees_topographiques_plot_topo_position")
    private Integer plotTopoPosition;

    // ─── Stratum ───────────────────────────────────────────────────────────────
    @Column(name = "plot_stratum", length = 30)
    private String plotStratum;

    @Column(name = "strate_terrain_essence", length = 10)
    private String strateTerrainEssence;

    @Column(name = "strate_terrain_hauteur", length = 10)
    private String strateTerrainHauteur;

    @Column(name = "strate_terrain_densite")
    private Integer strateTerrainDensite;

    @Column(name = "strate_terrain_regime", length = 10)
    private String strateTerrainRegime;

    @Column(name = "plot_stratum_interpretation", length = 20)
    private String plotStratumInterpretation;

    @Column(name = "plot_stratum_d", length = 100)
    private String plotStratumD;

    // ─── Accessibility ─────────────────────────────────────────────────────────
    @Column(name = "plot_accessibilite")
    private Integer plotAccessibilite;

    @Column(name = "plot_accessibility_a_pied")
    private Integer plotAccessibilityAPied;

    @Column(name = "plot_center")
    private Boolean plotCenter;

    @Column(name = "plot_repere_accessibilite")
    private Boolean plotRepereAccessibilite;

    // ─── Regional info ─────────────────────────────────────────────────────────
    @Column(name = "plot_dranef", length = 100)
    private String plotDranef;

    @Column(name = "plot_dpanef", length = 100)
    private String plotDpanef;

    // ─── Survey dates ──────────────────────────────────────────────────────────
    @Column(name = "plot_date_start_year")
    private Integer plotDateStartYear;

    @Column(name = "plot_date_start_month")
    private Integer plotDateStartMonth;

    @Column(name = "plot_date_start_day")
    private Integer plotDateStartDay;

    @Column(name = "plot_date_end_year")
    private Integer plotDateEndYear;

    @Column(name = "plot_date_end_month")
    private Integer plotDateEndMonth;

    @Column(name = "plot_date_end_day")
    private Integer plotDateEndDay;

    // ─── Vegetation cover ──────────────────────────────────────────────────────
    @Column(name = "couverture_vegetale_couverture_du_sol")
    private Integer couvertureVegetaleDuSol;

    @Column(name = "couverture_vegetale_hauteur_moyenne_dominante")
    private Double hauteurMoyenneDominante;

    // ─── Pedology ──────────────────────────────────────────────────────────────
    @Column(name = "description_pedologique_substrat")
    private Integer pedologiqueSubstrat;

    @Column(name = "description_pedologique_profondeur_du_sol")
    private Integer pedologiqueProfondeur;

    // ─── Validation ────────────────────────────────────────────────────────────
    @Column(name = "plot_valide")
    private Boolean plotValide;

    @Column(name = "msg_valide", columnDefinition = "text")
    private String msgValide;

    @Column(name = "observations_identif", columnDefinition = "text")
    private String observationsIdentif;

    @Column(name = "country_code")
    private Integer countryCode;
}
