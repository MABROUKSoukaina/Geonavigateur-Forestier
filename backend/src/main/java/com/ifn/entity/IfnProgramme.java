package com.ifn.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ifn_programme")
@Getter @Setter @NoArgsConstructor
public class IfnProgramme {

    @Id
    @Column(name = "num_placette", length = 50)
    private String numPlacette;

    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "x_centre", nullable = false)
    private Double xCentre;

    @Column(name = "y_centre", nullable = false)
    private Double yCentre;

    @Column(name = "srs_id", length = 20)
    private String srsId;

    @Column(name = "round_d")
    private Integer roundD;

    @Column(name = "x_repere")
    private Double xRepere;

    @Column(name = "y_repere")
    private Double yRepere;

    @Column(name = "distance_repere")
    private Double distanceRepere;

    @Column(name = "azimut_repere")
    private Double azimutRepere;

    @Column(name = "description_repere", columnDefinition = "text")
    private String descriptionRepere;

    @Column(name = "dranef", length = 100)
    private String dranef;

    @Column(name = "dpanef", length = 100)
    private String dpanef;

    @Column(name = "equipe", length = 150)
    private String equipe;

    @Column(name = "altitude")
    private Integer altitude;

    @Column(name = "exposition")
    private Integer exposition;

    @Column(name = "pente")
    private Integer pente;

    @Column(name = "strate_cartographique", length = 20)
    private String strateCartographique;

    @Column(name = "essence_group", length = 100)
    private String essenceGroup;

    @Column(name = "xutm84")
    private Integer xutm84;

    @Column(name = "yutm84")
    private Integer yutm84;

    @Column(name = "observations", columnDefinition = "text")
    private String observations;
}
