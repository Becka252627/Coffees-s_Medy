require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_URL = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// PostgreSQL: en Render se recomienda usar DATABASE_URL (Internal Database URL
// si el servicio web y la base de datos están en la misma región).
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
      max: Number(process.env.PGPOOL_MAX || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'DB_CoffeesMedy',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
      max: Number(process.env.PGPOOL_MAX || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };

const pool = new Pool(poolConfig);
pool.on('error', (err) => console.error('Error inesperado en el pool PostgreSQL:', err));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function inTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) {
      console.error('Error al revertir transacción:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

function sendDbError(res, error, context) {
  console.error(`${context}:`, error);
  if (error instanceof HttpError) {
    return res.status(error.status).json({ success: false, mensaje: error.message });
  }
  if (error.code === '23505') {
    return res.status(409).json({ success: false, mensaje: 'Ya existe un registro con esos datos.' });
  }
  if (error.code === '23503') {
    return res.status(409).json({ success: false, mensaje: 'No se puede completar la operación porque el registro está relacionado con otros datos.' });
  }
  if (error.code === '23514' || error.code === '22P02' || error.code === '22003') {
    return res.status(400).json({ success: false, mensaje: 'Los datos enviados no son válidos.' });
  }
  return res.status(500).json({ success: false, mensaje: 'Error en el servidor o en la base de datos.' });
}

function parsePositiveInt(value) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function hashPassword(password) {
  // Formato menor de 100 caracteres para ser compatible con columnas VARCHAR(100).
  const salt = crypto.randomBytes(12).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (typeof storedPassword !== 'string') return false;
  if (storedPassword.startsWith('scrypt$')) {
    const parts = storedPassword.split('$');
    if (parts.length !== 3) return false;
    const [, salt, storedHash] = parts;
    const calculated = crypto.scryptSync(String(password), salt, 32);
    const expected = Buffer.from(storedHash, 'hex');
    return calculated.length === expected.length && crypto.timingSafeEqual(calculated, expected);
  }
  // Compatibilidad temporal con contraseñas antiguas que ya estaban guardadas
  // en texto plano. Se convierten a hash al iniciar sesión correctamente.
  const supplied = Buffer.from(String(password));
  const stored = Buffer.from(storedPassword);
  return supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
}




async function insertCustomerUser(client, { nombre, email, contrasena, token }) {

  const role = await client.query(
    `SELECT id_rol
     FROM rol
     WHERE LOWER(tipo_rol) = LOWER($1)
     LIMIT 1`,
    ['Usuario']
  );

  if (!role.rowCount) {
    throw new Error("No existe el rol 'Usuario' en la tabla rol.");
  }

  await client.query(
    `INSERT INTO usuario
      (nombre, email, contrasena, id_rol, tokenverificacion, verificado)
     VALUES ($1, $2, $3, $4, $5, FALSE)`,
    [
      nombre,
      email,
      hashPassword(contrasena),
      role.rows[0].id_rol,
      token
    ]
  );
}


// Inicio
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'principal.html'));
});

// -----------------------------------------------------------------------------
// REPARTIDORES
// -----------------------------------------------------------------------------
app.get('/repartidores', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id_repartidor AS "Id_Repartidor",
        r.nombre AS "Nombre",
        r.cedula AS "Cedula",
        i.img_url AS "Foto_Perfil",
        r.fecha_nacimiento AS "Fecha_Nacimiento",
        r.edad AS "Edad"
      FROM vista_repartidor r
      INNER JOIN imagen i ON i.id_imagen = r.id_imagen
      ORDER BY r.id_repartidor
    `);
    res.json(result.rows);
  } catch (error) {
    sendDbError(res, error, 'Error al obtener repartidores');
  }
});

app.post('/agregarrepartidores', async (req, res) => {
  const { nombre, cedula, imagen } = req.body;
  if (!nombre || !cedula || !imagen) {
    return res.status(400).json({ success: false, mensaje: 'Nombre, cédula e imagen son obligatorios.' });
  }
  try {
    const nuevo = await inTransaction(async client => {
      const imageResult = await client.query(
        'INSERT INTO imagen (img_url) VALUES ($1) RETURNING id_imagen', [imagen]
      );
      const result = await client.query(
        `INSERT INTO repartidor (nombre, cedula, id_imagen)
         VALUES ($1, $2, $3) RETURNING id_repartidor`,
        [nombre, cedula, imageResult.rows[0].id_imagen]
      );
      return result.rows[0];
    });
    res.json({ success: true, idRepartidor: nuevo.id_repartidor });
  } catch (error) {
    sendDbError(res, error, 'Error al agregar repartidor');
  }
});

app.put('/editarrepartidor/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  const { nombre, cedula, imagen } = req.body;
  if (!id) return res.status(400).json({ success: false, mensaje: 'Identificador inválido.' });
  if (!nombre || !cedula) return res.status(400).json({ success: false, mensaje: 'Nombre y cédula son obligatorios.' });

  try {
    await inTransaction(async client => {
      const current = await client.query(
        'SELECT id_imagen FROM repartidor WHERE id_repartidor = $1 FOR UPDATE', [id]
      );
      if (!current.rowCount) throw new HttpError(404, 'Repartidor no encontrado.');
      if (imagen !== undefined && imagen !== null && imagen !== '') {
        await client.query('UPDATE imagen SET img_url = $1 WHERE id_imagen = $2', [imagen, current.rows[0].id_imagen]);
      }
      await client.query(
        'UPDATE repartidor SET nombre = $1, cedula = $2 WHERE id_repartidor = $3',
        [nombre, cedula, id]
      );
    });
    res.json({ success: true });
  } catch (error) {
    sendDbError(res, error, 'Error al editar repartidor');
  }
});

app.delete('/eliminarrepartidor/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ success: false, mensaje: 'Identificador inválido.' });
  try {
    await inTransaction(async client => {
      const current = await client.query(
        'SELECT id_imagen FROM repartidor WHERE id_repartidor = $1 FOR UPDATE', [id]
      );
      if (!current.rowCount) throw new HttpError(404, 'Repartidor no encontrado.');
      await client.query('DELETE FROM repartidor WHERE id_repartidor = $1', [id]);
      await client.query('DELETE FROM imagen WHERE id_imagen = $1', [current.rows[0].id_imagen]);
    });
    res.json({ success: true });
  } catch (error) {
    sendDbError(res, error, 'Error al eliminar repartidor');
  }
});

// -----------------------------------------------------------------------------
// PRODUCTOS, CATEGORÍAS E INVENTARIO
// -----------------------------------------------------------------------------
app.get('/calcular-subtotal', async (req, res) => {
  const precio = Number(req.query.precio);
  const cantidad = parsePositiveInt(req.query.cantidad);
  if (!Number.isFinite(precio) || precio < 0 || !cantidad) {
    return res.status(400).json({ success: false, mensaje: 'Precio o cantidad inválidos.' });
  }
  try {
    const result = await pool.query(
      'SELECT calcularsubtotal($1::numeric, $2::integer) AS subtotal', [precio, cantidad]
    );
    res.json({ subtotal: result.rows[0].subtotal });
  } catch (error) {
    sendDbError(res, error, 'Error al calcular subtotal');
  }
});

app.post('/restar-stock', async (req, res) => {
  const { productos } = req.body;
  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ mensaje: 'No hay productos.' });
  }
  try {
    await inTransaction(async client => {
      for (const item of productos) {
        const cantidad = parsePositiveInt(item.cantidad);
        if (!cantidad) throw new HttpError(400, `Cantidad inválida para ${item.nombre || item.idProducto}.`);
        let result;
        if (parsePositiveInt(item.idProducto)) {
          result = await client.query(
            `UPDATE producto SET stock = stock - $1
             WHERE id_producto = $2 AND stock >= $1 RETURNING id_producto`,
            [cantidad, Number(item.idProducto)]
          );
        } else if (item.nombre) {
          result = await client.query(
            `UPDATE producto SET stock = stock - $1
             WHERE id_producto = (
               SELECT id_producto FROM producto WHERE nombre = $2 ORDER BY id_producto LIMIT 1
             ) AND stock >= $1 RETURNING id_producto`,
            [cantidad, item.nombre]
          );
        } else {
          throw new HttpError(400, 'Cada producto debe incluir idProducto o nombre.');
        }
        if (!result.rowCount) throw new HttpError(409, `Producto inexistente o stock insuficiente: ${item.nombre || item.idProducto}.`);
      }
    });
    res.json({ mensaje: 'Compra realizada correctamente.' });
  } catch (error) {
    sendDbError(res, error, 'Error en /restar-stock');
  }
});

app.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_categoria AS "Id_Categoria", nombre AS "Nombre" FROM categoria ORDER BY id_categoria'
    );
    res.json(result.rows);
  } catch (error) {
    sendDbError(res, error, 'Error al obtener categorías');
  }
});

app.get('/productos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id_producto AS "Id_producto",
        p.nombre AS "Nombre",
        p.precio AS "Precio",
        p.stock AS "Stock",
        i.img_url AS "Imagen",
        c.nombre AS "Categoria"
      FROM producto p
      INNER JOIN imagen i ON i.id_imagen = p.id_imagen
      INNER JOIN categoria c ON c.id_categoria = p.id_categoria
      ORDER BY p.id_producto
    `);
    res.json(result.rows);
  } catch (error) {
    sendDbError(res, error, 'Error al obtener productos');
  }
});

app.post('/agregarproductos', async (req, res) => {
  const { nombre, precio, categoria, imagen, stock } = req.body;
  const price = Number(precio);
  const stockNumber = Number(stock);
  if (!nombre || !categoria || !imagen || !Number.isFinite(price) || price < 0 || !Number.isInteger(stockNumber) || stockNumber < 0) {
    return res.status(400).json({ success: false, mensaje: 'Datos del producto incompletos o inválidos.' });
  }
  try {
    const idProducto = await inTransaction(async client => {
      const category = await client.query('SELECT id_categoria FROM categoria WHERE nombre = $1', [categoria]);
      if (!category.rowCount) throw new HttpError(400, 'La categoría no existe en la base de datos.');
      const image = await client.query('INSERT INTO imagen (img_url) VALUES ($1) RETURNING id_imagen', [imagen]);
      const product = await client.query(
        `INSERT INTO producto (nombre, precio, stock, id_imagen, id_categoria)
         VALUES ($1, $2, $3, $4, $5) RETURNING id_producto`,
        [nombre, price, stockNumber, image.rows[0].id_imagen, category.rows[0].id_categoria]
      );
      return product.rows[0].id_producto;
    });
    res.json({ success: true, idProducto });
  } catch (error) {
    sendDbError(res, error, 'Error al insertar producto');
  }
});

app.put('/editarproducto/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  const { nombre, precio, categoria, imagen, stock } = req.body;
  const price = Number(precio);
  const stockNumber = Number(stock);
  if (!id) return res.status(400).json({ success: false, mensaje: 'Identificador inválido.' });
  if (!nombre || !categoria || !Number.isFinite(price) || price < 0 || !Number.isInteger(stockNumber) || stockNumber < 0) {
    return res.status(400).json({ success: false, mensaje: 'Datos del producto incompletos o inválidos.' });
  }
  try {
    await inTransaction(async client => {
      const category = await client.query('SELECT id_categoria FROM categoria WHERE nombre = $1', [categoria]);
      if (!category.rowCount) throw new HttpError(400, 'Categoría no encontrada.');
      const current = await client.query('SELECT id_imagen FROM producto WHERE id_producto = $1 FOR UPDATE', [id]);
      if (!current.rowCount) throw new HttpError(404, 'Producto no encontrado.');
      if (imagen !== undefined && imagen !== null && imagen !== '') {
        await client.query('UPDATE imagen SET img_url = $1 WHERE id_imagen = $2', [imagen, current.rows[0].id_imagen]);
      }
      await client.query(
        `UPDATE producto SET nombre = $1, precio = $2, stock = $3, id_categoria = $4
         WHERE id_producto = $5`,
        [nombre, price, stockNumber, category.rows[0].id_categoria, id]
      );
    });
    res.json({ success: true });
  } catch (error) {
    sendDbError(res, error, 'Error al editar producto');
  }
});

app.delete('/eliminarproducto/:id', async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ success: false, mensaje: 'Identificador inválido.' });
  try {
    await inTransaction(async client => {
      const current = await client.query('SELECT id_imagen FROM producto WHERE id_producto = $1 FOR UPDATE', [id]);
      if (!current.rowCount) throw new HttpError(404, 'Producto no encontrado.');
      await client.query('DELETE FROM producto WHERE id_producto = $1', [id]);
      await client.query('DELETE FROM imagen WHERE id_imagen = $1', [current.rows[0].id_imagen]);
    });
    res.json({ success: true });
  } catch (error) {
    sendDbError(res, error, 'Error al eliminar producto');
  }
});

// -----------------------------------------------------------------------------
// AUTENTICACIÓN Y USUARIOS
// -----------------------------------------------------------------------------
app.post('/login', async (req, res) => {
  const { email, contrasena } = req.body;
  if (!email || !contrasena) return res.status(400).json({ success: false, mensaje: 'Correo y contraseña son obligatorios.' });
  try {
    const result = await pool.query(
      'SELECT * FROM usuario WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]
    );
    if (!result.rowCount) return res.json({ success: false, mensaje: 'Correo incorrecto o no registrado.' });
    const usuario = result.rows[0];
    if (!verifyPassword(contrasena, usuario.contrasena)) {
      return res.json({ success: false, mensaje: 'Contraseña incorrecta.' });
    }
    /*if (usuario.verificado === false || usuario.verificado === 0) {
      return res.json({ success: false, mensaje: 'Tu cuenta no está verificada. Por favor revisa tu correo.' });
    }*/
    if (!String(usuario.contrasena).startsWith('scrypt$')) {
      await pool.query('UPDATE usuario SET contrasena = $1 WHERE id_usuario = $2', [hashPassword(contrasena), usuario.id_usuario]);
    }
    return res.json({
      success: true,
      mensaje: 'Inicio de sesión exitoso',
      nombre: usuario.nombre,
      email: usuario.email
    });
  } catch (error) {
    sendDbError(res, error, 'Error en login');
  }
});



app.post('/registro', async (req, res) => {
  const { nombre, email, contrasena } = req.body;

  if (!nombre || !email || !contrasena) {
    return res.status(400).json({
      success: false,
      mensaje: 'Campos incompletos.'
    });
  }

  if (String(contrasena).length < 8) {
    return res.status(400).json({
      success: false,
      mensaje: 'La contraseña debe tener al menos 8 caracteres.'
    });
  }

  try {
    const existing = await pool.query(
      `SELECT 1 FROM usuario
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (existing.rowCount) {
      return res.status(409).json({
        success: false,
        mensaje: 'Ese correo ya está registrado.'
      });
    }

    await inTransaction(async client => {
      await insertCustomerUser(client, {
        nombre,
        email,
        contrasena,
        token: null
      });

      await client.query(
        `UPDATE usuario
         SET verificado = TRUE,
             tokenverificacion = NULL
         WHERE LOWER(email) = LOWER($1)`,
        [email]
      );
    });

    return res.status(201).json({
      success: true,
      mensaje: 'Registro exitoso. Ya puedes iniciar sesión.',
      nombre,
      email
    });

  } catch (error) {
    sendDbError(res, error, 'Error en /registro');
  }
});



app.get('/verificar', async (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) return res.status(400).send('Faltan datos para verificar.');
  try {
    const result = await pool.query(
      `UPDATE usuario SET verificado = TRUE, tokenverificacion = NULL
       WHERE LOWER(email) = LOWER($1) AND tokenverificacion = $2
       RETURNING id_usuario`,
      [email, token]
    );
    if (!result.rowCount) return res.status(400).send('Verificación inválida o ya utilizada.');
    return res.send('Cuenta verificada correctamente. Ya puedes iniciar sesión.');
  } catch (error) {
    console.error('Error detallado de verificación:', error);
    return res.status(500).send('Error del servidor al verificar la cuenta.');
  }
});

app.get('/buscar-usuario', async (req, res) => {
  const { nombre, email } = req.query;
  if (!nombre || !email) return res.status(400).json({ idUsuario: null });
  try {
    const result = await pool.query(
      `SELECT id_usuario AS "Id_Usuario" FROM usuario
       WHERE nombre = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
      [nombre, email]
    );
    res.json({ idUsuario: result.rowCount ? result.rows[0].Id_Usuario : null });
  } catch (error) {
    sendDbError(res, error, 'Error al buscar usuario');
  }
});

app.get('/validar-nombre', async (req, res) => {
  const nombre = req.query.nombre;
  if (!nombre) return res.status(400).json({ existe: false });
  try {
    const result = await pool.query('SELECT COUNT(*)::int AS total FROM usuario WHERE LOWER(nombre) = LOWER($1)', [nombre]);
    res.json({ existe: result.rows[0].total > 0 });
  } catch (error) {
    sendDbError(res, error, 'Error en /validar-nombre');
  }
});

app.get('/validar-correo', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ existe: false });
  try {
    const result = await pool.query('SELECT COUNT(*)::int AS total FROM usuario WHERE LOWER(email) = LOWER($1)', [email]);
    res.json({ existe: result.rows[0].total > 0 });
  } catch (error) {
    sendDbError(res, error, 'Error en /validar-correo');
  }
});

// -----------------------------------------------------------------------------
// VENTAS Y VOUCHERS
// -----------------------------------------------------------------------------
app.post('/registrar-venta', async (req, res) => {
  const { productos, idUsuario } = req.body;
  const userId = parsePositiveInt(idUsuario);
  if (!Array.isArray(productos) || productos.length === 0 || !userId) {
    return res.status(400).json({ mensaje: 'Faltan datos para registrar la venta.' });
  }
  try {
    const idVenta = await inTransaction(async client => {
      let total = 0;
      const lineItems = [];
      for (const item of productos) {
        const cantidad = parsePositiveInt(item.cantidad);
        const descuento = Number(item.descuento || 0);
        if (!cantidad || !Number.isFinite(descuento) || descuento < 0) {
          throw new HttpError(400, 'Cantidad o descuento inválido.');
        }
        let productResult;
        if (parsePositiveInt(item.idProducto)) {
          productResult = await client.query(
            'SELECT id_producto, nombre, precio FROM producto WHERE id_producto = $1', [Number(item.idProducto)]
          );
        } else {
          productResult = await client.query(
            'SELECT id_producto, nombre, precio FROM producto WHERE nombre = $1 ORDER BY id_producto LIMIT 1', [item.nombre]
          );
        }
        if (!productResult.rowCount) throw new HttpError(400, `Producto no encontrado: ${item.nombre || item.idProducto}.`);
        const product = productResult.rows[0];
        const subtotalResult = await client.query(
          'SELECT calcularsubtotal($1::numeric, $2::integer) AS subtotal', [product.precio, cantidad]
        );
        const subtotal = Number(subtotalResult.rows[0].subtotal);
        const totalResult = await client.query(
          'SELECT calculartotal($1::numeric, $2::integer, $3::numeric) AS total',
          [product.precio, cantidad, descuento]
        );
        total += Number(totalResult.rows[0].total);
        lineItems.push({ idProducto: product.id_producto, cantidad, precio: product.precio, descuento, subtotal });
      }

      const sale = await client.query(
        `INSERT INTO venta (id_usuario, fecha_venta, total)
         VALUES ($1, CURRENT_DATE, $2) RETURNING id_venta`,
        [userId, total]
      );
      const saleId = sale.rows[0].id_venta;
      for (const item of lineItems) {
        await client.query(
          `INSERT INTO detalle_venta
             (id_venta, id_producto, cantidad, precio_unitario, descuento, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [saleId, item.idProducto, item.cantidad, item.precio, item.descuento, item.subtotal]
        );
      }
      return saleId;
    });
    res.json({ success: true, mensaje: 'Venta y detalle guardados correctamente.', idVenta });
  } catch (error) {
    sendDbError(res, error, 'Error al guardar venta');
  }
});

const voucherSelect = `
  SELECT
    v.id_venta AS "Id_Venta",
    u.nombre AS "Nombre",
    p.nombre AS "Producto",
    dv.cantidad AS "Cantidad",
    dv.precio_unitario AS "Precio_Unitario",
    dv.descuento AS "Descuento",
    dv.subtotal AS "Subtotal",
    v.fecha_venta AS "Fecha_Venta",
    v.total AS "Total"
  FROM venta v
  INNER JOIN usuario u ON u.id_usuario = v.id_usuario
  INNER JOIN detalle_venta dv ON dv.id_venta = v.id_venta
  INNER JOIN producto p ON p.id_producto = dv.id_producto`;

app.get('/vouchers', async (req, res) => {
  try {
    const result = await pool.query(`${voucherSelect} ORDER BY v.id_venta`);
    res.json(result.rows);
  } catch (error) {
    sendDbError(res, error, 'Error al obtener vouchers');
  }
});

app.get('/vouchers_compras', async (req, res) => {
  const nombre = String(req.query.nombre || '').trim();
  if (!nombre) return res.status(400).json({ success: false, mensaje: 'Falta el nombre del usuario.' });
  try {
    const result = await pool.query(
      `${voucherSelect} WHERE u.nombre ILIKE $1 ORDER BY v.id_venta`, [`%${nombre}%`]
    );
    res.json(result.rows);
  } catch (error) {
    sendDbError(res, error, 'Error en /vouchers_compras');
  }
});

// -----------------------------------------------------------------------------
// DATOS DE TARJETA: no se almacenan números completos ni CVV.
// Se conserva la ruta para que el frontend reciba un mensaje explícito y pueda
// retirar el antiguo flujo de guardar/recuperar datos de tarjetas.
// -----------------------------------------------------------------------------
app.post('/guardar-datos-cifrados', (req, res) => {
  return res.status(410).json({
    success: false,
    mensaje: 'Por seguridad no almacenamos números completos de tarjeta ni CVV. Utiliza un proveedor de pagos que gestione los datos de tarjeta mediante tokenización.'
  });
});

app.get('/obtener-datos-cifrados', (req, res) => {
  return res.status(410).json({
    success: false,
    mensaje: 'La recuperación de datos de tarjeta fue deshabilitada por seguridad. No guardes ni solicites el CVV.'
  });
});

// -----------------------------------------------------------------------------
// PEDIDOS
// -----------------------------------------------------------------------------
app.post('/crear-pedido', async (req, res) => {
  const { idUsuario, direccion, telefono, carrito } = req.body;
  const userId = parsePositiveInt(idUsuario);
  if (!userId || !direccion || !telefono || !Array.isArray(carrito) || carrito.length === 0) {
    return res.status(400).json({ success: false, mensaje: 'Datos del pedido incompletos.' });
  }
  try {
    const idPedido = await inTransaction(async client => {
      const pedido = await client.query(
        `INSERT INTO pedido (id_usuario, direccion, telefono, estado)
         VALUES ($1, $2, $3, 'Pendiente') RETURNING id_pedido`,
        [userId, direccion, telefono]
      );
      const orderId = pedido.rows[0].id_pedido;
      for (const item of carrito) {
        const cantidad = parsePositiveInt(item.cantidad);
        if (!cantidad) throw new HttpError(400, `Cantidad inválida: ${item.cantidad}.`);
        let product;
        if (parsePositiveInt(item.idProducto)) {
          product = await client.query(
            'SELECT id_producto, precio FROM producto WHERE id_producto = $1 FOR SHARE', [Number(item.idProducto)]
          );
        } else if (item.nombre) {
          product = await client.query(
            'SELECT id_producto, precio FROM producto WHERE nombre = $1 ORDER BY id_producto LIMIT 1 FOR SHARE', [item.nombre]
          );
        } else {
          throw new HttpError(400, 'Cada artículo debe incluir idProducto o nombre.');
        }
        if (!product.rowCount) throw new HttpError(400, `Producto no encontrado: ${item.nombre || item.idProducto}.`);
        const row = product.rows[0];
        const subtotal = Number(row.precio) * cantidad;
        await client.query(
          `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, row.id_producto, cantidad, row.precio, subtotal]
        );
      }
      return orderId;
    });
    res.json({ success: true, mensaje: 'Pedido creado con éxito.', idPedido });
  } catch (error) {
    sendDbError(res, error, 'Error creando pedido');
  }
});

app.get('/pedidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id_pedido AS "Id_Pedido",
        u.nombre AS "Cliente",
        r.nombre AS "Repartidor",
        p.direccion AS "Direccion",
        p.telefono AS "Telefono",
        p.fecha_pedido AS "Fecha_pedido",
        p.estado AS "Estado"
      FROM pedido p
      INNER JOIN usuario u ON u.id_usuario = p.id_usuario
      LEFT JOIN repartidor r ON r.id_repartidor = p.id_repartidor
      ORDER BY p.id_pedido DESC
    `);
    res.json(result.rows);
  } catch (error) {
    sendDbError(res, error, 'Error obteniendo pedidos');
  }
});

app.put('/actualizar-pedido', async (req, res) => {
  const { idPedido, idRepartidor, estado } = req.body;
  const orderId = parsePositiveInt(idPedido);
  const deliveryId = idRepartidor === null || idRepartidor === '' || Number(idRepartidor) === 0
    ? null : parsePositiveInt(idRepartidor);
  const allowedStates = ['Pendiente', 'Enviado', 'Entregado', 'Cancelado'];
  if (!orderId || !allowedStates.includes(estado) || (idRepartidor && !deliveryId)) {
    return res.status(400).json({ success: false, mensaje: 'Datos de actualización inválidos.' });
  }
  try {
    const result = await pool.query(
      `UPDATE pedido SET id_repartidor = $1, estado = $2
       WHERE id_pedido = $3 RETURNING id_pedido`,
      [deliveryId, estado, orderId]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, mensaje: 'Pedido no encontrado.' });
    res.json({ success: true, mensaje: 'Pedido actualizado.' });
  } catch (error) {
    sendDbError(res, error, 'Error actualizando pedido');
  }
});

// -----------------------------------------------------------------------------
// INICIO Y CIERRE
// -----------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

async function shutdown() {
  console.log('Cerrando servidor...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
