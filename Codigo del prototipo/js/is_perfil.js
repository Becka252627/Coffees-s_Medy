//----------------------------localstorage Usuario
document.getElementById("userContainer").addEventListener("click", () => {
    const usuario = localStorage.getItem("nombreUsuario");

    if (usuario && usuario.trim() !== "") {
    // Ya inició sesión: Redirigir a perfil o mostrar menú
    window.location.href = "usuario.html"; // o la página que quieras mostrar
    } else {
    // No ha iniciado sesión: Enviar a login
    window.location.href = "inicio.html";
    }
});

