require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');

const fs = require('fs');
const crypto = require('crypto');

// const clave = process.env.SECRET_KEY;
// console.log('Clave secreta:', clave);

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // para servir el HTML y JS

const config = {
  user: 'sa',
  password: '12345',
  server: 'DESKTOP-QS6K2CL',
  database: 'DB_CoffeesMedy',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};


// Permitir archivos estáticos como CSS y JS
app.use(express.static(__dirname));


// Servir HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'principal.html'));
});

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'melanyfer.san@gmail.com',     
    pass: 'shwknkycmosthweh'
  }
});

//--------------------------------------------------Repartidores

// GET: obtener todos los repartidores con datos de la imagen
app.get('/repartidores', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        r.Id_Repartidor,
        r.Nombre,
        r.Cedula,
        i.Img_Url AS Foto_Perfil
      FROM Repartidor r
      INNER JOIN Imagen i ON r.Id_Imagen = i.Id_Imagen
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error al obtener repartidores:', err);
    res.status(500).send('Error del servidor');
  }
});



// POST: agregar un repartidor nuevo
app.post('/agregarrepartidores', async (req, res) => {
  const { nombre, cedula, imagen } = req.body;

  try {
    const pool = await sql.connect(config);

    // Insertar la imagen y obtener su ID
    const resultImagen = await pool.request()
      .input('Img_Url', sql.NVarChar(sql.MAX), imagen)
      .query('INSERT INTO Imagen (Img_Url) OUTPUT INSERTED.Id_Imagen VALUES (@Img_Url)');

    const idImagen = resultImagen.recordset[0].Id_Imagen;

    // Insertar el repartidor
    await pool.request()
      .input('Nombre', sql.NVarChar(100), nombre)
      .input('Cedula', sql.NVarChar(16), cedula)
      .input('Id_Imagen', sql.Int, idImagen)
      .query(`
        INSERT INTO Repartidor (Nombre, Cedula, Id_Imagen)
        VALUES (@Nombre, @Cedula, @Id_Imagen)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error al agregar repartidor:', err);
    res.status(500).json({ success: false, mensaje: 'Error al insertar en la base de datos' });
  }
});



// PUT: editar repartidor por id
app.put('/editarrepartidor/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, cedula, imagen } = req.body;

  try {
    const pool = await sql.connect(config);

    // Obtener el Id_Imagen actual del repartidor
    const result = await pool.request()
      .input('Id', sql.Int, id)
      .query('SELECT Id_Imagen FROM Repartidor WHERE Id_Repartidor = @Id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Repartidor no encontrado' });
    }

    const idImagen = result.recordset[0].Id_Imagen;

    // Actualizar la imagen
    await pool.request()
      .input('Id_Imagen', sql.Int, idImagen)
      .input('Img_Url', sql.NVarChar(sql.MAX), imagen)
      .query('UPDATE Imagen SET Img_Url = @Img_Url WHERE Id_Imagen = @Id_Imagen');

    // Actualizar los datos del repartidor
    await pool.request()
      .input('Id', sql.Int, id)
      .input('Nombre', sql.NVarChar(100), nombre)
      .input('Cedula', sql.NVarChar(16), cedula)
      .query(`
        UPDATE Repartidor
        SET Nombre = @Nombre,
            Cedula = @Cedula
        WHERE Id_Repartidor = @Id
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error al editar repartidor:', err);
    res.status(500).json({ success: false, mensaje: 'Error al actualizar en la base de datos' });
  }
});


// DELETE: eliminar repartidor por id
app.delete('/eliminarrepartidor/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const pool = await sql.connect(config);

    // Obtener el Id_Imagen asociado al repartidor
    const result = await pool.request()
      .input('Id', sql.Int, id)
      .query('SELECT Id_Imagen FROM Repartidor WHERE Id_Repartidor = @Id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Repartidor no encontrado' });
    }

    const idImagen = result.recordset[0].Id_Imagen;

    // Eliminar el repartidor
    await pool.request()
      .input('Id', sql.Int, id)
      .query('DELETE FROM Repartidor WHERE Id_Repartidor = @Id');

    // Eliminar la imagen asociada
    await pool.request()
      .input('Id_Imagen', sql.Int, idImagen)
      .query('DELETE FROM Imagen WHERE Id_Imagen = @Id_Imagen');

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error al eliminar repartidor:', err);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar de la base de datos' });
  }
});

//BACKEND PRODUCTOS
// calcular total carrito

app.get('/calcular-subtotal', async (req, res) => {
  const { precio, cantidad } = req.query;
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('Precio', sql.Decimal(10, 2), precio)
      .input('Cantidad', sql.Int, cantidad)
      .query('SELECT dbo.CalcularSubtotal(@Precio, @Cantidad) AS subtotal');

    const subtotal = result.recordset[0].subtotal;
    res.json({ subtotal });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en cálculo subtotal');
  }
});

//----------------------------------------------------
//restar stock productos
app.post('/restar-stock', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const { productos } = req.body;

    if (!productos || productos.length === 0) {
      return res.status(400).json({ mensaje: "No hay productos" });
    }

    for (const p of productos) {
      await pool.request()
        .input('Nombre', sql.NVarChar(100), p.nombre)
        .input('Cantidad', sql.Int, p.cantidad)
        .query(`
                    UPDATE Producto
                    SET Stock = Stock - @Cantidad
                    WHERE Nombre = @Nombre
                `);
    }

    res.json({ mensaje: "Compra realizada correctamente" });
  } catch (err) {
    console.error("Error en /restar-stock:", err);
    res.status(500).json({ mensaje: "Error al actualizar stock" });
  }
});

//-----------------------------------------------------------------------------------

//BACKEND REGISTRAR 

//Categorias
app.get('/categorias', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT Id_Categoria, Nombre FROM Categoria');

    res.json(result.recordset); // Devuelve un array de categorías
  } catch (err) {
    console.error("❌ Error al obtener categorías:", err);
    res.status(500).json({ success: false, mensaje: 'Error al obtener categorías desde la base de datos' });
  }
});


// Obtener productos con su imagen y nombre de categoría
app.get('/productos', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        p.Id_producto,
        p.Nombre,
        p.Precio,
        p.Stock,
        i.Img_Url AS Imagen,
        c.Nombre AS Categoria
      FROM Producto p
      INNER JOIN Imagen i ON p.Id_Imagen = i.Id_Imagen
      INNER JOIN Categoria c ON p.Id_Categoria = c.Id_Categoria
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error al obtener productos:', err);
    res.status(500).send('Error del servidor');
  }
});


// Ruta para agregar producto
app.post('/agregarproductos', async (req, res) => {
  const { nombre, precio, categoria, imagen, stock } = req.body;
  try {
    const pool = await sql.connect(config);

    // 1. Obtener el Id_Categoria
    const resultCategoria = await pool.request()
      .input('NombreCategoria', sql.NVarChar(50), categoria)
      .query('SELECT Id_Categoria FROM Categoria WHERE Nombre = @NombreCategoria');

    if (resultCategoria.recordset.length === 0) {
      return res.status(400).json({ success: false, mensaje: 'La categoría no existe en la base de datos' });
    }

    const idCategoria = resultCategoria.recordset[0].Id_Categoria;

    // 2. Insertar imagen y obtener su ID
    const resultImagen = await pool.request()
      .input('Img_Url', sql.NVarChar(sql.MAX), imagen)
      .query('INSERT INTO Imagen (Img_Url) OUTPUT INSERTED.Id_Imagen VALUES (@Img_Url)');

    const idImagen = resultImagen.recordset[0].Id_Imagen;

    // 3. Insertar producto
    await pool.request()
      .input('Nombre', sql.NVarChar(100), nombre)
      .input('Precio', sql.Decimal(10, 2), precio)
      .input('Stock', sql.Int, stock)
      .input('Id_Imagen', sql.Int, idImagen)
      .input('Id_Categoria', sql.Int, idCategoria)
      .query(`
        INSERT INTO Producto (Nombre, Precio, Stock, Id_Imagen, Id_Categoria)
        VALUES (@Nombre, @Precio, @Stock, @Id_Imagen, @Id_Categoria)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error al insertar producto:', err);
    res.status(500).json({ success: false, mensaje: 'Error al insertar en la base de datos' });
  }
});

// Editar producto
app.put('/editarproducto/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, precio, categoria, imagen, stock } = req.body;

  try {
    const pool = await sql.connect(config);

    // Obtener ID de la categoría
    const resultCategoria = await pool.request()
      .input('NombreCategoria', sql.NVarChar(50), categoria)
      .query('SELECT Id_Categoria FROM Categoria WHERE Nombre = @NombreCategoria');

    if (resultCategoria.recordset.length === 0) {
      return res.status(400).json({ success: false, mensaje: 'Categoría no encontrada' });
    }

    const idCategoria = resultCategoria.recordset[0].Id_Categoria;

    // Obtener Id_Imagen actual del producto
    const result = await pool.request()
      .input('Id', sql.Int, id)
      .query('SELECT Id_Imagen FROM Producto WHERE Id_producto = @Id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Producto no encontrado' });
    }

    const idImagen = result.recordset[0].Id_Imagen;

    // Actualizar la imagen
    await pool.request()
      .input('Id_Imagen', sql.Int, idImagen)
      .input('Img_Url', sql.NVarChar(sql.MAX), imagen)
      .query('UPDATE Imagen SET Img_Url = @Img_Url WHERE Id_Imagen = @Id_Imagen');

    // Actualizar el producto
    await pool.request()
      .input('Id', sql.Int, id)
      .input('Nombre', sql.NVarChar(100), nombre)
      .input('Precio', sql.Decimal(10, 2), precio)
      .input('Stock', sql.Int, stock)
      .input('Id_Categoria', sql.Int, idCategoria)
      .query(`
        UPDATE Producto
        SET Nombre = @Nombre,
            Precio = @Precio,
            Stock = @Stock,
            Id_Categoria = @Id_Categoria
        WHERE Id_producto = @Id
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error al editar producto:", err);
    res.status(500).json({ success: false, mensaje: "Error al actualizar en la base de datos" });
  }
});

// Eliminar producto
app.delete('/eliminarproducto/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const pool = await sql.connect(config);

    // Obtener Id_Imagen asociado al producto
    const result = await pool.request()
      .input('Id', sql.Int, id)
      .query('SELECT Id_Imagen FROM Producto WHERE Id_producto = @Id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Producto no encontrado' });
    }

    const idImagen = result.recordset[0].Id_Imagen;

    // Eliminar el producto
    await pool.request()
      .input('Id', sql.Int, id)
      .query('DELETE FROM Producto WHERE Id_producto = @Id');

    // Eliminar la imagen asociada
    await pool.request()
      .input('Id_Imagen', sql.Int, idImagen)
      .query('DELETE FROM Imagen WHERE Id_Imagen = @Id_Imagen');

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error al eliminar producto:", err);
    res.status(500).json({ success: false, mensaje: "Error al eliminar de la base de datos" });
  }
});


//-----------------------------------       Login      ------------------------------------------------
/*app.post('/login', async (req, res) => {
  const { email, contrasena } = req.body;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('Email', sql.NVarChar, email)
      .input('Contrasena', sql.NVarChar, contrasena)
      .query(`SELECT * FROM Usuario WHERE Email = @Email AND Contrasena = @Contrasena`);

    if (result.recordset.length > 0) {
      const nombre = result.recordset[0].Nombre; // 👈 extraer el nombre
      const emailu = result.recordset[0].Email;
      res.json({
        success: true,
        mensaje: "Inicio de sesión exitoso",
        nombre: nombre, // enviar nombre al frontend
        email: emailu
      });
    } else {
      res.json({ success: false, mensaje: "Correo o contraseña incorrectos" });
    }

  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ success: false, mensaje: "Error en el servidor" });
  }
});*/

app.post('/login', async (req, res) => {
  const { email, contrasena } = req.body;

  try {
    const pool = await sql.connect(config);

    // Verificar si el usuario existe con ese correo
    const usuarioResult = await pool.request()
      .input('Email', sql.NVarChar, email)
      .query(`SELECT * FROM Usuario WHERE Email = @Email`);

    if (usuarioResult.recordset.length === 0) {
      // ❌ No existe ese email
      return res.json({ success: false, mensaje: "Correo incorrecto o no registrado" });
    }

    const usuario = usuarioResult.recordset[0];

    if (usuario.Contrasena !== contrasena) {
      // ❌ Contraseña incorrecta
      return res.json({ success: false, mensaje: "Contraseña incorrecta" });
    }

    if (usuario.Verificado !== true && usuario.Verificado !== 1) {
      // ❌ Cuenta no verificada
      return res.json({ success: false, mensaje: "Tu cuenta no está verificada. Por favor revisa tu correo." });
    }

    // ✅ Todo correcto
    return res.json({
      success: true,
      mensaje: "Inicio de sesión exitoso",
      nombre: usuario.Nombre,
      email: usuario.Email
    });

  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ success: false, mensaje: "Error en el servidor" });
  }
});


/*//Registrarse
app.post('/registro', async (req, res) => {
  const { nombre, email, contrasena } = req.body;

  if (!nombre || !email || !contrasena) {
    return res.json({ success: false, mensaje: "Campos incompletos" });
  }

  try {
    const pool = await sql.connect(config);

    // Insertar usuario
    await pool.request()
      .input('Nombre', sql.NVarChar(100), nombre)
      .input('Correo', sql.NVarChar(100), email)
      .input('Contrasena', sql.NVarChar(100), contrasena)
      .query(`INSERT INTO Usuario (Nombre, Email, Contrasena)
              VALUES (@Nombre, @Correo, @Contrasena)`);

    // ✅ Enviar directamente lo que recibimos del frontend
    return res.json({
      success: true,
      mensaje: "Registro exitoso",
      nombre: nombre,
      email: email
    });

  } catch (err) {
    console.error("❌ Error en /registro:", err);
    return res.status(500).json({ success: false, mensaje: "Error en el servidor" });
  }
});*/


//Registrarse
app.post('/registro', async (req, res) => {
  const { nombre, email, contrasena } = req.body;

  console.log("Datos recibidos en /registro:", { nombre, email, contrasena }); 

  if (!nombre || !email || !contrasena) {
    return res.json({ success: false, mensaje: "Campos incompletos" });
  }

  try {
    const pool = await sql.connect(config);
    const token = crypto.randomBytes(32).toString('hex');

    // Insertar usuario
    console.log({ nombre, email, contrasena });
    await pool.request()
      .input('Nombre', sql.NVarChar(100), nombre)
      .input('Email', sql.NVarChar(100), email)
      .input('Contrasena', sql.NVarChar(100), contrasena)
      .input('Token', sql.NVarChar(100), token)
      .query(`INSERT INTO Usuario (Nombre, Email, Contrasena, Verificado, TokenVerificacion)
              VALUES (@Nombre, @Email, @Contrasena, 0, @Token)`);

    //enviar email
    const url =  `http://localhost:3000/verificar?token=${token}&email=${encodeURIComponent(email)}`;
    await transporter.sendMail({
      from:'melanyfer.san@gmail.com',
      to: email,
      subject: 'Verifica tu cuenta',
      html:`<h3>Hola ${nombre}.</h3><p>Haz clic en el siguiente enlace para verificar tu cuenta:</p><a href="${url}">Verificar cuenta</a>`
    });

    // ✅ Enviar directamente lo que recibimos del frontend
  return res.status(200).json({
  success: true,
  mensaje: "Registro exitoso",
  nombre: nombre,
  email: email
    });

  } catch (err) {
    console.error("❌ Error en /registro:", err);
    return res.status(500).json({ success: false, mensaje: `Error del servidor: ${err.message}` });
  }
});

app.get('/verificar', async (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).send("❌ Faltan datos para verificar.");
  }

  try {
    const pool = await sql.connect(config);

    // Verificar si existe el usuario con ese token
    const result = await pool.request()
      .input('Email', sql.NVarChar, email)
      .input('Token', sql.NVarChar, token)
      .query(`SELECT * FROM Usuario WHERE Email = @Email AND TokenVerificacion = @Token`);

    if (result.recordset.length === 0) {
      return res.send("❌ Verificación inválida o ya usada.");
    }

    // Actualizar usuario como verificado (usar el mismo pool.request() o crear uno nuevo)
    await pool.request()
      .input('Email', sql.NVarChar, email)
      .query(`UPDATE Usuario SET Verificado = 1, TokenVerificacion = NULL WHERE Email = @Email`);

    return res.send("✅ Cuenta verificada correctamente. Ya puedes iniciar sesión.");

  } catch (err) {
    console.error("❌ Error detallado de verificación:", err);
    res.status(500).send(`❌ Error del servidor: ${err.message}`);
  }
});


// POST: buscar usuario desde formulario de pago

app.get('/buscar-usuario', async (req, res) => {
  const { nombre, email } = req.query;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('Nombre', sql.NVarChar, nombre)
      .input('Email', sql.NVarChar, email)
      .query(`
        SELECT Id_Usuario FROM Usuario
        WHERE Nombre = @Nombre AND Email = @Email
      `);

    if (result.recordset.length > 0) {
      res.json({ idUsuario: result.recordset[0].Id_Usuario });
    } else {
      res.json({ idUsuario: null });
    }
  } catch (err) {
    console.error("❌ Error al buscar usuario:", err);
    res.status(500).json({ idUsuario: null });
  }
});



//--------------------------------Ventas

app.post('/registrar-venta', async (req, res) => {
  const { productos, idUsuario } = req.body;

  if (!productos || productos.length === 0 || !idUsuario) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    const request = new sql.Request(transaction);

    let total = 0;

    // Calcular total y obtener Id_Producto y Precio
    for (const p of productos) {

      const productRequest = new sql.Request(transaction);
      const r = await productRequest
        .input('Nombre', sql.NVarChar, p.nombre)
        .query('SELECT Precio, Id_Producto FROM Producto WHERE Nombre = @Nombre');

      if (r.recordset.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ mensaje: `Producto no encontrado: ${p.nombre}` });
      }

      const precio = r.recordset[0].Precio;
      const idProducto = r.recordset[0].Id_Producto;

      p.precio = precio;
      p.idProducto = idProducto;
      p.descuento = p.descuento || 0;

      const totalResult = await new sql.Request(transaction)
      .input('Precio', sql.Decimal(10, 2), precio)
      .input('Cantidad', sql.Int, p.cantidad)
      .input('Descuento', sql.Decimal(10, 2), p.descuento)
      .query(`SELECT dbo.CalcularTotal(@Precio, @Cantidad, @Descuento) AS Total`);
      total += totalResult.recordset[0].Total;
    }

    // Insertar en Venta
    const venta = await request
      .input('Id_Usuario', sql.Int, idUsuario)
      .input('Fecha', sql.Date, new Date())
      .input('Total', sql.Decimal(10, 2), total)
      .query(`
        INSERT INTO Venta (Id_Usuario, Fecha_Venta, Total)
        OUTPUT INSERTED.Id_Venta
        VALUES (@Id_Usuario, @Fecha, @Total)
      `);

    const idVenta = venta.recordset[0].Id_Venta;

// Insertar en Detalle_Venta
for (const p of productos) {
  // Usar un nuevo request para cada cálculo
  const calcRequest = new sql.Request(transaction);
  const subtotalResult = await calcRequest
    .input('Precio', sql.Decimal(10, 2), p.precio)
    .input('Cantidad', sql.Int, p.cantidad)
    .query(`SELECT dbo.CalcularSubtotal(@Precio, @Cantidad) AS Subtotal`);

  subtotal = subtotalResult.recordset[0].Subtotal;

  if (subtotal == null || isNaN(subtotal)) {
  await transaction.rollback();
  return res.status(400).json({ mensaje: "Error al calcular el subtotal." });
}

  // Nuevo request para el insert
  const insertRequest = new sql.Request(transaction);
  await insertRequest
    .input('Id_Venta', sql.Int, idVenta)
    .input('Id_Producto', sql.Int, p.idProducto)
    .input('Cantidad', sql.Int, p.cantidad)
    .input('Precio', sql.Decimal(10, 2), p.precio)
    .input('Descuento', sql.Decimal(5, 2), p.descuento)
    .input('Subtotal', sql.Decimal(10, 2), subtotal)
    .query(`
      INSERT INTO Detalle_Venta (Id_Venta, Id_Producto, Cantidad, Precio_Unitario, Descuento, Subtotal)
      VALUES (@Id_Venta, @Id_Producto, @Cantidad, @Precio, @Descuento, @Subtotal)`
    );
}


    await transaction.commit();

    res.json({ success: true, mensaje: "Venta y detalle guardados correctamente." });

  } catch (err) {
    console.error("❌ Error al guardar venta:", err);
    res.status(500).json({ success: false, mensaje: "Error al registrar la venta." });
  }
});

// ----------------------------------------Voucher
/*app.get('/vouchers', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
          V.Id_Venta,
          C.NombreCompleto AS Cliente,
          P.Nombre AS Producto,
          DV.Cantidad,
          DV.Precio_Unitario,
          DV.Descuento,
          DV.Subtotal,
          V.Fecha_Venta,
          V.Total
      FROM Venta V
      JOIN Cliente C ON V.Id_Cliente = C.Id_Cliente
      JOIN Detalle_Venta DV ON V.Id_Venta = DV.Id_Venta
      JOIN Producto P ON DV.Id_Producto = P.Id_Producto
      
    `);

    if (usuario !== 'admin') {
      query += ` WHERE C.Email = @usuario `;
    }

    query += ` ORDER BY V.Id_Venta`;

    const request = pool.request();

    if (usuario !== 'admin') {
      request.input('usuario', sql.NVarChar, usuario);
    }
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});*/

app.get('/vouchers', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
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
      ORDER BY V.Id_Venta`
    );
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error en el servidor');
  }
});

//-----------------------voucher usuario

app.get('/vouchers_compras', async (req, res) => {
  const nombre = req.query.nombre;

  try {
    const pool = await sql.connect(config);

    const result = await pool.request()
      // Ponemos % para buscar coincidencias parciales
      .input('Nombre', sql.NVarChar, `%${nombre.trim()}%`)
      .query(`
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
        WHERE U.Nombre LIKE @Nombre
        ORDER BY V.Id_Venta
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("❌ Error en /vouchers_compras:", error);
    res.status(500).send('Error en el servidor');
  }
});

//-----------------------------------------------Cifrar

const algorithm = 'aes-256-gcm';
const secretKey = process.env.SECRET_KEY;

// Función para cifrar (devuelve JSON-string)
function cifrar(texto) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    contenido: encrypted.toString('hex'),
    tag: tag.toString('hex')
  });
}

// Función para descifrar (recibe JSON-string)
function descifrar(jsonCifrado) {
  try {
    if (!jsonCifrado) return "";

    const parsed = JSON.parse(jsonCifrado);
    if (!parsed.iv || !parsed.contenido || !parsed.tag) return "";

    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(parsed.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.contenido, 'hex')),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    console.error("❌ Error al descifrar:", err.message);
    return "";
  }
}

// Ruta para guardar datos cifrados (POST)
app.post("/guardar-datos-cifrados", (req, res) => {
  const {
    nombre,
    email,
    nombreTarjeta,
    numeroTarjeta,
    mesExp,
    cvv
  } = req.body;

  if (!nombre || !email || !nombreTarjeta || !numeroTarjeta || !mesExp || !cvv) {
    return res.status(400).json({ success: false, mensaje: "Faltan datos para cifrar." });
  }

  try {
    const datosCifrados = {
      email, // guardamos sin cifrar para búsqueda
      nombre: cifrar(nombre),
      nombreTarjeta: cifrar(nombreTarjeta),
      numeroTarjeta: cifrar(numeroTarjeta),
      mesExp: cifrar(mesExp),
      cvv: cifrar(cvv),
      fecha: new Date().toISOString()
    };

    // Guardar línea JSON en archivo
    fs.appendFileSync("datos_cifrados_pagos.txt", JSON.stringify(datosCifrados) + '\n');

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error al guardar datos cifrados:", err);
    res.status(500).json({ success: false, mensaje: "Error al guardar datos cifrados" });
  }
});

// Ruta para obtener datos descifrados (GET)
app.get('/obtener-datos-cifrados', (req, res) => {
  const correo = req.query.email;

  if (!correo) {
    return res.status(400).json({ success: false, mensaje: "Falta parámetro email." });
  }

  try {
    const lineas = fs.readFileSync('datos_cifrados_pagos.txt', 'utf-8')
      .trim()
      .split('\n')
      .filter(linea => linea.trim() !== "")
      .map(linea => {
        try {
          return JSON.parse(linea);
        } catch (err) {
          console.warn("❌ Línea corrupta ignorada:", linea);
          return null;
        }
      })
      .filter(entry => entry !== null)
      .reverse();

    const encontrados = lineas.find(entry => entry.email === correo);

    if (!encontrados) return res.json({ success: false, mensaje: "No se encontraron datos" });

    const camposUtiles = ['nombreTarjeta', 'numeroTarjeta', 'mesExp', 'cvv'];
    const datosDescifrados = {};

    camposUtiles.forEach(campo => {
      if (encontrados[campo]) {
        datosDescifrados[campo] = descifrar(encontrados[campo]);
      }
    });

    res.json({ success: true, datos: datosDescifrados });

  } catch (error) {
    console.error("❌ Error al obtener datos cifrados:", error);
    res.status(500).json({ success: false, mensaje: "Error al leer datos cifrados" });
  }
});



//--------------------------------------Gestion pedidos
app.post('/crear-pedido', async (req, res) => {
  const { idUsuario, direccion, telefono, carrito } = req.body; // carrito: [{ idProducto, cantidad, precioUnitario }]

  let pool;
  let transaction;

  try {
    pool = await sql.connect(config);

    // Crear transacción sobre pool
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Crear request asociado a la transacción
    const request = new sql.Request(transaction);

    // Insertar pedido
    const pedido = await request
      .input('idUsuario', sql.Int, idUsuario)
      .input('direccion', sql.NVarChar, direccion)
      .input('telefono', sql.NVarChar, telefono)
      .query(`
        INSERT INTO Pedido (Id_Usuario, Direccion, Telefono, Estado)
        OUTPUT INSERTED.Id_Pedido
        VALUES (@idUsuario, @direccion, @telefono, 'Pendiente')
      `);

    const idPedido = pedido.recordset[0].Id_Pedido;

    // Insertar detalles del pedido usando mismo request o crear nuevos requests para cada (mejor nuevos para evitar problemas)
    for (const item of carrito) {
    // Obtener precio desde la base de datos
      const r = await new sql.Request(transaction)
      .input('Nombre', sql.NVarChar, item.nombre)
      .query('SELECT Id_Producto, Precio FROM Producto WHERE Nombre = @Nombre');
      
      if (r.recordset.length === 0) {
        throw new Error(`Producto no encontrado: ${item.idProducto}`);
      }
      
      
      const idProducto = r.recordset[0].Id_Producto;
      const precioUnitario = r.recordset[0].Precio;
      const cantidad = parseInt(item.cantidad);

      if (isNaN(cantidad) || cantidad <= 0) {
        throw new Error(`Cantidad inválida: ${item.cantidad}`);
      }

      const subtotal = cantidad * precioUnitario;

      // Insertar detalle pedido con precio y subtotal limpios
      const detailRequest = new sql.Request(transaction);
      await detailRequest
        .input('idPedido', sql.Int, idPedido)
        .input('idProducto', sql.Int, idProducto)
        .input('cantidad', sql.Int, cantidad)
        .input('precio', sql.Decimal(10, 2), precioUnitario)
        .input('subtotal', sql.Decimal(10, 2), subtotal)
        .query(`
          INSERT INTO Detalle_Pedido (Id_Pedido, Id_Producto, Cantidad, Precio_unitario, Subtotal)
          VALUES (@idPedido, @idProducto, @cantidad, @precio, @subtotal)
        `);
    }



    // Confirmar transacción antes de enviar respuesta
    await transaction.commit();

    res.json({ success: true, mensaje: 'Pedido creado con éxito', idPedido });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("❌ Error creando pedido:", error);
    res.status(500).json({ success: false, mensaje: 'Error creando pedido' });
  }
});


app.get('/pedidos', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("❌ Error obteniendo pedidos:", error);
    res.status(500).send('Error en el servidor');
  }
});

app.put('/actualizar-pedido', async (req, res) => {
  const { idPedido, idRepartidor, estado } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('idPedido', sql.Int, idPedido)
      .input('idRepartidor', sql.Int, idRepartidor)
      .input('estado', sql.NVarChar, estado)
      .query(`
        UPDATE Pedido
        SET Id_Repartidor = @idRepartidor,
            Estado = @estado
        WHERE Id_Pedido = @idPedido
      `);

    res.json({ success: true, mensaje: "Pedido actualizado" });

  } catch (error) {
    console.error("❌ Error actualizando pedido:", error);
    res.status(500).json({ success: false });
  }
});

app.get('/repartidores', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT Id_Repartidor, Nombre FROM Repartidor');
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error cargando repartidores:', err);
    res.status(500).send('Error al obtener repartidores');
  }
});


// ----------------------
// 🔎 Validar si el nombre ya existe
// ----------------------
app.get('/validar-nombre', async (req, res) => {
  const nombre = req.query.nombre;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('Nombre', sql.NVarChar, nombre)
      .query('SELECT COUNT(*) as total FROM Usuario WHERE Nombre = @Nombre');

    const existe = result.recordset[0].total > 0;
    res.json({ existe });
  } catch (err) {
    console.error("Error en /validar-nombre:", err);
    res.status(500).json({ error: "Error al validar nombre" });
  }
});

// ----------------------
// 🔎 Validar si el correo ya existe
// ----------------------
app.get('/validar-correo', async (req, res) => {
  const email = req.query.email;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('Email', sql.NVarChar, email)
      .query('SELECT COUNT(*) as total FROM Usuario WHERE Email = @Email');

    const existe = result.recordset[0].total > 0;
    res.json({ existe });
  } catch (err) {
    console.error("Error en /validar-correo:", err);
    res.status(500).json({ error: "Error al validar correo" });
  }
});

//-----------------Autenticacion de correo

/*const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

app.post('/registro-pendiente', async (req, res) => {
  const { nombre, email, contrasena } = req.body;
  const token = uuidv4();

  try {
    const pool = await sql.connect(config);

    await pool.request()
      .input('Nombre', sql.NVarChar, nombre)
      .input('Email', sql.NVarChar, email)
      .input('Contrasena', sql.NVarChar, contrasena)
      .input('Token', sql.UniqueIdentifier, token)
      .query(`
        INSERT INTO UsuariosPendientes (Nombre, Email, Contrasena, TokenConfirmacion)
        VALUES (@Nombre, @Email, @Contrasena, @Token)
      `);

    // Enviar email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'tucorreo@gmail.com',
        pass: 'tucontraseñaapp'
      }
    });

    const link = `http://localhost:3000/confirmar?token=${token}`;

    await transporter.sendMail({
      to: email,
      subject: 'Confirma tu correo electrónico',
      html: `<p>Hola ${nombre}, haz clic <a href="${link}">aquí</a> para confirmar tu registro.</p>`
    });

    res.json({ success: true, mensaje: "Verifica tu correo electrónico." });

  } catch (err) {
    console.error("❌ Error en registro-pendiente:", err);
    res.status(500).json({ success: false, mensaje: "Error al registrar." });
  }
});


app.get('/confirmar', async (req, res) => {
  const { email, token } = req.query;

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('Email', sql.NVarChar, email)
      .input('Token', sql.NVarChar, token)
      .query(`
        SELECT * FROM UsuariosPendientes
        WHERE Email = @Email AND Token = @Token AND FechaExpiracion > GETDATE()
      `);

    if (result.recordset.length === 0) {
      return res.send("❌ Token inválido o expirado.");
    }

    const { Nombre, Contrasena } = result.recordset[0];

    // Insertar en tabla Usuario
    await pool.request()
      .input('Nombre', sql.NVarChar, Nombre)
      .input('Email', sql.NVarChar, email)
      .input('Contrasena', sql.NVarChar, Contrasena)
      .query(`INSERT INTO Usuario (Nombre, Email, Contrasena) VALUES (@Nombre, @Email, @Contrasena)`);

    // Eliminar de UsuariosPendientes
    await pool.request()
      .input('Email', sql.NVarChar, email)
      .query(`DELETE FROM UsuariosPendientes WHERE Email = @Email`);

    res.send("✅ Correo confirmado correctamente. Ya puedes iniciar sesión.");
  } catch (err) {
    console.error("Error al confirmar:", err);
    res.status(500).send("❌ Error al confirmar el correo.");
  }
});*/

//------------Final


app.listen(3000, () => {
  console.log('Servidor en http://localhost:3000');
});