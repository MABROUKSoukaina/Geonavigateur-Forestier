package com.ifn.controller;

import com.ifn.service.ImportService;
import com.ifn.service.RefreshNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;
    private final RefreshNotifier refreshNotifier;

    /**
     * POST /api/import/zip
     * Accepts a ZIP file containing IFN CSV exports.
     * Truncates and re-imports all recognised tables (plot, tree, plot_reference_object, …).
     * Returns a map of { tableName: rowCount } for each imported table.
     */
    @PostMapping(value = "/zip", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> importZip(
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Fichier vide"));
        }
        try {
            Map<String, Object> result = importService.importZip(file);
            refreshNotifier.notifyRefresh();
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
