package com.ifn.config;

import com.ifn.entity.AppUser;
import com.ifn.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Bootstraps the NEW {@code app_user} table and seeds default accounts.
 *
 * - Uses CREATE TABLE IF NOT EXISTS, so it never alters or drops any existing
 *   IFN_2026 table used by the dashboard.
 * - Seeds the 4 historical dashboard accounts (admin / directeur / chef_dept /
 *   visiteur) with their original passwords so existing logins keep working, plus
 *   one example field team account.
 * - Idempotent: only inserts a user when its username is absent.
 */
@Component
public class UserDataInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbc;
    private final AppUserRepository users;
    private final PasswordEncoder encoder;

    private final String adminPwd;
    private final String directeurPwd;
    private final String chefPwd;
    private final String visiteurPwd;
    private final String fieldPwd;

    public UserDataInitializer(
            JdbcTemplate jdbc,
            AppUserRepository users,
            PasswordEncoder encoder,
            @Value("${app.users.admin.password:Admin@IFN26}") String adminPwd,
            @Value("${app.users.directeur.password:Direct@IFN26}") String directeurPwd,
            @Value("${app.users.chef_dept.password:Chef@IFN26}") String chefPwd,
            @Value("${app.users.visiteur.password:Visit@IFN26}") String visiteurPwd,
            @Value("${app.users.field.password:Field@IFN26}") String fieldPwd) {
        this.jdbc = jdbc;
        this.users = users;
        this.encoder = encoder;
        this.adminPwd = adminPwd;
        this.directeurPwd = directeurPwd;
        this.chefPwd = chefPwd;
        this.visiteurPwd = visiteurPwd;
        this.fieldPwd = fieldPwd;
    }

    @Override
    public void run(String... args) {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS app_user (
                id            BIGSERIAL    PRIMARY KEY,
                username      VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(200) NOT NULL,
                full_name     VARCHAR(200),
                role          VARCHAR(30)  NOT NULL DEFAULT 'FIELD',
                team          VARCHAR(150),
                enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
                created_at    TIMESTAMP    NOT NULL DEFAULT now()
            )
            """);

        seed("admin",     adminPwd,     "Administrateur",        "ADMIN",      null);
        seed("directeur", directeurPwd, "Directeur DRANEF",      "SUPERVISOR", null);
        seed("chef_dept", chefPwd,      "Chef de département",   "SUPERVISOR", null);
        seed("visiteur",  visiteurPwd,  "Visiteur",              "VIEWER",     null);
        // Example field team account — links to a real ifn_programme.equipe value.
        seed("equipe_kenitra", fieldPwd, "Équipe Kénitra", "FIELD",
                "Equipe Kénitra (N°01/26)");
    }

    private void seed(String username, String rawPwd, String fullName, String role, String team) {
        if (users.existsByUsername(username)) {
            return;
        }
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setPasswordHash(encoder.encode(rawPwd));
        u.setFullName(fullName);
        u.setRole(role);
        u.setTeam(team);
        u.setEnabled(true);
        users.save(u);
    }
}
