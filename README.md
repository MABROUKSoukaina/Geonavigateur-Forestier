# GéoNavigateur Forestier

A web-based GIS application for forestry inventory navigation. Built with **React + TypeScript + Vite**, using **Leaflet / react-leaflet** for mapping and **Zustand** for state management.

---

## Table of Contents

1. [Overview](#overview)
2. [Layout](#layout)
3. [Map Features](#map-features)
4. [Placettes Panel](#placettes-panel)
5. [Navigation Panel](#navigation-panel)
6. [Data Import Panel](#data-import-panel)
7. [Layers Panel](#layers-panel)
8. [Offline Routing](#offline-routing)

---

## Overview

GéoNavigateur Forestier allows forestry teams to:
- Visualize and manage **forest plot (placette)** locations on an interactive map
- Navigate between plots using **car, walking, bicycle, or straight-line** routing
- Import plot data from **Excel (.xlsx) or CSV** files
- Measure distances directly on the map
- Work fully **offline** with a preloaded road graph

---

## Layout

The interface is divided into two main areas:

### Sidebar (left panel)
A collapsible panel (380 px wide on desktop) containing four tabs:
- **Navigation** — route planning
- **Placettes** — plot list and management
- **Données** — data import
- **Couches** — layer management

Click the **hamburger button** (☰) to open/close the panel. When closed, the map expands to full width with a smooth animated transition.

### Map (right area)
Fills the remaining screen space. On **mobile (≤ 768 px)**, the sidebar becomes a bottom sheet that slides up from the bottom of the screen.

---

## Map Features

### Basemap Switcher
Located in the **top-right corner**. Supports:
| Option | Description |
|---|---|
| Google Hybrid | Satellite + road labels |
| Google Satellite | Pure satellite imagery |
| CartoDB Dark | Dark vector map |
| OpenStreetMap | Standard OSM tiles |
| Topographie | Topographic map |

### North Arrow
Fixed compass widget above the basemap button, always pointing north.

### Map Legend
Toggle button above the basemap switcher. Opens a panel listing all map layers with eye icons to show/hide:
- **Placettes** — forest plot markers (green circles)
- **Repères** — reference point markers (yellow flag on black stake)
- **Position GPS** — live GPS dot (blue pulsing circle)
- **Itinéraire** — calculated route (cyan line)
- **Dernier km** — last-mile dashed lines to off-road plots
- **Custom GeoJSON layers** (from the Couches tab)

### Map Controls (bottom right)
- **GPS** — centers the map on your current GPS position
- **Zoom +** — zoom in
- **Zoom −** — zoom out

### Distance Measurement Tool (bottom left)
Click the **ruler button** to activate measurement mode:
- Click anywhere on the map to add measurement points
- A dashed line connects the points
- Each segment shows its distance at the midpoint
- The orange banner at the top shows the total distance
- Click **Effacer** to reset points, or **✕** to exit measurement mode

### Coordinate Display
When moving the mouse over the map, **Lat / Lng coordinates** (6 decimal places) appear centered at the bottom of the map with a transparent background. Works in both online and offline mode.

### Click Mode Banner
When setting a navigation start/end point by clicking on the map, a banner at the top center indicates the active mode. Click **✕** to cancel.

---

## Placettes Panel

Displays all loaded forest plots in a scrollable list.

### Stats Bar
Shows total number of **Placettes**, **Repères**, and currently **Sélectionnées** (selected plots).

### Layer Toggles
Quick on/off switches for the **Placettes** and **Repères** map layers.

### Search
Filter plots by **code** or **strate** (forest stratum) in real time. A result count is shown below the search box.

### Plot List
Each item displays:
- **Code** — plot identifier
- **Coordinates** — `lat, lng • alt: Xm • dist. rep: Xm`
  - `alt` = altitude in metres (if available)
  - `dist. rep` = distance from plot to its reference point / repère (if available)
- **Strate** badge — forest stratum type (if available)

Clicking an item **selects/deselects** it and centers the map on that plot (zoom 17).

### Selection Actions (appear when ≥ 1 plot is selected)
| Button | Action |
|---|---|
| 📍 **Voir tout** | Center map on all filtered plots |
| **Effacer sélection** | Deselect all |
| **Garder les sélectionnées (N)** | Remove all unselected plots from the dataset, keeping only the N selected ones |

---

## Navigation Panel

### Simple Navigation (tab: Simple)
Point-to-point routing from A to B.

**Start / End point** can be set by:
- Typing a plot **code** in the autocomplete field
- Selecting **Ma position GPS**
- Clicking **Sur la carte** then clicking anywhere on the map
- Clicking **Naviguer** in a plot's popup

**Transport modes:**
| Mode | Speed |
|---|---|
| Voiture (car) | 40 km/h |
| À pied (walking) | 4 km/h |
| Vélo (bicycle) | 12 km/h |
| Vol d'oiseau (straight line) | — |

After calculating, the route is displayed as a **cyan line** on the map. Off-road sections (last mile to plot) are shown as **grey dashed lines**.

The result card shows **distance** and **estimated duration**.

### Multi-point Navigation (tab: Multi)
Optimized route visiting multiple plots in one trip.

- Add plots by clicking **Ajouter au parcours** in a popup, or via the map click mode
- The app finds the **optimal visit order** using nearest-neighbour algorithm
- Start from **GPS position** or the **first plot** in the list
- Each plot is numbered on the map in visit order
- Shows total distance and duration

---

## Data Import Panel

Import forest plot data from external files.

### Supported Formats
- **Excel** (`.xlsx`, `.xls`) — standard float coordinates
- **CSV** — supports French format: semicolon (`;`) delimiter with comma (`,`) decimal separator

### Column Auto-detection
The importer automatically detects column names (case-insensitive):

| Field | Accepted column names |
|---|---|
| Plot code | `code`, `id`, `placette`, `num`, `numero`, `plot_id` |
| X / Longitude | `x`, `lon`, `longitude`, `lng`, `x_placette` |
| Y / Latitude | `y`, `lat`, `latitude`, `y_placette` |
| Repère X | `xrepere`, `x_rep`, `x_repere`, `lon_rep` |
| Repère Y | `yrepere`, `y_rep`, `y_repere`, `lat_rep` |
| Altitude | `altitude`, `alt`, `elev`, `elevation`, `z` |
| Pente | `pente`, `slope`, `inclinaison` |
| Azimut | `azimut`, `bearing`, `az`, `orientation` |
| Distance repère | `distance_point`, `distance_repere`, `dist_rep`, `distance`, `dist`, `dist_m` |
| Exposition | `exposition`, `expo`, `aspect` |
| Strate | `strate_carto`, `strate`, `stratum` |

### Coordinate Auto-scaling
If coordinates are stored as integers (e.g. `3349485594` instead of `33.49485594`), the importer automatically rescales them to valid WGS84 values independently for latitude and longitude.

### Manual Column Mapping
If auto-detection fails, a **mapping form** appears allowing you to manually assign CSV columns to the required fields.

### After Import
- All previous navigation routes are cleared
- The map automatically centers and fits to the imported plots
- A success message shows the number of imported plots and a sample coordinate

### Restore Defaults
The **Restaurer les données par défaut** button reloads the built-in sample dataset.

---

## Layers Panel

Manage custom **GeoJSON** layers on top of the base map.

- **Import GeoJSON** — load a `.geojson` or `.json` file
- Each layer has a **name**, **color picker**, and **eye toggle** for visibility
- Active layers are also listed in the **Map Legend**
- Layers can be **deleted** individually

---

## Offline Routing

The application supports fully offline routing when road graph data is available.

### Setup
Place two files in the `/public/` directory:
- `road_graph.js` — exports `window.ROAD_GRAPH` (adjacency graph)
- `roads_geojson.js` — exports `window.ROADS_GEOJSON` (road network geometry)

When loaded, the app uses **Dijkstra's algorithm** on the local road graph instead of calling an external API.

### Routing Mode Toggle
Switch between **Offline** and **Online** (OSRM API) in the Navigation panel settings.

---

## Tech Stack

| Technology | Role |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Leaflet / react-leaflet | Interactive map |
| Zustand | State management |
| XLSX.js | Excel / CSV parsing |

---

## Project Structure

```
src/
├── components/
│   ├── layout/       # Sidebar, tab navigation
│   ├── map/          # MapView, icons, legend, basemap switcher
│   └── panels/       # NavigationPanel, PlacettesPanel, DataPanel, LayersPanel
├── services/
│   ├── excelParser.ts    # CSV / Excel import logic
│   ├── offlineRouter.ts  # Dijkstra offline routing
│   ├── onlineRouter.ts   # OSRM online routing
│   └── defaultData.ts    # Built-in sample placettes
├── stores/
│   ├── useAppStore.ts        # UI state (tabs, toggles, sidebar)
│   ├── useDataStore.ts       # Placettes data and selection
│   ├── useMapStore.ts        # Map viewport, basemap, layers
│   └── useNavigationStore.ts # Navigation state and routes
└── types/
    └── index.ts   # TypeScript interfaces and constants
```
