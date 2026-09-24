package com.ifn.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Application user for authentication / authorisation.
 *
 * NOTE: this is a NEW table (app_user) introduced for the survey collector app.
 * It does not touch any of the existing IFN_2026 tables used by the dashboard.
 *
 * Roles:
 *   ADMIN      - full access, manages users
 *   SUPERVISOR - validates plots, sees all teams (directeur / chef de département)
 *   FIELD      - field team, collects data, scoped to its {@code team} (equipe)
 *   VIEWER     - read-only (visiteur)
 */
@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", length = 100, nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", length = 200, nullable = false)
    private String passwordHash;

    @Column(name = "full_name", length = 200)
    private String fullName;

    /** ADMIN | SUPERVISOR | FIELD | VIEWER */
    @Column(name = "role", length = 30, nullable = false)
    private String role = "FIELD";

    /** equipe value from ifn_programme (e.g. "Equipe Kénitra-Maâmora (N°02_26)"). Null for non-field roles. */
    @Column(name = "team", length = 150)
    private String team;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
