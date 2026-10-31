use DB_CoffeesMedy

insert into Rol(Tipo_Rol) values ('Admin'),('Cliente')


-- Categorias
INSERT INTO Categoria (Nombre) VALUES
('Frappes'),
('Bebidas Calientes'),
('Postres'),
('Desayunos');


-- Insertar im�genes
INSERT INTO Imagen (Img_Url) VALUES 
('img/frappe caramelo.png'),
('img/frappe de oreo.jpg'),
('img/frappe de moca.jpg'),
('img/frappe chocolate.jpg'),
('img/frappe avellana.jpg'),
('img/frappe capuccino.jpg'),
('img/cafe.jpg'),
('img/capuchino caliente.jpg'),
('img/chocolate caliente.jpg'),
('img/flan.jpg'),
('img/chocoflan.jpg'),
('img/bu�uelos.jpg'),
('img/desayuno tradicional.jpg'),
('img/desayuno americano.jpg'),
('img/pancakes.jpg'),
('img/yogurt.jpg');

-- Insertar productos con sus respectivos Id_Imagen e Id_Categoria
INSERT INTO Producto (Nombre, Precio, Stock, Id_Imagen, Id_Categoria) VALUES
('Frappe de Caramelo', 4.00, 15, 1, 1),
('Frappe de Oreo', 5.00, 15, 2, 1),
('Frappe de Moca', 5.00, 15, 3, 1),
('Frappe de Chocolate', 4.00, 15, 4, 1),
('Frappe de Avellana', 3.00, 15, 5, 1),
('Frappe de Capuccino', 3.00, 15, 6, 1),
('Caf� de Grano', 1.00, 15, 7, 2),
('Capuccino Caliente', 3.00, 15, 8, 2),
('Chocolate Caliente', 5.00, 15, 9, 2),
('Flan', 2.00, 15, 10, 3),
('Chocoflan', 3.00, 15, 11, 3),
('Bu�uelos', 2.00, 15, 12, 3),
('Desayuno Tradicional', 2.00, 15, 13, 4),
('Desayuno Americano', 3.00, 15, 14, 4),
('Pancakes', 2.00, 5, 15, 4),
('Bowl de Yogurt con Frutas de Temporada', 4.00, 15, 16, 4);


INSERT INTO Repartidor (Nombre, Cedula, Id_Imagen) VALUES
('Carlos P�rez',     '001-150301-1234A', 1),
('Mar�a G�mez',      '001-230496-5678B', 2),
('Luis Hern�ndez',   '001-101297-9123C', 3),
('Ana Castillo',     '001-070705-3456D', 4),
('Jos� Mart�nez',    '001-250188-7890E', 5);
