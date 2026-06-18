package com.ifn.service;

import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
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

    private static String keyCol(String table) {
        return "plot".equals(table) ? "plot_no" : "plot_plot_no";
    }

    /**
     * Imports all recognised CSVs from a ZIP — single transaction.
     *
     * Per table:
     *   1. Collect key values (plot_no / plot_plot_no) from the CSV.
     *   2. Count how many of those keys already exist in the DB (→ "updated").
     *   3. DELETE rows for those keys.
     *   4. INSERT all CSV rows (existing ones re-inserted, new ones added for the first time).
     *
     * Returns { "plot": { "inserted": N, "updated": M }, "tree": K, … }
     * On any failure the whole transaction rolls back — no data is lost.
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> importZip(MultipartFile zipFile) throws IOException {
        Map<String, Object> result = new LinkedHashMap<>();

        // Read all recognised CSVs from the ZIP into memory
        Map<String, byte[]> csvFiles = new LinkedHashMap<>();
        try (ZipInputStream zis = new ZipInputStream(zipFile.getInputStream())) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().endsWith(".csv")) {
                    String name = entry.getName();
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

        // plot first so detail tables can reference it
        List<String> importOrder = new ArrayList<>();
        if (csvFiles.containsKey("plot")) importOrder.add("plot");
        for (String t : csvFiles.keySet()) {
            if (!t.equals("plot")) importOrder.add(t);
        }

        for (String table : importOrder) {
            int[] counts = importTableCsv(table, csvFiles.get(table));
            if ("plot".equals(table)) {
                // Return inserted/updated breakdown for plots
                Map<String, Integer> plotStats = new LinkedHashMap<>();
                plotStats.put("inserted", counts[0]);
                plotStats.put("updated",  counts[1]);
                result.put("plot", plotStats);
            } else {
                result.put(table, counts[0]); // total rows for detail tables
            }
        }

        return result;
    }

    // ── Per-table import — returns int[]{inserted, updated} ──────────────────

    private int[] importTableCsv(String table, byte[] csvBytes) throws IOException {
        // Discover DB columns + types (skip auto-generated id)
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

        // Parse CSV fully before touching the DB
        List<String> headers;
        List<Object[]> rows = new ArrayList<>();

        try (CSVParser parser = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .setIgnoreEmptyLines(true)
                .build()
                .parse(new InputStreamReader(new ByteArrayInputStream(csvBytes), StandardCharsets.UTF_8))) {

            headers = parser.getHeaderNames().stream()
                .map(String::toLowerCase)
                .filter(colTypes::containsKey)
                .distinct()
                .toList();

            if (headers.isEmpty()) return new int[]{0, 0};

            for (CSVRecord rec : parser) {
                Object[] row = new Object[headers.size()];
                for (int i = 0; i < headers.size(); i++) {
                    String col = headers.get(i);
                    row[i] = convert(rec.isMapped(col) ? rec.get(col) : null, colTypes.get(col));
                }
                rows.add(row);
            }
        }

        if (rows.isEmpty()) return new int[]{0, 0};

        // Collect unique key values from the CSV
        String keyCol = keyCol(table);
        int keyIdx = headers.indexOf(keyCol);
        Set<String> keys = new LinkedHashSet<>();
        if (keyIdx >= 0) {
            for (Object[] row : rows) {
                if (row[keyIdx] != null) keys.add(row[keyIdx].toString());
            }
        }

        // Count how many of those keys already exist in the DB
        int existingCount = 0;
        if (!keys.isEmpty()) {
            String inClause = keys.stream().map(k -> "?").collect(Collectors.joining(","));
            Integer cnt = jdbc.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE " + keyCol + " IN (" + inClause + ")",
                Integer.class,
                keys.toArray()
            );
            existingCount = cnt != null ? cnt : 0;
        }

        // Step 1 — delete existing rows for those keys
        if (!keys.isEmpty()) {
            String inClause = keys.stream().map(k -> "?").collect(Collectors.joining(","));
            jdbc.update(
                "DELETE FROM " + table + " WHERE " + keyCol + " IN (" + inClause + ")",
                keys.toArray()
            );
        }

        // Step 2 — insert all rows (re-inserts updated ones + adds new ones)
        String colsSql = String.join(",", headers);
        String placeholders = String.join(",", Collections.nCopies(headers.size(), "?"));
        jdbc.batchUpdate(
            "INSERT INTO " + table + " (" + colsSql + ") VALUES (" + placeholders + ")",
            rows
        );

        int total   = rows.size();
        int updated = existingCount;
        int inserted = total - updated;
        return new int[]{inserted, updated};
    }

    // ── Type coercion ─────────────────────────────────────────────────────────

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
