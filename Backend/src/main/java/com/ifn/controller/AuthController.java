package com.ifn.controller;

import com.ifn.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final Map<String, String> users;

    public AuthController(
        JwtUtil jwtUtil,
        @Value("${app.users.admin.password}") String adminPwd,
        @Value("${app.users.directeur.password}") String directeurPwd,
        @Value("${app.users.chef_dept.password}") String chefPwd,
        @Value("${app.users.visiteur.password}") String visiteurPwd
    ) {
        this.jwtUtil = jwtUtil;
        this.users = Map.of(
            "admin", adminPwd,
            "directeur", directeurPwd,
            "chef_dept", chefPwd,
            "visiteur", visiteurPwd
        );
    }

    record LoginRequest(String username, String password) {}
    record LoginResponse(String token, String username) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String expected = users.get(req.username());
        if (expected == null || !expected.equals(req.password())) {
            return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects"));
        }
        return ResponseEntity.ok(new LoginResponse(jwtUtil.generate(req.username()), req.username()));
    }
}
