create database DB_CoffeesMedy
go
use DB_CoffeesMedy
go


create table Rol(
Id_Rol int primary key identity(1,1),
Tipo_Rol nvarchar(15) check (Tipo_Rol IN ('Admin', 'Cliente')) not null
)

create table Usuario (
Id_Usuario INT PRIMARY KEY IDENTITY(1,1),
Id_Rol int default 2 not null,
Nombre NVARCHAR(100) not null,
Email NVARCHAR(100) UNIQUE not null,
Contrasena NVARCHAR(100) not null,
TokenVerificacion NVARCHAR(100) NULL,
Verificado bit default 0
foreign key (Id_Rol) references Rol(Id_Rol)
)
go


CREATE TABLE Administrador(
  Id_admin INT Identity(1,1) NOT NULL PRIMARY KEY,
  Id_Usuario INT NOT NULL,
  FOREIGN KEY (Id_Usuario) REFERENCES Usuario(Id_Usuario)
);
go

create table Imagen(
Id_Imagen int primary key identity(1,1),
Img_Url nvarchar(max) not null
)

CREATE TABLE Repartidor (
Id_Repartidor INT PRIMARY KEY IDENTITY(1,1),
Nombre NVARCHAR(100) NOT NULL,
Cedula CHAR(16) NOT NULL UNIQUE,  -- Ej: 001-260804-1023R
Fecha_Nacimiento AS ( CONVERT(DATE, '20' + RIGHT(SUBSTRING(Cedula, 5, 6), 2) + '-' +  SUBSTRING(Cedula, 7, 2) + '-' 
                    + SUBSTRING(Cedula, 5, 2))),
Edad AS (DATEDIFF(YEAR, CONVERT(DATE, '20' + RIGHT(SUBSTRING(Cedula, 5, 6), 2) + '-' + SUBSTRING(Cedula, 7, 2) + '-' 
        + SUBSTRING(Cedula, 5, 2)), GETDATE())),

Id_Imagen int not null,

foreign key (Id_Imagen) references Imagen(Id_Imagen)
)
go

CREATE TABLE Categoria (
Id_Categoria INT PRIMARY KEY IDENTITY(1,1),
Nombre NVARCHAR(50) NOT NULL UNIQUE
)
go

create table Producto(
Id_producto int primary key identity(1,1),
Nombre nvarchar(100) not null,
Precio decimal(10,2) not null,
Stock int not null,
Id_Imagen int not null,
Id_Categoria int not null,

foreign key (Id_Imagen) references Imagen(Id_Imagen),
foreign key (Id_Categoria) references Categoria(Id_Categoria)
)
go


create table Pedido(
Id_Pedido int primary key identity(1,1),
Id_Usuario int,
Id_Repartidor int,
Direccion nvarchar(150) not null,
Telefono nvarchar(9) not null,
Fecha_pedido datetime default getdate(),
Estado nvarchar(15) check (Estado IN ('Pendiente', 'Enviado', 'Entregado', 'Cancelado')),
foreign key (Id_Usuario) references Usuario(Id_Usuario),
foreign key (Id_Repartidor) references Repartidor(Id_Repartidor)
)
go

create table Detalle_Pedido (
Id_Detalle_Pedido int primary key identity(1,1),
Id_Pedido int,
Id_Producto int,
Cantidad int,
Precio_unitario decimal(10,2),
Subtotal decimal(10,2),
foreign key (Id_Pedido) references Pedido(Id_Pedido),
foreign key (Id_Producto) references Producto(Id_Producto)
)
go

create table Venta(
Id_Venta int primary key identity(1,1),
Id_Usuario int,
Fecha_Venta date,
Total decimal(10,2),
foreign key (Id_Usuario) references Usuario(Id_Usuario)
)
go

create table Detalle_Venta(
Id_Detalle_Venta int primary key identity(1,1),
Id_Venta int not null,
Id_Producto int not null,
Cantidad int not null,
Precio_Unitario decimal(10,2) not null,
Descuento decimal(5,2) not null,
Subtotal decimal(10,2) not null,
foreign key (Id_Venta) references Venta(Id_Venta),
foreign key (Id_Producto) references Producto(Id_Producto)
)
go

SELECT 
V.Id_Venta,
U.Nombre AS Nombre,
P.Nombre AS Producto,
DV.Cantidad,
DV.Precio_Unitario,
DV.Descuento,
DV.Subtotal,
V.Fecha_Venta,
V.Total
FROM Venta V
JOIN Usuario U ON V.Id_Usuario = U.Id_Usuario
JOIN Detalle_Venta DV ON V.Id_Venta = DV.Id_Venta
JOIN Producto P ON DV.Id_Producto = P.Id_Producto
ORDER BY V.Id_Venta



-- Función para calcular subtotal
CREATE FUNCTION dbo.CalcularSubtotal
(
    @Precio DECIMAL(10,2),
    @Cantidad INT
)
RETURNS DECIMAL(10,2)
AS
BEGIN
    RETURN @Precio * @Cantidad;
END;
GO


-- Función para calcular total con descuento
CREATE FUNCTION dbo.CalcularTotal
(
    @Precio DECIMAL(10,2),
    @Cantidad INT,
    @Descuento DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
AS
BEGIN
    RETURN (@Precio * @Cantidad) - @Descuento;
END;
GO


SELECT dbo.CalcularSubtotal(1, 5) AS Subtotal;


SELECT 
    V.Id_Venta,
    U.Nombre AS Cliente,
    P.Nombre AS Producto,
    DV.Cantidad,
    DV.Precio_Unitario,
    DV.Descuento,
    DV.Subtotal,
    V.Fecha_Venta,
    V.Total
FROM Venta V
JOIN Usuario U ON V.Id_Usuario = U.Id_Usuario
JOIN Detalle_Venta DV ON V.Id_Venta = DV.Id_Venta
JOIN Producto P ON DV.Id_Producto = P.Id_Producto
WHERE U.Nombre like 'Cliente'
ORDER BY V.Id_Venta


SELECT 
P.Id_Pedido,
U.Nombre AS Cliente,
R.Nombre AS Repartidor,
P.Direccion,
P.Telefono,
P.Fecha_pedido,
P.Estado
FROM Pedido P
JOIN Usuario U ON P.Id_Usuario = U.Id_Usuario
LEFT JOIN Repartidor R ON P.Id_Repartidor = R.Id_Repartidor
ORDER BY P.Id_Pedido DESC
