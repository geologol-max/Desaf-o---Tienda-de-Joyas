-- Script oficial de creación y poblado de la base de datos 'joyas'
-- Desafío Latam - Tienda de Joyas My Precious Spa

CREATE DATABASE joyas;

\c joyas;

CREATE TABLE inventario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    metal VARCHAR(50) NOT NULL,
    precio INT NOT NULL,
    stock INT NOT NULL
);

INSERT INTO inventario (id, nombre, categoria, metal, precio, stock) VALUES
(DEFAULT, 'Collar Heart', 'collar', 'oro', 20000, 2),
(DEFAULT, 'Collar History', 'collar', 'plata', 15000, 5),
(DEFAULT, 'Aros Berry', 'aros', 'oro', 12000, 10),
(DEFAULT, 'Aros Hook Blue', 'aros', 'oro', 25000, 4),
(DEFAULT, 'Anillo Wish', 'aros', 'plata', 30000, 4),
(DEFAULT, 'Anillo Cuarzo Greece', 'anillo', 'oro', 40000, 2);

-- Verificación de datos insertados
SELECT * FROM inventario;
