-- Step 1: Create staging table
DROP TABLE IF EXISTS plot_staging;
CREATE TEMP TABLE plot_staging (LIKE plot INCLUDING DEFAULTS);

-- Step 2: Load CSV into staging (without date columns)
\COPY plot_staging (plot_no, plot_accessibilite, plot_photo_accessible_file_name, plot_photo_accessible_file_size, plot_accessibility_a_pied, plot_center, plot_coordinate_acces_srs, plot_coordinate_acces_x, plot_coordinate_acces_y, plot_coordinate_center_srs, plot_coordinate_center_x, plot_coordinate_center_y, plot_repere_accessibilite, plot_date_start_year, plot_date_start_month, plot_date_start_day, plot_time_start_hour, plot_time_start_minute, strate_terrain_essence, strate_terrain_hauteur, strate_terrain_densite, strate_terrain_regime, strate_terrain_composition, plot_stratum, strate_2_essence_2, strate_2_hauteur_2, strate_2_densite_2, strate_2_regime_2, strate_3_essence_3, strate_3_hauteur_3, strate_3_densite_3, strate_3_regime_3, plot_stratum_d, plot_stratum_interpretation, donnees_topographiques_plot_elevation, donnees_topographiques_plot_topo_position, donnees_topographiques_plot_topo_exposition, donnees_topographiques_plot_pente, donnees_topographiques_plot_signe_erosion, donnees_topographiques_plot_type_erosion, donnees_topographiques_plot_degre_erosion, description_pedologique_substrat, description_pedologique_substrat_qualifier, description_pedologique_type_sol, description_pedologique_humus, description_pedologique_profondeur_du_sol, description_pedologique_texture, description_pedologique_p_affleurement_rocheux, description_pedologique_p_cailloux, description_pedologique_type_de_sol, description_pedologique_type_sol1, description_pedologique_observations_pedol, donnees_complementaires_unite_hydrologique, donnees_complementaires_distance_cp, donnees_complementaires_nids, donnees_complementaires_taniere, donnees_complementaires_excrements, donnees_complementaires_observations_compl, couverture_vegetale_couverture_du_sol, couverture_vegetale_couverture_matorral, couverture_vegetale_presence_de_lisiere, couverture_vegetale_hauteur_moyenne_dominante, couverture_vegetale_hauteur_moyenne_dominante_unit_name, caractristiques_specifiques_plot_structure_verticale, caractristiques_specifiques_origine_peuplement, caractristiques_specifiques_plot_densite_de_plantation, caractristiques_specifiques_plot_etat_de_developpement, caractristiques_specifiques_plot_intensite_de_parcours, caractristiques_specifiques_plot_etat, caractristiques_specifiques_plot_ecimage, caractristiques_specifiques_plot_presence_de_mousse, caractristiques_specifiques_plot_signes_incendies, caractristiques_specifiques_plot_fire, caractristiques_specifiques_fire_year, caractristiques_specifiques_plot_fire_intervent, caractristiques_specifiques_plot_interventions_type, caractristiques_specifiques_plot_intervention, plot_photos_plot_photo_centre_file_name, plot_photos_plot_photo_centre_file_size, plot_photos_plot_photo_north_file_name, plot_photos_plot_photo_north_file_size, plot_photos_plot_photo_east_file_name, plot_photos_plot_photo_east_file_size, plot_photos_plot_photo_south_file_name, plot_photos_plot_photo_south_file_size, plot_photos_plot_photo_west_file_name, plot_photos_plot_photo_west_file_size, plot_photos_plot_photo_landscape_file_name, plot_photos_plot_photo_landscape_file_size, plot_valide, plot_stratum_area_join, country_code, plot_distance_centre, plot_distance_centre_unit_name, plot_azimut_centre, plot_azimut_centre_unit_name, plot_repere_coord_x, plot_repere_coord_y, plot_dranef, plot_dpanef, observations_identif, plot_date_end_year, plot_date_end_month, plot_date_end_day, plot_time_end_hour, plot_time_end_minute, msg_valide) FROM 'C:/Users/SEIFN/Downloads/collect-csv-data-export-maroc_ifn_dendrometrie-ENTRY-2026-03-09T10_57_44/plot.csv' CSV HEADER;

-- Step 3: Insert new rows (skip existing)
INSERT INTO plot (plot_no, plot_accessibilite, plot_photo_accessible_file_name, plot_photo_accessible_file_size, plot_accessibility_a_pied, plot_center, plot_coordinate_acces_srs, plot_coordinate_acces_x, plot_coordinate_acces_y, plot_coordinate_center_srs, plot_coordinate_center_x, plot_coordinate_center_y, plot_repere_accessibilite, plot_date_start_year, plot_date_start_month, plot_date_start_day, plot_time_start_hour, plot_time_start_minute, strate_terrain_essence, strate_terrain_hauteur, strate_terrain_densite, strate_terrain_regime, strate_terrain_composition, plot_stratum, strate_2_essence_2, strate_2_hauteur_2, strate_2_densite_2, strate_2_regime_2, strate_3_essence_3, strate_3_hauteur_3, strate_3_densite_3, strate_3_regime_3, plot_stratum_d, plot_stratum_interpretation, donnees_topographiques_plot_elevation, donnees_topographiques_plot_topo_position, donnees_topographiques_plot_topo_exposition, donnees_topographiques_plot_pente, donnees_topographiques_plot_signe_erosion, donnees_topographiques_plot_type_erosion, donnees_topographiques_plot_degre_erosion, description_pedologique_substrat, description_pedologique_substrat_qualifier, description_pedologique_type_sol, description_pedologique_humus, description_pedologique_profondeur_du_sol, description_pedologique_texture, description_pedologique_p_affleurement_rocheux, description_pedologique_p_cailloux, description_pedologique_type_de_sol, description_pedologique_type_sol1, description_pedologique_observations_pedol, donnees_complementaires_unite_hydrologique, donnees_complementaires_distance_cp, donnees_complementaires_nids, donnees_complementaires_taniere, donnees_complementaires_excrements, donnees_complementaires_observations_compl, couverture_vegetale_couverture_du_sol, couverture_vegetale_couverture_matorral, couverture_vegetale_presence_de_lisiere, couverture_vegetale_hauteur_moyenne_dominante, couverture_vegetale_hauteur_moyenne_dominante_unit_name, caractristiques_specifiques_plot_structure_verticale, caractristiques_specifiques_origine_peuplement, caractristiques_specifiques_plot_densite_de_plantation, caractristiques_specifiques_plot_etat_de_developpement, caractristiques_specifiques_plot_intensite_de_parcours, caractristiques_specifiques_plot_etat, caractristiques_specifiques_plot_ecimage, caractristiques_specifiques_plot_presence_de_mousse, caractristiques_specifiques_plot_signes_incendies, caractristiques_specifiques_plot_fire, caractristiques_specifiques_fire_year, caractristiques_specifiques_plot_fire_intervent, caractristiques_specifiques_plot_interventions_type, caractristiques_specifiques_plot_intervention, plot_photos_plot_photo_centre_file_name, plot_photos_plot_photo_centre_file_size, plot_photos_plot_photo_north_file_name, plot_photos_plot_photo_north_file_size, plot_photos_plot_photo_east_file_name, plot_photos_plot_photo_east_file_size, plot_photos_plot_photo_south_file_name, plot_photos_plot_photo_south_file_size, plot_photos_plot_photo_west_file_name, plot_photos_plot_photo_west_file_size, plot_photos_plot_photo_landscape_file_name, plot_photos_plot_photo_landscape_file_size, plot_valide, plot_stratum_area_join, country_code, plot_distance_centre, plot_distance_centre_unit_name, plot_azimut_centre, plot_azimut_centre_unit_name, plot_repere_coord_x, plot_repere_coord_y, plot_dranef, plot_dpanef, observations_identif, plot_date_end_year, plot_date_end_month, plot_date_end_day, plot_time_end_hour, plot_time_end_minute, msg_valide)
SELECT plot_no, plot_accessibilite, plot_photo_accessible_file_name, plot_photo_accessible_file_size, plot_accessibility_a_pied, plot_center, plot_coordinate_acces_srs, plot_coordinate_acces_x, plot_coordinate_acces_y, plot_coordinate_center_srs, plot_coordinate_center_x, plot_coordinate_center_y, plot_repere_accessibilite, plot_date_start_year, plot_date_start_month, plot_date_start_day, plot_time_start_hour, plot_time_start_minute, strate_terrain_essence, strate_terrain_hauteur, strate_terrain_densite, strate_terrain_regime, strate_terrain_composition, plot_stratum, strate_2_essence_2, strate_2_hauteur_2, strate_2_densite_2, strate_2_regime_2, strate_3_essence_3, strate_3_hauteur_3, strate_3_densite_3, strate_3_regime_3, plot_stratum_d, plot_stratum_interpretation, donnees_topographiques_plot_elevation, donnees_topographiques_plot_topo_position, donnees_topographiques_plot_topo_exposition, donnees_topographiques_plot_pente, donnees_topographiques_plot_signe_erosion, donnees_topographiques_plot_type_erosion, donnees_topographiques_plot_degre_erosion, description_pedologique_substrat, description_pedologique_substrat_qualifier, description_pedologique_type_sol, description_pedologique_humus, description_pedologique_profondeur_du_sol, description_pedologique_texture, description_pedologique_p_affleurement_rocheux, description_pedologique_p_cailloux, description_pedologique_type_de_sol, description_pedologique_type_sol1, description_pedologique_observations_pedol, donnees_complementaires_unite_hydrologique, donnees_complementaires_distance_cp, donnees_complementaires_nids, donnees_complementaires_taniere, donnees_complementaires_excrements, donnees_complementaires_observations_compl, couverture_vegetale_couverture_du_sol, couverture_vegetale_couverture_matorral, couverture_vegetale_presence_de_lisiere, couverture_vegetale_hauteur_moyenne_dominante, couverture_vegetale_hauteur_moyenne_dominante_unit_name, caractristiques_specifiques_plot_structure_verticale, caractristiques_specifiques_origine_peuplement, caractristiques_specifiques_plot_densite_de_plantation, caractristiques_specifiques_plot_etat_de_developpement, caractristiques_specifiques_plot_intensite_de_parcours, caractristiques_specifiques_plot_etat, caractristiques_specifiques_plot_ecimage, caractristiques_specifiques_plot_presence_de_mousse, caractristiques_specifiques_plot_signes_incendies, caractristiques_specifiques_plot_fire, caractristiques_specifiques_fire_year, caractristiques_specifiques_plot_fire_intervent, caractristiques_specifiques_plot_interventions_type, caractristiques_specifiques_plot_intervention, plot_photos_plot_photo_centre_file_name, plot_photos_plot_photo_centre_file_size, plot_photos_plot_photo_north_file_name, plot_photos_plot_photo_north_file_size, plot_photos_plot_photo_east_file_name, plot_photos_plot_photo_east_file_size, plot_photos_plot_photo_south_file_name, plot_photos_plot_photo_south_file_size, plot_photos_plot_photo_west_file_name, plot_photos_plot_photo_west_file_size, plot_photos_plot_photo_landscape_file_name, plot_photos_plot_photo_landscape_file_size, plot_valide, plot_stratum_area_join, country_code, plot_distance_centre, plot_distance_centre_unit_name, plot_azimut_centre, plot_azimut_centre_unit_name, plot_repere_coord_x, plot_repere_coord_y, plot_dranef, plot_dpanef, observations_identif, plot_date_end_year, plot_date_end_month, plot_date_end_day, plot_time_end_hour, plot_time_end_minute, msg_valide FROM plot_staging
ON CONFLICT (plot_no) DO NOTHING;

-- Step 4: Populate date_created and date_modified from dates CSV
UPDATE plot SET
  date_created = v.date_created::TIMESTAMP,
  date_modified = v.date_modified::TIMESTAMP
FROM (VALUES
  ('200620533883', '2026-02-25 10:05:09.126', '2026-02-25 00:49:55.313')
  ('200667634131', '2026-02-16 10:40:29.147', '2026-02-16 15:09:20.327')
  ('200648634298C', '2026-02-15 22:24:43.811', '2026-02-16 19:54:11.611')
  ('200610333624', '2026-02-17 11:10:12.699', '2026-02-17 15:05:40.719')
  ('200648333902', '2026-02-27 13:27:39.06', '2026-02-27 15:07:45.572')
  ('800648133920', '2026-02-27 11:39:30.598', '2026-02-27 13:03:15.111')
  ('200633733856', '2026-02-12 10:09:06.033', '2026-02-12 22:14:18.766')
  ('200633533874', '2026-02-16 09:01:06.985', '2026-02-16 00:05:15.669')
  ('400635633875', '2026-02-17 10:06:28.284', '2026-02-17 13:54:57.556')
  ('200611733481', '2026-02-18 10:20:21.31', '2026-02-18 15:38:38.294')
  ('200668634024', '2026-02-20 10:00:30.14', '2026-02-25 12:53:48.761')
  ('200670834025', '2026-02-18 10:36:26.413', '2026-02-18 14:35:58.816')
  ('400668534042', '2026-02-23 11:26:58.191', '2026-02-23 14:41:17.352')
  ('200646534296', '2026-02-24 14:37:53.134', '2026-02-24 17:35:48.513')
  ('200648634298', '2026-02-16 10:33:28.615', '2026-02-23 22:27:00.215')
  ('800644534277', '2026-02-24 00:20:31.252', '2026-02-24 15:50:21.822')
  ('200644334295', '2026-02-24 10:17:50.286', '2026-02-24 11:33:38.915')
  ('800626634336', '2026-02-24 00:17:31.285', '2026-02-24 14:09:43.296')
  ('200624434334', '2026-02-25 11:50:43.944', '2026-02-25 13:24:55.421')
  ('400617634365', '2026-02-25 14:16:27.941', '2026-02-25 15:08:27.797')
  ('400623034261', '2026-02-26 00:13:12.246', '2026-02-26 00:50:41.479')
  ('200625334245', '2026-02-26 13:42:23.307', '2026-02-26 15:49:06.925')
  ('200641733916', '2026-02-27 08:57:37.614', '2026-02-27 11:09:32.922')
  ('200620733865', '2026-02-23 10:37:06.293', '2026-02-23 13:14:44.328')
  ('200624833886', '2026-02-25 13:47:36.656', '2026-02-25 14:36:47.417')
  ('800609833462', '2026-02-24 11:17:49.947', '2026-02-25 13:58:06.141')
  ('200607833442', '2026-02-25 10:41:03.981', '2026-02-25 14:33:36.391')
  ('200610033444', '2026-02-24 13:48:22.676', '2026-02-26 21:20:51.171')
  ('400610233426', '2026-02-25 00:58:55.45', '2026-02-25 13:47:46.112')
  ('800610533391', '2026-02-26 10:08:53.064', '2026-02-26 11:27:51.906')
  ('200610333408', '2026-02-26 00:36:52.201', '2026-02-26 14:53:58.086')
  ('200666034076', '2026-02-26 13:43:08.282', '2026-03-02 15:59:32.69')
  ('400664234039', '2026-03-02 10:14:27.988', '2026-03-02 16:03:29.517')
  ('200666134058', '2026-02-26 11:23:58.856', '2026-02-26 00:59:12.7')
  ('400647733956', '2026-03-02 09:22:31.507', '2026-03-02 11:13:36.294')
  ('200647633974', '2026-03-02 11:29:56.912', '2026-03-02 13:26:20.222')
  ('200624133526', '2026-03-02 09:44:33.363', '2026-03-02 17:26:03.415')
  ('200623833562', '2026-02-18 10:31:43.066', '2026-02-18 00:52:27.879')
  ('200616033484', '2026-03-02 11:52:40.267', '2026-03-02 17:47:58.388')
  ('200654033762', '2026-02-26 09:35:57.163', '2026-02-26 17:12:12.16')
  ('400646033703', '2026-02-24 10:24:15.143', '2026-02-24 00:05:46.266')
  ('200645133577', '2026-02-20 10:24:28.515', '2026-02-20 11:39:33.697')
  ('200647933722', '2026-02-23 10:35:11.817', '2026-02-23 15:55:44.088')
  ('800641033771', '2026-03-03 11:34:51.438', '2026-03-03 11:50:08.654')
  ('400625033652', '2026-02-25 08:33:21.837', '2026-02-25 09:17:21.318')
  ('400653833780', '2026-02-27 09:08:28.616', '2026-03-01 08:54:24.837')
  ('200613933483', '2026-02-19 10:46:35.371', '2026-02-19 00:57:10.305')
  ('400651733994', '2026-03-02 14:21:29.342', '2026-03-03 12:54:45.614')
  ('200664034057', '2026-03-02 13:48:49.979', '2026-03-02 15:29:50.099')
  ('200651534012', '2026-03-03 13:25:26.289', '2026-03-03 13:30:01.619')
  ('800655234069', '2026-03-04 10:05:26.391', '2026-03-04 13:06:29.974')
  ('200612134272', '2026-03-04 00:13:39.317', '2026-03-04 00:54:03.613')
  ('200614234273', '2026-03-04 13:26:53.939', '2026-03-04 13:47:26.567')
  ('200667934095', '2026-03-05 10:18:37.621', '2026-03-05 11:35:16.282')
) AS v(plot_no, date_created, date_modified)
WHERE plot.plot_no = v.plot_no;

-- Step 5: Verify
SELECT COUNT(*) AS total_rows FROM plot;
SELECT plot_no, date_created, date_modified FROM plot ORDER BY plot_no;
