-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: set date_created and date_modified on plot from collect_ifn.collect.ofc_record
--
-- On every INSERT or UPDATE of the plot table, this trigger fetches both
-- date_created and date_modified from the collect_ifn database (collect.ofc_record)
-- via dblink, matching on key1 (= plot_no). Picks the most recent record.
-- Falls back to NOW() if the row is not found or if the remote DB is unreachable.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Enable dblink
CREATE EXTENSION IF NOT EXISTS dblink;

-- Step 2: Trigger function
CREATE OR REPLACE FUNCTION public.set_plot_date_modified()
RETURNS TRIGGER AS $$
DECLARE
  v_date_created  TIMESTAMP WITHOUT TIME ZONE;
  v_date_modified TIMESTAMP WITHOUT TIME ZONE;
BEGIN
  BEGIN
    SELECT t.date_created, t.date_modified
      INTO v_date_created, v_date_modified
    FROM dblink(
      'host=localhost port=5432 dbname=collect_ifn user=postgres password=postgres',
      format(
        'SELECT date_created, date_modified FROM collect.ofc_record WHERE key1 = %L ORDER BY date_modified DESC LIMIT 1',
        NEW.plot_no
      )
    ) AS t(date_created TIMESTAMP WITHOUT TIME ZONE, date_modified TIMESTAMP WITHOUT TIME ZONE);
  EXCEPTION WHEN OTHERS THEN
    -- Remote DB unreachable or query failed → fall back to NULL
    v_date_created  := NULL;
    v_date_modified := NULL;
  END;

  NEW.date_created  := COALESCE(v_date_created,  NOW());
  NEW.date_modified := COALESCE(v_date_modified, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate trigger (drop first to allow re-running this script safely)
DROP TRIGGER IF EXISTS trg_plot_date_modified ON plot;

CREATE TRIGGER trg_plot_date_modified
BEFORE INSERT OR UPDATE ON plot
FOR EACH ROW
EXECUTE FUNCTION set_plot_date_modified();
