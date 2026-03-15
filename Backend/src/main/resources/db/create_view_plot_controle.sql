-- ─── View: plot_controle ──────────────────────────────────────────────────────
-- Contains only controlled placettes (plot_no ending with 'C').
-- The base placette ID is derived by stripping the trailing 'C'.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW plot_controle AS
SELECT
    p.*,
    -- Base placette ID (without the trailing 'C')
    LEFT(p.plot_no, LENGTH(p.plot_no) - 1) AS plot_no_base
FROM plot p
WHERE p.plot_no LIKE '%C';

-- ─── Verification ─────────────────────────────────────────────────────────────
-- SELECT plot_no, plot_no_base, plot_dranef, plot_dpanef,
--        plot_date_start_year, plot_date_start_month, plot_date_start_day,
--        date_created, date_modified
-- FROM plot_controle
-- ORDER BY plot_no;
