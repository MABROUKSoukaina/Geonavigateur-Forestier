package com.ifn.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Holds shared security beans for the new user-management feature.
 * Kept separate from SecurityConfig so the existing filter-chain config stays untouched.
 * Enables @PreAuthorize used by UserController.
 */
@Configuration
@EnableMethodSecurity
public class AppSecurityBeans {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
