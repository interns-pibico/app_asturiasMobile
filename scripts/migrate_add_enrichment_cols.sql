-- Añadir columnas de enriquecimiento a las 5 tablas de rutas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['rutas_senderismo','rutas_ciclismo','rutas_sendas_verdes','rutas_carril_bici','rutas_paseos']
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS ascenso_m FLOAT', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS descenso_m FLOAT', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS wikidata_desc TEXT', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ', t);
  END LOOP;
END $$;
