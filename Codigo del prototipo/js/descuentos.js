// Lista de productos con descuentos (puedes modificar o cargar desde backend)
const productos = [
  {
    nombre: "Frappé Oreo",
    descripcion: "Delicioso frappe de Oreo con 20% de descuento.",
    precioOriginal: 5.00,
    descuento: 20, // porcentaje
    imagen: "img/frappe de oreo.jpg"
  },
  {
    nombre: "Chocoflan",
    descripcion: "Postre con 10% de descuento.",
    precioOriginal: 3.00,
    descuento: 10,
    imagen: "img/chocoflan.jpg"
  },
  {
    nombre: "Desayuno tradicional",
    descripcion: "50% de descuento para un desayuno delicioso.",
    precioOriginal: 2.00,
    descuento: 50,
    imagen: "img/desayuno tradicional.jpg"
  },
  {
    nombre: "Café Expreso",
    descripcion: "Sin descuento especial.",
    precioOriginal: 3.00,
    descuento: 0,
    imagen: "img/cafe expreso.jpg"
  }
];

// Contenedores HTML
const contenedorProductos = document.getElementById("seccion-descuentos");
const cartIcon = document.getElementById("cart-icon");
const cart = document.querySelector(".cart");
const closeCartBtn = document.getElementById("close-cart");
const cartContent = document.querySelector(".cart-content");
const totalPriceEl = document.querySelector(".total-price");
const btnComprar = document.querySelector(".btn-comprar");

// Estado del carrito
let carrito = [];

// Mostrar productos en la página
function mostrarProductos() {
  contenedorProductos.innerHTML = "";
  productos.forEach(p => {
    const precioFinal = p.descuento > 0
      ? (p.precioOriginal * (1 - p.descuento / 100)).toFixed(2)
      : p.precioOriginal.toFixed(2);

    const descuentoHtml = p.descuento > 0 ? `<div class="descuento">-${p.descuento}%</div>` : "";

    const precioHtml = p.descuento > 0
      ? `<span class="precio-final">$${precioFinal}</span> <span class="precio-original">$${p.precioOriginal.toFixed(2)}</span>`
      : `<span class="precio-final">$${p.precioOriginal.toFixed(2)}</span>`;

    const productoHtml = `
      <div class="producto">
        <img src="${p.imagen}" alt="${p.nombre}" />
        ${descuentoHtml}
        <h2>${p.nombre}</h2>
        <p>${p.descripcion}</p>
        <div class="precio">${precioHtml}</div>
        <button class="btn-agregar" data-nombre="${p.nombre}" data-precio="${precioFinal}" data-descuento="${p.descuento}">Agregar al carrito</button>
      </div>
    `;

    contenedorProductos.insertAdjacentHTML("beforeend", productoHtml);
  });
}

// Mostrar carrito en la UI
function mostrarCarrito() {
  cartContent.innerHTML = "";

  if (carrito.length === 0) {
    cartContent.innerHTML = `<p>El carrito está vacío</p>`;
    totalPriceEl.textContent = "$0";
    return;
  }

  let total = 0;
  carrito.forEach(item => {
    const subtotal = (item.precio * item.cantidad).toFixed(2);
    total += parseFloat(subtotal);

    const descuentoHtml = item.descuento > 0 ? `<small>-${item.descuento}%</small>` : "";

    const itemHtml = `
      <div class="cart-item">
        <img src="${item.imagen}" alt="${item.nombre}" />
        <div class="content-item">
          <h3>${item.nombre} ${descuentoHtml}</h3>
          <div class="cantidad-control">
            <button class="btn-disminuir" data-nombre="${item.nombre}">-</button>
            <span>${item.cantidad}</span>
            <button class="btn-aumentar" data-nombre="${item.nombre}">+</button>
          </div>
          <p>Subtotal: $${subtotal}</p>
          <button class="btn-eliminar" data-nombre="${item.nombre}">Eliminar</button>
        </div>
      </div>
    `;
    cartContent.insertAdjacentHTML("beforeend", itemHtml);
  });

  totalPriceEl.textContent = `$${total.toFixed(2)}`;
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
  const index = carrito.findIndex(item => item.nombre === producto.nombre);
  if (index === -1) {
    carrito.push({ ...producto, cantidad: 1 });
  } else {
    carrito[index].cantidad++;
  }
  mostrarCarrito();
}

// Modificar cantidad en carrito
function modificarCantidad(nombre, incrementar) {
  const index = carrito.findIndex(item => item.nombre === nombre);
  if (index === -1) return;

  if (incrementar) {
    carrito[index].cantidad++;
  } else {
    carrito[index].cantidad--;
    if (carrito[index].cantidad <= 0) {
      carrito.splice(index, 1);
    }
  }
  mostrarCarrito();
}

// Eliminar producto del carrito
function eliminarProducto(nombre) {
  carrito = carrito.filter(item => item.nombre !== nombre);
  mostrarCarrito();
}

// Eventos para botones
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-agregar")) {
    const btn = e.target;
    const nombre = btn.getAttribute("data-nombre");
    const precio = parseFloat(btn.getAttribute("data-precio"));
    const descuento = parseFloat(btn.getAttribute("data-descuento"));

    const producto = productos.find(p => p.nombre === nombre);
    if (!producto) return;

    agregarAlCarrito({
      nombre: producto.nombre,
      precio,
      descuento,
      imagen: producto.imagen
    });
  }

  if (e.target.classList.contains("btn-aumentar")) {
    modificarCantidad(e.target.getAttribute("data-nombre"), true);
  }

  if (e.target.classList.contains("btn-disminuir")) {
    modificarCantidad(e.target.getAttribute("data-nombre"), false);
  }

  if (e.target.classList.contains("btn-eliminar")) {
    eliminarProducto(e.target.getAttribute("data-nombre"));
  }

  if (e.target === cartIcon) {
    cart.classList.add("active");
  }

  if (e.target === closeCartBtn) {
    cart.classList.remove("active");
  }
});

// Comprar (envío al backend)
btnComprar.addEventListener("click", async () => {
  if (carrito.length === 0) {
    alert("El carrito está vacío.");
    return;
  }

  // Suponiendo que tienes el Id de usuario guardado en localStorage o sesión
  const idUsuario = localStorage.getItem("idUsuario") || 1;

  // Preparar datos para backend
  const data = {
    idUsuario,
    productos: carrito.map(p => ({
      nombre: p.nombre,
      cantidad: p.cantidad,
      descuento: p.descuento
    }))
  };

  try {
    const res = await fetch("/registrar-venta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      alert("Venta registrada correctamente");
      carrito = [];
      mostrarCarrito();
    } else {
      alert("Error al registrar la venta: " + result.mensaje);
    }
  } catch (error) {
    console.error(error);
    alert("Error en la comunicación con el servidor");
  }
});

// Inicializar vista
mostrarProductos();
mostrarCarrito();
