/*document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const usuario = localStorage.getItem("nombreUsuario");
  const correo = localStorage.getItem("correoUsuario");
  
  document.getElementById("nombre").value = usuario;
  document.getElementById("nombre").readOnly = true;

  document.getElementById("email").value = correo;
  document.getElementById("email").readOnly = true;
  

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // 1. Capturar datos del formulario
    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const nombreTarjeta = document.getElementById("nombreTarjeta").value.trim();
    const numeroTarjeta = document.getElementById("numeroTarjeta").value.trim();
    const mesExp = document.getElementById("mesExp").value.trim();
    const anioExp = document.getElementById("anioExp").value.trim();
    const cvv = document.getElementById("cvv").value.trim();

    // 2. Validación de campos
    if (!nombre || !email || !direccion || !telefono || !nombreTarjeta ||
        !numeroTarjeta || !mesExp || !anioExp || !cvv) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    if (!/^\d{16}$/.test(numeroTarjeta.replace(/\s/g, ''))) {
      alert("Número de tarjeta inválido. Debe tener 16 dígitos.");
      return;
    }

    if (!/^\d{4}$/.test(anioExp)) {
      alert("Año inválido.");
      return;
    }

    if (!/^\d{3}$/.test(cvv)) {
      alert("CVV inválido.");
      return;
    }

    // 3. Obtener productos del carrito
    const carrito = localStorage.getItem("carrito");
    if (!carrito) {
      alert("El carrito está vacío.");
      return;
    }

    const productos = JSON.parse(carrito);

    // 4. Calcular total
    const total = productos.reduce((sum, p) => {
      const precio = parseFloat(p.precio);
      const cantidad = parseInt(p.cantidad);
      const descuento = parseFloat(p.descuento) || 0;
      return sum + ((precio * cantidad) - descuento);
    }, 0);

    try {
      // 5. Registrar cliente
      await fetch("/agregarcliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, direccion, telefono })
      });

      // 6. Buscar idCliente
      const clienteRes = await fetch(`/buscar-cliente?nombre=${encodeURIComponent(nombre)}&telefono=${telefono}`);
      const clienteData = await clienteRes.json();
      const idCliente = clienteData?.idCliente;

      if (!idCliente) {
        alert("No se pudo registrar la venta: cliente no encontrado.");
        return;
      }

      // 7. Registrar venta y detalle de venta
      const ventaRes = await fetch("/registrar-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos, idCliente })
      });

      const ventaData = await ventaRes.json();
      if (!ventaData.success) {
        alert("❌ Error al registrar la venta.");
        return;
      }

      // 8. Restar stock
      await fetch("/restar-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos })
      });

      // 9. Limpiar carrito y redirigir
      alert("✅ Pago realizado con éxito. ¡Gracias por tu compra!");
      // 8.5 Guardar datos cifrados del pago
      await fetch("/guardar-datos-cifrados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          email,
          direccion,
          telefono,
          nombreTarjeta,
          numeroTarjeta,
          mesExp,
          anioExp,
          cvv
        })
      });

      localStorage.removeItem("carrito");
      localStorage.removeItem(`carrito_${usuario}`);
      window.location.href = "productos.html";

    } catch (error) {
      console.error("❌ Error en el proceso de pago:", error);
      alert("Error al procesar el pago.");
    }
  });
});*/

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("form");

  try{
    const correo = localStorage.getItem("correoUsuario");
    const res = await fetch(`/obtener-datos-cifrados?email=${encodeURIComponent(correo)}`);
    const data = await res.json();

    if (data.success) {
      document.getElementById("nombreTarjeta").value = data.datos.nombreTarjeta;
      document.getElementById("numeroTarjeta").value = data.datos.numeroTarjeta;
      document.getElementById("mesExp").value = data.datos.mesExp;
      document.getElementById("cvv").value = data.datos.cvv;
    }

  } catch (err) {
    console.error("❌ Error al cargar datos cifrados:", err);
  }

  const usuario = localStorage.getItem("nombreUsuario");
  const correo = localStorage.getItem("correoUsuario");

  document.getElementById("nombre").value = usuario;
  document.getElementById("nombre").readOnly = true;

  document.getElementById("email").value = correo;
  document.getElementById("email").readOnly = true;

  const telefonoInput = document.getElementById("telefono");

telefonoInput.addEventListener("input", (e) => {
  const input = e.target;
  const cursorPos = input.selectionStart;
  let raw = input.value.replace(/\D/g, '').substring(0, 8); // Solo 8 dígitos

  let formatted = '';
  if (raw.length > 4) {
    formatted = raw.slice(0, 4) + ' ' + raw.slice(4);
  } else {
    formatted = raw;
  }

  // Detecta si se agregó un espacio justo después del 4° dígito
  const espacioAgregado = raw.length === 5 && !input.value.includes(' ');

  input.value = formatted;

  // Ajustar cursor
  if (espacioAgregado) {
    input.setSelectionRange(cursorPos + 1, cursorPos + 1);
  } else if (cursorPos <= input.value.length) {
    input.setSelectionRange(cursorPos, cursorPos);
  } else {
    input.setSelectionRange(input.value.length, input.value.length);
  }
});

// Validación para impedir letras y espacios en el número de tarjeta
const numeroTarjetaInput = document.getElementById("numeroTarjeta");
numeroTarjetaInput.addEventListener("input", function (e) {
  // Elimina letras y espacios
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

// Validación para impedir letras y espacios en el CVV
const cvvInput = document.getElementById("cvv");
cvvInput.addEventListener("input", function (e) {
  // Elimina letras y espacios y limita a 3 dígitos
  e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
});

const nombreTarjetaInput = document.getElementById("nombreTarjeta");

nombreTarjetaInput.addEventListener("input", function (e) {
  // Permitir solo letras, espacios, apóstrofes y guiones
  e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/g, '');
});


  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // 1. Capturar datos del formulario
    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const nombreTarjeta = document.getElementById("nombreTarjeta").value.trim();
    const numeroTarjeta = document.getElementById("numeroTarjeta").value.trim();
    const mesExp = document.getElementById("mesExp").value.trim();
    const cvv = document.getElementById("cvv").value.trim();

    // 2. Validaciones

    // Validación de campos vacíos
    if (!nombre || !email || !direccion || !telefono || !nombreTarjeta ||
        !numeroTarjeta || !mesExp || !cvv) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    // Validación de número de tarjeta: exactamente 16 dígitos, sin espacios
    const tarjetaSinEspacios = numeroTarjeta.replace(/\s/g, "");
    if (!/^\d{16}$/.test(tarjetaSinEspacios)) {
      alert("Número de tarjeta inválido. Debe tener 16 dígitos.");
      return;
    }

    // Validación de CVV: exactamente 3 dígitos
    if (!/^\d{3}$/.test(cvv)) {
      alert("CVV inválido. Debe tener exactamente 3 dígitos.");
      return;
    }

    // Validaciones del telefono
     // Elimina el espacio antes de validar
    const telefonoSinEspacios = telefono.replace(/\s/g, '');

    // Verifica que tenga exactamente 8 dígitos
    if (!/^\d{8}$/.test(telefonoSinEspacios)) {
      alert("El número de celular debe tener exactamente 8 dígitos.");
      return;
    }

    // Verifica que empiece con 5, 7, 8 o 9
    if (!/^[5789]/.test(telefonoSinEspacios)) {
      alert("El número de celular debe comenzar con 5, 7, 8 o 9.");
      return;
    }

    // Validación de fecha de vencimiento
    const hoy = new Date();
    const [anio, mes] = mesExp.split("-").map(Number);
    // Mes en Date es 0-based, por eso restamos 1
    const fechaExp = new Date(anio, mes - 1);

    // Extraemos año y mes actuales para comparación
    const anioHoy = hoy.getFullYear();
    const mesHoy = hoy.getMonth();

    if (anio < anioHoy || (anio === anioHoy && (mes - 1) < mesHoy)) {
      alert("La tarjeta está vencida.");
      return;
    }


    // 3. Obtener productos del carrito
    const carrito = localStorage.getItem("carrito");
    if (!carrito) {
      alert("El carrito está vacío.");
      return;
    }

    const productos = JSON.parse(carrito);

    // 4. Calcular total
    const total = productos.reduce((sum, p) => {
      const precio = parseFloat(p.precio);
      const cantidad = parseInt(p.cantidad);
      const descuento = parseFloat(p.descuento) || 0;
      return sum + ((precio * cantidad) - descuento);
    }, 0);

    try {
      // Obtener idUsuario desde la tabla Usuario
      const usuarioRes = await fetch(`/buscar-usuario?nombre=${encodeURIComponent(nombre)}&email=${encodeURIComponent(email)}`);
      const usuarioData = await usuarioRes.json();

      console.log("Respuesta /buscar-usuario:", usuarioData);
      const idUsuario = usuarioData?.idUsuario;

      

      if (!idUsuario) {
        alert("No se pudo registrar la venta: usuario no encontrado.");
        return;
      }

      // 7. Registrar venta y detalles
      const ventaRes = await fetch("/registrar-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos, idUsuario })
      });

      const ventaData = await ventaRes.json();
      if (!ventaData.success) {
        alert("❌ Error al registrar la venta.");
        return;
      }

      // 8. Restar stock
      await fetch("/restar-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos })
      });

      if (!nombre || !email || !nombreTarjeta || !numeroTarjeta || !mesExp || !cvv) {
        return res.status(400).json({ success: false, mensaje: "Faltan datos para cifrar." });
      }
      // 9. Guardar datos cifrados
      await fetch("/guardar-datos-cifrados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          email,
          nombreTarjeta,
          numeroTarjeta,
          mesExp,
          cvv
        })
      });

      //Descifrar

      const correo = localStorage.getItem("correoUsuario");
      const res = await fetch(`/obtener-datos-cifrados?email=${encodeURIComponent(correo)}`);
      const data = await res.json();

      if (data.success) {
        document.getElementById("nombreTarjeta").value = data.datos.nombreTarjeta;
        document.getElementById("numeroTarjeta").value = data.datos.numeroTarjeta;
        document.getElementById("mesExp").value = data.datos.mesExp;
        document.getElementById("cvv").value = data.datos.cvv;
      }

     const direccion = document.getElementById("direccion").value;
      const telefono = document.getElementById("telefono").value;
      const carritoData = JSON.parse(localStorage.getItem("carrito_" + nombre)) || [];

      const productosmod = carritoData.map(p => ({
        nombre: p.nombre,             // Asegúrate que "id" sea igual a "Id_Producto"
        cantidad: p.cantidad,
        precioUnitario: parseFloat(p.precio.replace('$', '').trim())
      }));

      await fetch('/crear-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUsuario,         // ✅ Este es el ID real obtenido del backend
          direccion,
          telefono,
          carrito: productosmod
        })
      });



      // 10. Limpiar y redirigir
      alert("✅ Pago realizado con éxito. ¡Gracias por tu compra!");
      localStorage.removeItem("carrito");
      localStorage.removeItem(`carrito_${usuario}`);
      window.location.href = "productos.html";

    } catch (error) {
      console.error("❌ Error en el proceso de pago:", error);
      alert("Error al procesar el pago.");
    }

  });
});


