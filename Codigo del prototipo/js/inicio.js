// ----------------------
// 🔄 Alternar formularios
// ----------------------
const container = document.querySelector(".container");
const btnSignIn = document.getElementById("btn-sign-in");
const btnSignUp = document.getElementById("btn-sign-up");

btnSignIn.addEventListener("click", () => {
  container.classList.remove("toggle");
});

btnSignUp.addEventListener("click", () => {
  container.classList.add("toggle");
});

// ----------------------
// 🔒 Control de intentos fallidos con bloqueo acumulativo
// ----------------------
let intentosFallidos = parseInt(localStorage.getItem("intentosFallidos")) || 0;
const maxIntentos = 3;
const tiempoBloqueoBase = 30000; // 30 segundos
let tiempoBloqueo = tiempoBloqueoBase;
let bloqueadoHasta = localStorage.getItem("bloqueadoHasta") ? parseInt(localStorage.getItem("bloqueadoHasta")) : null;
let intervaloBloqueo = null;

const formLogin = document.getElementById("form-login");
const btnLogin = formLogin.querySelector("button");

// Mensaje visual de bloqueo
const mensajeBloqueo = document.createElement("div");
mensajeBloqueo.style.color = "red";
mensajeBloqueo.style.fontSize = "13px";
mensajeBloqueo.style.marginTop = "10px";
formLogin.appendChild(mensajeBloqueo);

// Si ya estaba bloqueado antes de recargar
if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
  iniciarBloqueo();
}

// ----------------------
// ✅ Validar nombre en tiempo real
// ----------------------
const inputNombre = document.getElementById("nombre-registro");
const mensajeNombre = document.getElementById("mensaje-nombre");

async function validarNombre() {
  const nombre = inputNombre.value.trim();
  if (!nombre) {
    mensajeNombre.textContent = "";
    return;
  }

  try {
    const res = await fetch(`/validar-nombre?nombre=${encodeURIComponent(nombre)}`);
    const data = await res.json();

    if (data.existe) {
      mensajeNombre.style.color = "red";
      mensajeNombre.textContent = "❌ Este nombre ya está en uso.";
    } else {
      mensajeNombre.style.color = "green";
      mensajeNombre.textContent = "✅ Nombre disponible.";
    }
  } catch (err) {
    mensajeNombre.style.color = "red";
    mensajeNombre.textContent = "❌ Error al validar nombre.";
  }
}

inputNombre.addEventListener("input", validarNombre);
inputNombre.addEventListener("blur", validarNombre);

// ----------------------
// ✅ Validar correo en tiempo real
// ----------------------
const inputCorreo = document.getElementById("email-registro");
const mensajeCorreo = document.getElementById("mensaje-correo");

async function validarCorreo() {
  const email = inputCorreo.value.trim();
  if (!email) {
    mensajeCorreo.textContent = "";
    return;
  }

  try {
    const res = await fetch(`/validar-correo?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (data.existe) {
      mensajeCorreo.style.color = "red";
      mensajeCorreo.textContent = "❌ Este correo ya está registrado.";
    } else {
      mensajeCorreo.style.color = "green";
      mensajeCorreo.textContent = "✅ Correo disponible.";
    }
  } catch (err) {
    mensajeCorreo.style.color = "red";
    mensajeCorreo.textContent = "❌ Error al validar correo.";
  }
}

inputCorreo.addEventListener("input", validarCorreo);
inputCorreo.addEventListener("blur", validarCorreo);


// ----------------------
// 🔐 INICIAR SESIÓN
// ----------------------
formLogin.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
    return; // No permitir intento si está bloqueado
  }

  const email = document.getElementById("email").value.trim();
  const contrasena = document.getElementById("contrasena").value.trim();

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, contrasena })
    });

    const data = await res.json();

    if (data.success) {
      intentosFallidos = 0;
      tiempoBloqueo = tiempoBloqueoBase;
      localStorage.removeItem("bloqueadoHasta");
      localStorage.removeItem("intentosFallidos");

      localStorage.setItem("nombreUsuario", data.nombre);
      localStorage.setItem("correoUsuario", data.email);
      alert("✅ Bienvenido");
      window.location.href = "principal.html";
    } else {
      intentosFallidos++;
      localStorage.setItem("intentosFallidos", intentosFallidos);

      if (intentosFallidos % maxIntentos === 0) {
        const ahora = Date.now();
        if (bloqueadoHasta && bloqueadoHasta > ahora) {
          bloqueadoHasta += tiempoBloqueoBase; // Extiende el bloqueo
        } else {
          bloqueadoHasta = ahora + tiempoBloqueoBase;
        }

        tiempoBloqueo += tiempoBloqueoBase;
        localStorage.setItem("bloqueadoHasta", bloqueadoHasta);
        iniciarBloqueo();

        alert(`❌ Has alcanzado el límite de intentos. Bloqueado por ${(bloqueadoHasta - ahora) / 1000} segundos.`);
      } else {
        alert("❌ " + (data.mensaje || "Credenciales incorrectas"));
      }
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error al conectar con el servidor.");
  }
});



function iniciarBloqueo() {
  btnLogin.disabled = true;

  intervaloBloqueo = setInterval(() => {
    const restante = Math.ceil((bloqueadoHasta - Date.now()) / 1000);
    if (restante <= 0) {
      finalizarBloqueo();
    } else {
      mensajeBloqueo.textContent = `⏳ Bloqueado por ${restante} segundos...`;
    }
  }, 1000);
}

function finalizarBloqueo() {
  clearInterval(intervaloBloqueo);
  mensajeBloqueo.textContent = '';
  bloqueadoHasta = null;
  localStorage.removeItem("bloqueadoHasta");
  btnLogin.disabled = false;
}

// ----------------------
// 🧪 Validación de contraseña en tiempo real
// ----------------------
document.getElementById("contrasena-registro").addEventListener("input", function () {
  const contrasena = this.value;
  const mensaje = document.getElementById("mensaje-validacion");
  const errores = [];

  if (contrasena.length < 8) errores.push("mínimo 8 caracteres");
  if (!/\d/.test(contrasena)) errores.push("un número");
  if (!/[A-Z]/.test(contrasena)) errores.push("una letra mayúscula");
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(contrasena)) errores.push("un símbolo especial");

  if (errores.length === 0) {
    mensaje.style.color = "green";
    mensaje.textContent = "✅ Contraseña segura";
  } else {
    mensaje.style.color = "red";
    mensaje.textContent = `Falta: ${errores.join(", ")}`;
  }
});

// ----------------------
// 📝 REGISTRO DE USUARIO
// ----------------------
const formRegistro = document.getElementById("form-registro");

if (formRegistro) {
  formRegistro.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nombre = document.getElementById("nombre-registro").value.trim();
    const email = document.getElementById("email-registro").value.trim();
    const contrasena = document.getElementById("contrasena-registro").value.trim();

    if (!nombre || !email || !contrasena) {
      alert("❗ Todos los campos son obligatorios");
      return;
    }

    // Validar formato de correo
    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formatoCorreo.test(email)) {
      mensajeCorreo.textContent = "❌ Formato de correo no válido.";
      mensajeCorreo.style.color = "red";
      return;
    }

    if (formatoCorreo.test(email)) {
      mensajeCorreo.textContent = "✅ Correo válido.";
      mensajeCorreo.style.color = "green";
    }

    if (
        mensajeNombre.textContent.includes("❌") ||
        mensajeCorreo.textContent.includes("❌")
      ) {
        alert("❗ Corrige los errores antes de registrarte.");
        return;
      }

    if (!validarContrasena(contrasena)) {
      const mensaje = document.getElementById("mensaje-validacion");
      mensaje.style.color = "red";
      mensaje.textContent = "❌ La contraseña debe tener mínimo 8 caracteres, incluir una mayúscula, un número y un símbolo especial.";
      return;
    }

    try {
      const res = await fetch('/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, contrasena })
      });

      const data = await res.json();

      if (data.success) {
        /*alert("✅ Usuario registrado correctamente");*/
        /*alert("❗ Verificar correo");*/
        alert("Registro exitoso. Revisa tu correo para verificar tu cuenta.");
        localStorage.setItem("nombreUsuario", data.nombre);
        localStorage.setItem("correoUsuario", data.email);
        formRegistro.reset();
        document.getElementById("mensaje-validacion").textContent = "";
        /*window.location.href = "principal.html";*/
        location.reload();
      } else {
        alert("❌ No se pudo registrar: " + data.mensaje);
      }
    } catch (err) {
      console.error("❌ Error al registrar:", err);
      alert("❌ Error de conexión con el servidor");
    }
  });
}

// ----------------------
// 🧪 Función de validación de contraseña
// ----------------------
function validarContrasena(contrasena) {
  const longitudValida = contrasena.length >= 8;
  const contieneNumero = /\d/.test(contrasena);
  const contieneCaracterEspecial = /[!@#$%^&*(),.?":{}|<>_\-]/.test(contrasena);
  const contieneMayuscula = /[A-Z]/.test(contrasena);

  return longitudValida && contieneNumero && contieneCaracterEspecial && contieneMayuscula;
}

// ----------------------
// 🔎 Validar nombre y correo existentes
// ----------------------
/*document.getElementById("nombre-registro").addEventListener("blur", async function () {
  const nombre = this.value.trim();
  if (!nombre) return;
  try {
    const res = await fetch(`/validar-nombre?nombre=${encodeURIComponent(nombre)}`);
    const data = await res.json();
    if (data.existe) {
      alert("❗ Este nombre ya está en uso.");
      this.focus();
    }
  } catch (err) {
    console.error("Error validando nombre:", err);
  }
});

document.getElementById("email-registro").addEventListener("blur", async function () {
  const email = this.value.trim();
  if (!email) return;
  try {
    const res = await fetch(`/validar-correo?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.existe) {
      alert("❗ Este correo ya está registrado.");
      this.focus();
    }
  } catch (err) {
    console.error("Error validando correo:", err);
  }
});*/

