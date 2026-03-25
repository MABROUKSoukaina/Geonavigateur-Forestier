package com.ifn.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Catch-all controller for SPA (React Router) support.
 * Any request that is NOT under /api/** and is NOT a static asset
 * gets forwarded to index.html so React Router can handle the route.
 */
@Controller
public class SpaController {

    @RequestMapping(value = {
        "/dashboard",
        "/dashboard/**"
    })
    public String spa() {
        return "forward:/index.html";
    }
}
