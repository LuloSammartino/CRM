CREATE TABLE PRODUCTOS (
  ID INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  NOMBRE VARCHAR(50) NOT NULL UNIQUE,
  COSTO NUMBER(9, 2),
  PRECIO_1 NUMBER(9, 2) NOT NULL,
  PRECIO_2 NUMBER(9, 2),
  PRECIO_3 NUMBER(9, 2),
  RUBRO VARCHAR(50),
  PROVEEDOR_ID NUMBER(3,0),
  CREADO DATE DEFAULT CURRENT_DATE, 
  MODIFICADO DATE
  );

CREATE TABLE CLIENTES (
  ID INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  NOMBRE VARCHAR(50) NOT NULL UNIQUE,
  DIRECCION VARCHAR(50),
  DIRECCION_2 VARCHAR(50),
  TELEFONO VARCHAR(20),
  EMAIL VARCHAR(50),
  CUIT VARCHAR(11) UNIQUE,
  IVA VARCHAR(30),
  );

CREATE TABLE ventas (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    cliente_id INT, -- Puede ser NULL si es un "Consumidor Final" de paso
    monto_total NUMERIC(9, 2) NOT NULL,
    
    -- El puente con tu sistema de Cuenta Corriente
    metodo_pago VARCHAR(50) NOT NULL, -- Ej: 'Efectivo', 'Mercado Pago', 'Cuenta Corriente'
    
    -- Los campos para AFIP (Listos pero vacíos por ahora)
    tipo_comprobante VARCHAR(10), 
    nro_comprobante VARCHAR(20),
    cae VARCHAR(14),
    vencimiento_cae DATE,
    
    -- La relación formal con la tabla de clientes
    CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE ventas_detalle (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(9, 2) NOT NULL,
    subtotal NUMERIC(9, 2) NOT NULL,
    
    -- Si borrás una venta, se borran sus detalles automáticamente
    CONSTRAINT fk_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    -- Conecta el detalle con el catálogo maestro
    CONSTRAINT fk_producto FOREIGN KEY (producto_id) REFERENCES producto(id)
);
