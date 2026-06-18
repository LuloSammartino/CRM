UPDATE producto
SET rubro = COALESCE(NULLIF(UPPER(TRIM(rubro)), ''), 'RUBRO UNICO');
