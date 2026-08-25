DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'direccion_1'
  ) THEN
    ALTER TABLE clientes RENAME COLUMN direccion_1 TO telefono_2;
  END IF;
END $$;
