let productos = [];
let editando = false;
let idEditar = null;

document.addEventListener('DOMContentLoaded', async () => {
  await cargarCategorias();
  await mostrarProductos();
});


async function cargarCategorias() {
  try {
    const res = await fetch('/categorias');
    const categorias = await res.json();

    const select = document.getElementById('categoria');
    select.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';

    categorias.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.Nombre;
      option.textContent = cat.Nombre;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("❌ Error al cargar categorías:", err);
    alert("No se pudieron cargar las categorías desde el servidor.");
  }
}


async function agregarProducto() {
  const nombre = document.getElementById('nombre').value.trim();
  const precio = document.getElementById('precio').value;
  const categoria = document.getElementById('categoria').value.trim();
  const stock = document.getElementById('stock').value;
  const imagen = document.getElementById('imagen').value.trim();

  if (!nombre || !precio || !categoria || !stock || !imagen) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  if (isNaN(precio) || precio <= 0) {
    alert("El precio debe ser mayor que cero.");
    return;
  }

  // Construir objeto producto con los nombres de las propiedades que tu backend espera
  const producto = {
    nombre: nombre,
    precio: parseFloat(precio).toFixed(2),
    categoria: categoria,
    stock: parseInt(stock),
    imagen: imagen
  };

  try {
    let res;

    if (editando) {
      // Cuando editamos, incluimos el id en la URL o el cuerpo, según tu backend
      res = await fetch(`/editarproducto/${idEditar}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
      });
    } else {
      res = await fetch('/agregarproductos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
      });
    }

    const data = await res.json();

    if (data.success) {
      alert(editando ? "✅ Producto actualizado" : "✅ Producto guardado en base de datos");
      limpiarFormulario();
      editando = false;
      idEditar = null;
      document.getElementById('btnGuardar').textContent = "Agregar Producto";

      // Recarga productos desde la base de datos
      await mostrarProductos();
      habilitarBotonesEliminar();
    } else {
      alert("❌ No se pudo completar la operación: " + (data.mensaje || "Error desconocido"));
    }
  } catch (err) {
    console.error("❌ Error en la petición:", err);
    alert("Error al conectar con el servidor.");
  }

  // Limpia preview
  const preview = document.getElementById('previewImagen');
  preview.src = '';
  preview.style.display = 'none';
}


  /*function mostrarProductos() {
    const lista = document.getElementById('listaProductos');
    lista.innerHTML = '';

    productos.forEach(p => {
      lista.innerHTML += `
      <div class="producto" data-id="${p.id}">
        <div class="producto">
          <div class="producto-info">
            <img src="${p.imagen}" alt="${p.nombre}">
            <div class="producto-detalle">
              <strong>${p.nombre}</strong>
              <span>Categoría: ${p.categoria}</span>
              <span>Precio: $${p.precio}</span>
              <span>Stock: ${p.stock}</span>
            </div>
          </div>
          <div>
            <button class="edit" onclick="editarProducto(${p.id})">Editar</button>
            <button onclick="eliminarProducto(${p.id})">Eliminar</button>
          </div>
        </div>
      `;
    });
  }*/

  async function mostrarProductos() {
  const lista = document.getElementById('listaProductos');
  lista.innerHTML = '';

  try {
    const res = await fetch('/productos'); // Asegúrate de que tu servidor sirve esta ruta
    const datos = await res.json();

    productos = datos;

    productos.forEach(p => {
      lista.innerHTML += `
        <div class="producto" data-id="${p.Id_producto}">
          <div class="producto-info">
            <img src="${p.Imagen}" alt="${p.Nombre}">
            <div class="producto-detalle">
              <strong>${p.Nombre}</strong>
              <span>Categoría: ${p.Categoria}</span>
              <span>Precio: $${p.Precio}</span>
              <span>Stock: ${p.Stock}</span>
            </div>
          </div>
          <div>
            <button class="edit" onclick="editarProducto(${p.Id_producto})">Editar</button>
            <button onclick="eliminarProducto(${p.Id_producto})">Eliminar</button>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error('Error al mostrar productos:', error);
    lista.innerHTML = `<p style="color:red;">No se pudieron cargar los productos.</p>`;
  }
}


  async function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de eliminar este producto?")) return;

  try {
    const res = await fetch(`/eliminarproducto/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Producto eliminado correctamente");
      await mostrarProductos(); // recarga lista
    } else {
      alert("❌ No se pudo eliminar el producto: " + (data.mensaje || "Error"));
    }
  } catch (err) {
    console.error("❌ Error al conectar con el servidor:", err);
    alert("Error al intentar eliminar el producto");
  }
}

  function editarProducto(id) {
  const producto = productos.find(p => p.Id_producto === id); // ✅ busca por Id_producto

  if (!producto) {
    alert("⚠️ Producto no encontrado");
    return;
  }

  document.getElementById('nombre').value = producto.Nombre;
  document.getElementById('precio').value = producto.Precio;
  document.getElementById('categoria').value = producto.Categoria;
  document.getElementById('stock').value = producto.Stock;
  document.getElementById('imagen').value = producto.Imagen;

  const preview = document.getElementById('previewImagen');
  preview.src = producto.Imagen;
  preview.style.display = 'block';

  editando = true;
  idEditar = id;
  document.getElementById('btnGuardar').textContent = "Guardar Cambios";
  deshabilitarBotonesEliminar();
}


  function limpiarFormulario() {
    document.getElementById('nombre').value = '';
    document.getElementById('precio').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('stock').value = '';
    document.getElementById('imagen').value = '';
  }

  document.getElementById('imagen').addEventListener('input', function() {
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
  const botonesEliminar = document.querySelectorAll('.producto button:nth-child(2)'); // botón eliminar es el 2° botón en cada div
  botonesEliminar.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.5";  // opcional para dar feedback visual
    btn.style.pointerEvents = "none"; // evitar clicks
  });
}

function habilitarBotonesEliminar() {
  const botonesEliminar = document.querySelectorAll('.producto button:nth-child(2)');
  botonesEliminar.forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  });
}


