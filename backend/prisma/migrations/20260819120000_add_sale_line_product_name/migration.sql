ALTER TABLE ventas_detalle
ADD COLUMN nombre_producto VARCHAR(100);

UPDATE ventas_detalle AS detalle
SET nombre_producto = producto.nombre
FROM producto
WHERE producto.id = detalle.producto_id;

ALTER TABLE ventas_detalle
ALTER COLUMN nombre_producto SET NOT NULL;
