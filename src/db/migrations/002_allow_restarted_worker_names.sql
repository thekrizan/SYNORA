-- Worker IDs identify individual processes. Names are friendly labels and may
-- repeat when a named demo worker is restarted.
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_name_key;
