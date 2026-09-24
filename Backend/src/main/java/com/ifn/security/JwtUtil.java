package com.ifn.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.expiration-ms}") long expirationMs
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generate(String username) {
        return Jwts.builder()
            .subject(username)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(key)
            .compact();
    }

    /** Generate a token carrying role/team claims for the survey collector. */
    public String generate(String username, String role, String team) {
        return Jwts.builder()
            .subject(username)
            .claim("role", role)
            .claim("team", team)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(key)
            .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(token).getPayload().getSubject();
    }

    /** Role claim, or null for legacy tokens that don't carry one. */
    public String extractRole(String token) {
        Object role = Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(token).getPayload().get("role");
        return role == null ? null : role.toString();
    }

    /** Team claim, or null. */
    public String extractTeam(String token) {
        Object team = Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(token).getPayload().get("team");
        return team == null ? null : team.toString();
    }

    public boolean isValid(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
