/*let repartidores = [];
let editando = false;
let idEditar = null;

document.addEventListener('DOMContentLoaded', obtenerRepartidores);

async function obtenerRepartidores() {
  try {
    const res = await fetch('/repartidores');
    repartidores = await res.json();
    mostrarRepartidores();
  } catch (err) {
    console.error('Error al obtener repartidores:', err);
  }
}

async function agregarRepartidor() {
  const nombre = document.getElementById('nombre').value.trim();
  const cedula = document.getElementById('identidad').value.trim();
  const foto_perfil = document.getElementById('perfil').value.trim();

  if (!nombre || !cedula || !foto_perfil) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  const repartidorData = { nombre, cedula, imagen };

  try {
    let res;

    if (editando) {
      res = await fetch(`/editarrepartidores/${idEditar}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repartidorData)
      });
    } else {
      res = await fetch('/agregarrepartidores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repartidorData)
      });
    }

    const data = await res.json();

    if (data.success) {
      alert(editando ? '✅ Repartidor actualizado' : "✅ Repartidor guardado en base de datos");
      limpiarFormulario();
      editando = false;
      idEditar = null;
      document.getElementById('btnGuardar').textContent = "Agregar Nuevo Repartidor";

      habilitarBotonesEliminar();
      await obtenerRepartidores();
    } else {
      alert("❌ No se pudo completar la operación: " + (data.mensaje || "Error desconocido"));
    }
  } catch (err) {
    console.error("❌ Error en la petición:", err);
    alert("Error al conectar con el servidor.");
  }

  const preview = document.getElementById('previewImagen');
  preview.src = '';
  preview.style.display = 'none';
}

function mostrarRepartidores() {
  const lista = document.getElementById('listaRepartidores');
  lista.innerHTML = '';

  repartidores.forEach(p => {
    lista.innerHTML += `
      <div class="repartidor" data-id="${p.Id_Repartidor}">
        <div class="repartidor-info">
          <img src="${p.Foto_Perfil}" alt="${p.Nombre}">
          <div class="repartidor-detalle">
            <strong>${p.Nombre}</strong>
            <span>Cédula de identidad: ${p.Cedula}</span>
            <span>Fecha de nacimiento: ${p.Fecha_Nacimiento || 'No calculada'}</span>
            <span>Edad actual: ${p.Edad || 'No disponible'}</span>
          </div>
        </div>
        <div>
          <button class="edit" onclick="editarRepartidor(${p.Id_Repartidor})">Editar</button>
          <button onclick="eliminarRepartidor(${p.Id_Repartidor})">Eliminar</button>
        </div>
      </div>
    `;
  });
}

function editarRepartidor(id) {
  const repartidor = repartidores.find(p => p.Id_Repartidor === id);

  if (!repartidor) {
    alert("⚠️ Repartidor no encontrado");
    return;
  }

  document.getElementById('nombre').value = repartidor.Nombre;
  document.getElementById('identidad').value = repartidor.Cedula;
  document.getElementById('perfil').value = repartidor.Id_Imagen;

  const preview = document.getElementById('previewImagen');
  preview.src = repartidor.Foto_Perfil;
  preview.style.display = 'block';

  editando = true;
  idEditar = id;
  document.getElementById('btnGuardar').textContent = "Guardar Cambios";
  deshabilitarBotonesEliminar();
}

async function eliminarRepartidor(id) {
  if (!confirm('¿Seguro que quieres eliminar este repartidor?')) return;
  try {
    const res = await fetch(`/eliminarrepartidores/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      alert('✅ Repartidor eliminado');
      await obtenerRepartidores();
    } else {
      alert('❌ Error al eliminar repartidor');
    }
  } catch (err) {
    console.error('Error al eliminar:', err);
    alert('Error al conectar con el servidor.');
  }
}

function limpiarFormulario() {
  document.getElementById('nombre').value = '';
  document.getElementById('identidad').value = '';
  document.getElementById('perfil').value = '';
}

document.getElementById('perfil').addEventListener('input', function () {
  const url = this.value.trim();
  const preview = document.getElementById('previewImagen');

  if (url) {
    preview.src = url;
    preview.style.display = 'block';
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }
});

function deshabilitarBotonesEliminar() {
  const botonesEliminar = document.querySelectorAll('.repartidor button:nth-child(2)');
  botonesEliminar.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
  });
}

function habilitarBotonesEliminar() {
  const botonesEliminar = document.querySelectorAll('.repartidor button:nth-child(2)');
  botonesEliminar.forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  });
}*/

let repartidores = [];
let editando = false;
let idEditar = null;

document.addEventListener('DOMContentLoaded', obtenerRepartidores);

async function obtenerRepartidores() {
  try {
    const res = await fetch('/repartidores');
    repartidores = await res.json();
    mostrarRepartidores();
  } catch (err) {
    console.error('Error al obtener repartidores:', err);
  }
}

async function agregarRepartidor() {
  const nombre = document.getElementById('nombre').value.trim();
  const cedula = document.getElementById('identidad').value.trim();
  const imagen = document.getElementById('perfil').value.trim();

  if (!nombre || !cedula || !imagen) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  const repartidorData = { nombre, cedula, imagen };

  try {
    let res;

    if (editando) {
      res = await fetch(`/editarrepartidor/${idEditar}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repartidorData)
      });
    } else {
      res = await fetch('/agregarrepartidores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repartidorData)
      });
    }

    const data = await res.json();

    if (data.success) {
      alert(editando ? '✅ Repartidor actualizado' : "✅ Repartidor guardado en base de datos");
      limpiarFormulario();
      editando = false;
      idEditar = null;
      document.getElementById('btnGuardar').textContent = "Agregar Nuevo Repartidor";
      habilitarBotonesEliminar();
      await obtenerRepartidores();
    } else {
      alert("❌ No se pudo completar la operación: " + (data.mensaje || "Error desconocido"));
    }
  } catch (err) {
    console.error("❌ Error en la petición:", err);
    alert("Error al conectar con el servidor.");
  }

  const preview = document.getElementById('previewImagen');
  preview.src = '';
  preview.style.display = 'none';
}

function mostrarRepartidores() {
  const lista = document.getElementById('listaRepartidores');
  lista.innerHTML = '';

  repartidores.forEach(p => {
    lista.innerHTML += `
      <div class="repartidor" data-id="${p.Id_Repartidor}">
        <div class="repartidor-info">
          <img src="${p.Foto_Perfil}" alt="${p.Nombre}">
          <div class="repartidor-detalle">
            <strong>${p.Nombre}</strong>
            <span>Cédula de identidad: ${p.Cedula}</span>
            <span>Fecha de nacimiento: ${p.Fecha_Nacimiento || 'No calculada'}</span>
            <span>Edad actual: ${p.Edad || 'No disponible'}</span>
          </div>
        </div>
        <div>
          <button class="edit" onclick="editarRepartidor(${p.Id_Repartidor})">Editar</button>
          <button onclick="eliminarRepartidor(${p.Id_Repartidor})">Eliminar</button>
        </div>
      </div>
    `;
  });
}

function editarRepartidor(id) {
  const repartidor = repartidores.find(p => p.Id_Repartidor === id);

  if (!repartidor) {
    alert("⚠️ Repartidor no encontrado");
    return;
  }

  document.getElementById('nombre').value = repartidor.Nombre;
  document.getElementById('identidad').value = repartidor.Cedula;
  document.getElementById('perfil').value = repartidor.Foto_Perfil;

  const preview = document.getElementById('previewImagen');
  preview.src = repartidor.Foto_Perfil;
  preview.style.display = 'block';

  editando = true;
  idEditar = id;
  document.getElementById('btnGuardar').textContent = "Guardar Cambios";
  deshabilitarBotonesEliminar();
}

async function eliminarRepartidor(id) {
  if (!confirm('¿Seguro que quieres eliminar este repartidor?')) return;
  try {
    const res = await fetch(`/eliminarrepartidor/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      alert('✅ Repartidor eliminado');
      await obtenerRepartidores();
    } else {
      alert('❌ Error al eliminar repartidor');
    }
  } catch (err) {
    console.error('Error al eliminar:', err);
    alert('Error al conectar con el servidor.');
  }
}

function limpiarFormulario() {
  document.getElementById('nombre').value = '';
  document.getElementById('identidad').value = '';
  document.getElementById('perfil').value = '';
}

document.getElementById('perfil').addEventListener('input', function () {
  const url = this.value.trim();
  const preview = document.getElementById('previewImagen');

  if (url) {
    preview.src = url;
    preview.style.display = 'block';
  } else {
    preview.src = '';
    preview.style.display = 'none';
  }
});

function deshabilitarBotonesEliminar() {
  const botonesEliminar = document.querySelectorAll('.repartidor button:nth-child(2)');
  botonesEliminar.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
  });
}

function habilitarBotonesEliminar() {
  const botonesEliminar = document.querySelectorAll('.repartidor button:nth-child(2)');
  botonesEliminar.forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  });
}

