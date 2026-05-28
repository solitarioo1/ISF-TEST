// Fase 2 — Dashboard personal
// Este archivo se implementa cuando el endpoint GET de n8n esté listo.

async function cargarRegistros(nombre, mes, anio) {
  // TODO: descomentar cuando el webhook de n8n esté listo
  // const res = await fetch(
  //   `${CONFIG.N8N_GET_MES}?nombre=${encodeURIComponent(nombre)}&mes=${mes}&anio=${anio}`
  // );
  // return res.json();

  // Mock temporal
  return {
    registros: [],
    totalDias: 0,
  };
}

function renderDashboard({ registros, totalDias }) {
  document.getElementById('total-dias').textContent = totalDias;
  const tbody = document.getElementById('registros-body');
  tbody.innerHTML = registros.length
    ? registros.map(r => `
        <tr>
          <td>${r.dia}</td>
          <td>${r.days_worked}</td>
          <td>${r.lugar}</td>
          <td>${r.actividad}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Sin registros este mes</td></tr>';
}

// Boot
(async () => {
  const nombre = localStorage.getItem('isf_nombre') || '';
  const now = new Date();
  const data = await cargarRegistros(nombre, CONFIG.MESES[now.getMonth()], now.getFullYear());
  renderDashboard(data);
})();
