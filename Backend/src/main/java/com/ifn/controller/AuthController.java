package com.ifn.controller;

import com.ifn.entity.AppUser;
import com.ifn.security.JwtUtil;
import com.ifn.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Authentication endpoints.
 *
 * Login is now backed by the {@code app_user} table (see {@link UserService}).
 * The historical hard-coded accounts are seeded into that table by
 * {@code UserDataInitializer}, so existing dashboard logins keep working.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final UserService userService;

    public AuthController(JwtUtil jwtUtil, UserService userService) {
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    record LoginRequest(String username, String password) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        Optional<AppUser> user = userService.authenticate(req.username(), req.password());
        if (user.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects"));
        }
        AppUser u = user.get();
        String token = jwtUtil.generate(u.getUsername(), u.getRole(), u.getTeam());

        Map<String, Object> body = new HashMap<>();
        body.put("token", token);
        body.put("username", u.getUsername());
        body.put("fullName", u.getFullName());
        body.put("role", u.getRole());
        body.put("team", u.getTeam());
        return ResponseEntity.ok(body);
    }

    /** Returns the currently authenticated user's profile (from the JWT + DB). */
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Non authentifié"));
        }
        return userService.findByUsername(authentication.getName())
                .<ResponseEntity<?>>map(u -> {
                    Map<String, Object> body = new HashMap<>();
                    body.put("username", u.getUsername());
                    body.put("fullName", u.getFullName());
                    body.put("role", u.getRole());
                    body.put("team", u.getTeam());
                    return ResponseEntity.ok(body);
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "Utilisateur introuvable")));
    }
}
