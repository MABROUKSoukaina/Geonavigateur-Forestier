package com.ifn.controller;

import com.ifn.entity.AppUser;
import com.ifn.entity.IfnProgramme;
import com.ifn.service.IfnProgrammeService;
import com.ifn.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Convenience endpoints scoped to the authenticated user.
 *
 * For a FIELD user these return only the placettes assigned to their team
 * ({@code equipe}). For ADMIN/SUPERVISOR/VIEWER (no team) they return the full
 * programme so supervisors can see everything.
 */
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final UserService userService;
    private final IfnProgrammeService programmeService;

    public MeController(UserService userService, IfnProgrammeService programmeService) {
        this.userService = userService;
        this.programmeService = programmeService;
    }

    private List<IfnProgramme> assignedFor(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return List.of();
        }
        AppUser user = userService.findByUsername(auth.getName()).orElse(null);
        if (user == null) {
            return List.of();
        }
        String team = user.getTeam();
        if (team == null || team.isBlank()) {
            // Supervisors / admins see the whole programme.
            return programmeService.findAll();
        }
        return programmeService.findByEquipe(team);
    }

    /** Placettes assigned to the current user's team. */
    @GetMapping("/placettes")
    public ResponseEntity<?> myPlacettes(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Non authentifié"));
        }
        return ResponseEntity.ok(assignedFor(auth));
    }

    /** Same as above as a GeoJSON FeatureCollection (for the collector map). */
    @GetMapping("/placettes/geojson")
    public ResponseEntity<?> myPlacettesGeoJson(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Non authentifié"));
        }
        return ResponseEntity.ok(programmeService.toGeoJson(assignedFor(auth)));
    }
}
