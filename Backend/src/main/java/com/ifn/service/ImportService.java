package com.ifn.service;

import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class ImportService {

    private final JdbcTemplate jdbc;

    private static final Set<String> KNOWN_TABLES = Set.of(
        "plot", "tree", "plot_reference_object", "structure_vert",
        "etat_sylv", "stand_health", "regeneration",
        "plot_veget_arbre", "plot_veget_arbuste", "plot_veget_herbe"
    );

    public Map<String, Object> importZip(MultipartFile zipFile) throws IOException {
        Map<String, Object> result = new LinkedHashMap<>();

        // Read all relevant CSV entries from the ZIP into memory
        Map<String, byte[]> csvFiles = new LinkedHashMap<>();
        try (ZipInputStream zis = new ZipInputStream(zipFile.getInputStream())) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().endsWith(".csv")) {
                    String name = entry.getName();
                    // Strip any directory prefix (e.g. "export/tree.csv" → "tree.csv")
                    if (name.contains("/")) name = name.substring(name.lastIndexOf('/') + 1);
                    String tableName = name.substring(0, name.length() - 4).toLowerCase();
                    if (KNOWN_TABLES.contains(tableName)) {
                        csvFiles.put(tableName, zis.readAllBytes());
                    }
                }
            }
        }

        if (csvFiles.isEmpty()) {
            result.put("error", "Aucun fichier CSV reconnu dans le ZIP");
            return result;
        }

        // Import each CSV — plot first (so FKs in other tables resolve), then the rest
        List<String> importOrder = new ArrayList<>();
        if (csvFiles.containsKey("plot")) importOrder.add("plot");
        for (String t : csvFiles.keySet()) {
            if (!t.equals("plot")) importOrder.add(t);
        }

        for (String table : importOrder) {
            try {
                int rows = importTableCsv(table, csvFiles.get(table));
                result.put(table, rows);
            } catch (Exception e) {
                result.put(table + "_error", e.getMessage());
            }
        }

        return result;
    }

    private int importTableCsv(String table, byte[] csvBytes) throws IOException {
        // Get DB column names and types from information_schema (skip auto-generated id)
        Map<String, String> colTypes = new LinkedHashMap<>();
        jdbc.query(
            "SELECT column_name, data_type FROM information_schema.columns " +
            "WHERE table_name = ? AND table_schema = 'public' AND column_name <> 'id' " +
            "ORDER BY ordinal_position",
            (RowCallbackHandler) rs -> colTypes.put(rs.getString("column_name"), rs.getString("data_type")),
            table
        );
        if (colTypes.isEmpty()) {
            throw new IllegalStateException("Table '" + table + "' introuvable dans la base de données");
        }

        try (CSVParser parser = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .setIgnoreEmptyLines(true)
                .build()
                .parse(new InputStreamReader(
                        new ByteArrayInputStream(csvBytes), StandardCharsets.UTF_8))) {

            // Only keep CSV columns that exist as DB columns
            List<String> headers = parser.getHeaderNames().stream()
                .map(String::toLowerCase)
                .filter(colTypes::containsKey)
                .distinct()
                .toList();

            if (headers.isEmpty()) return 0;

            String colsSql = String.join(",", headers);
            String placeholders = String.join(",", Collections.nCopies(headers.size(), "?"));
            String insertSql = "INSERT INTO " + table + " (" + colsSql + ") VALUES (" + placeholders + ")";

            // Truncate existing data
            jdbc.update("TRUNCATE TABLE " + table);

            // Collect and batch-insert rows
            List<Object[]> batch = new ArrayList<>();
            for (CSVRecord rec : parser) {
                Object[] row = new Object[headers.size()];
                for (int i = 0; i < headers.size(); i++) {
                    String col = headers.get(i);
                    String raw = rec.isMapped(col) ? rec.get(col) : null;
                    row[i] = convert(raw, colTypes.get(col));
                }
                batch.add(row);
            }

            if (!batch.isEmpty()) {
                jdbc.batchUpdate(insertSql, batch);
            }
            return batch.size();
        }
    }

    private Object convert(String val, String pgType) {
        if (val == null || val.isBlank()) return null;
        return switch (pgType) {
            case "boolean" ->
                val.equalsIgnoreCase("true") || val.equals("1")
                || val.equalsIgnoreCase("yes") || val.equalsIgnoreCase("oui");
            case "integer" -> {
                try { yield Integer.parseInt(val.trim()); }
                catch (NumberFormatException e1) {
                    try { yield (int) Double.parseDouble(val.trim()); }
                    catch (NumberFormatException e2) { yield null; }
                }
            }
            case "double precision" -> {
                try { yield Double.parseDouble(val.trim()); }
                catch (NumberFormatException e) { yield null; }
            }
            default -> val;
        };
    }
}
