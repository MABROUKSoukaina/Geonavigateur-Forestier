package com.ifn.repository;

import com.ifn.entity.IfnProgramme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IfnProgrammeRepository
        extends JpaRepository<IfnProgramme, String>, JpaSpecificationExecutor<IfnProgramme> {

    List<IfnProgramme> findByDpanef(String dpanef);

    List<IfnProgramme> findByDranef(String dranef);

    List<IfnProgramme> findByEquipe(String equipe);

    List<IfnProgramme> findByStrateCartographique(String strateCartographique);

    List<IfnProgramme> findByEssenceGroup(String essenceGroup);
}
