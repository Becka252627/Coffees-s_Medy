let repartidoresDisponibles = [];

async function cargarRepartidores() {
  const res = await fetch('/repartidores');
  repartidoresDisponibles = await res.json();
}

async function cargarPedidos() {
  await cargarRepartidores();
  const res = await fetch('/pedidos');
  const pedidos = await res.json();
  const tbody = document.getElementById('tablaPedidos');
  tbody.innerHTML = '';

  pedidos.forEach(p => {
    const tr = document.createElement('tr');

    // Dropdown para repartidores
    const repartidorSelect = document.createElement('select');
    repartidoresDisponibles.forEach(rep => {
      const option = document.createElement('option');
      option.value = rep.Id_Repartidor;
      option.textContent = rep.Nombre;
      if (rep.Nombre === p.Repartidor) option.selected = true;
      repartidorSelect.appendChild(option);
    });

    // Dropdown para estados
    const estadoSelect = document.createElement('select');
    ['Pendiente', 'Enviado', 'Entregado', 'Cancelado'].forEach(estado => {
      const option = document.createElement('option');
      option.value = estado;
      option.textContent = estado;
      if (estado === p.Estado) option.selected = true;
      estadoSelect.appendChild(option);
    });

    const botonActualizar = document.createElement('button');
    botonActualizar.textContent = "Guardar";
    botonActualizar.onclick = async () => {
      const body = {
        idPedido: p.Id_Pedido,
        idRepartidor: repartidorSelect.value,
        estado: estadoSelect.value
      };

      const resp = await fetch('/actualizar-pedido', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await resp.json();
      if (data.success) {
        alert("✅ Pedido actualizado");
      } else {
        alert("❌ Error al actualizar");
      }
    };

    tr.innerHTML = `
      <td>${p.Id_Pedido}</td>
      <td>${p.Cliente}</td>
      <td>${p.Direccion}</td>
      <td>${p.Telefono}</td>
      <td></td>
      <td>${new Date(p.Fecha_pedido).toLocaleString()}</td>
      <td></td>
      <td></td>
    `;

    tr.children[4].appendChild(repartidorSelect);
    tr.children[6].appendChild(estadoSelect);
    tr.children[7].appendChild(botonActualizar);

    tbody.appendChild(tr);
  });
}

cargarPedidos();