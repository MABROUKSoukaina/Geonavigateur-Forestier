CREATE OR REPLACE VIEW v_controle_par_equipe AS
SELECT
    prog.equipe,
    COUNT(ctrl.plot_no) AS nb_controle
FROM ifn_programme prog
LEFT JOIN plot ctrl ON ctrl.plot_no = prog.num_placette || 'C'
WHERE prog.equipe IS NOT NULL
GROUP BY prog.equipe
ORDER BY prog.equipe;

CREATE OR REPLACE VIEW v_controle_service_par_equipe AS
SELECT
    prog.equipe,
    COUNT(cs.plot_no) AS nb_controle_service
FROM ifn_programme prog
LEFT JOIN plot cs ON cs.plot_no = prog.num_placette || 'CS'
WHERE prog.equipe IS NOT NULL
GROUP BY prog.equipe
ORDER BY prog.equipe;
