package com.ifn.repository;

import com.ifn.entity.Plot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlotRepository extends JpaRepository<Plot, String> {

    List<Plot> findByPlotDpanef(String dpanef);

    List<Plot> findByPlotDranef(String dranef);

    List<Plot> findByPlotValide(Boolean valide);

    List<Plot> findByPlotStratumInterpretation(String stratumInterpretation);
}
