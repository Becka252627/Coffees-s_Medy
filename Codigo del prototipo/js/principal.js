function irADelivery() {
    const nombre = localStorage.getItem("nombreUsuario");
    if (nombre && nombre.toLowerCase() === "admin") {
        window.location.href = "registrorepartidor.html"; // tu página exclusiva para admin
    } else {
        window.location.href = "delivery.html"; // página normal para clientes
    }
}

function irAProductos() {
    const nombre = localStorage.getItem("nombreUsuario");
    if (nombre && nombre.toLowerCase() === "admin") {
        window.location.href = "registroprod.html"; // tu página exclusiva para admin
    } else {
        window.location.href = "productos.html"; // página pública
    }
}

document.getElementById('link-historial').addEventListener('click', function (e) {
    e.preventDefault(); // Evita que el navegador siga el enlace directamente

    const usuario = localStorage.getItem('nombreUsuario');

    if (!usuario || usuario.trim() === '') {
      // No hay sesión activa → redirige a login
      window.location.href = 'inicio.html';
    } else if (usuario.toLowerCase() === 'admin') {
      // Usuario admin → ver ventas generales
      window.location.href = 'voucher.html';
    } else {
      // Usuario normal → ver solo sus compras
      window.location.href = 'vouchercompras.html';
    }
  });

  document.getElementById("Comprarahora").addEventListener("click", () => {
    const usuario = localStorage.getItem("nombreUsuario");

    if (usuario && usuario.trim() !== "") {
    // Ya inició sesión: Redirigir a perfil o mostrar menú
    window.location.href = "productos.html"; // o la página que quieras mostrar
    } else {
    // No ha iniciado sesión: Enviar a login
    window.location.href = "inicio.html";
    }
});