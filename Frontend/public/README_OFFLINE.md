# Fichiers pour le routage offline

Placez ces 2 fichiers dans ce dossier (`public/`) :

1. **road_graph.js** (~931 KB) — Graphe du réseau routier
   - Exporte `window.ROAD_GRAPH` avec les nœuds et arêtes

2. **roads_geojson.js** (~2.5 MB) — Géométries détaillées des routes
   - Exporte `window.ROADS_GEOJSON` au format GeoJSON

Ces fichiers proviennent de votre application HTML originale (GeoNav Pro).

Sans ces fichiers, l'application fonctionne quand même :
- En mode **Online** : OSRM calcule les vrais itinéraires
- En mode **Offline** sans graphe : estimation par vol d'oiseau × 1.4
