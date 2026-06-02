// ── Columnas del backup ───────────────────────────────────────────────────────
// [0]=id [1]=timestamp [2]=nombre [3]=dia [4]=mes [5]=anio
// [6]=lugar [7]=actividad_IN [8]=actividad_ES [9]=categoria_IN
// [10]=categoria_ES [11]=codigo [12]=trimestre [13]=days_worked

const MESES    = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const now      = new Date();
const mesActual = now.getMonth();

let miembros     = [];
let backupData   = [];
let labelES      = {};
let tabActiva    = 'mensual';
let subtabActiva = 'eq-mes';

// Conversión entre la tabla de horas (plan en HORAS) y el backup (ejecutado en DÍAS)
const HORAS_POR_DIA = 8;

let equipoPlan = { planPorCodigo: {}, planTotal: 0 };

let chartEquipoGlobal  = null;
let chartEquipoMes     = null;
let chartEquipoSeccion = null;

// ── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
  poblarMeses();
  await Promise.all([cargarMiembros(), cargarBackupCompleto(), cargarEquipoPlan()]);
}

// ── Plan total del equipo (desde webhook dashboard) ────────────────────────────

async function cargarEquipoPlan() {
  try {
    const res  = await fetch(CONFIG.N8N_DASHBOARD);
    const data = await res.json();
    const obj  = Array.isArray(data) ? data[0] : data;
    if (obj?.equipo) equipoPlan = obj.equipo;
  } catch (e) { console.warn('Error plan equipo:', e.message); }
}

// ── Meses selector ───────────────────────────────────────────────────────────

function poblarMeses() {
  const trimestreInicio = Math.floor(mesActual / 3) * 3;
  const anio = now.getFullYear();

  ['sel-mes', 'sel-mes-equipo'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    for (let m = trimestreInicio; m <= trimestreInicio + 2; m++) {
      sel.add(new Option(`${MESES[m]} ${anio}`, `${MESES[m]}-${anio}`));
    }
    sel.value = `${MESES[mesActual]}-${anio}`;
  });

  document.getElementById('sel-mes')?.addEventListener('change', () => {
    const nombre = document.getElementById('dash-nombre').value;
    if (nombre) renderMensual(nombre);
  });

}

// ── Miembros ─────────────────────────────────────────────────────────────────

async function cargarMiembros() {
  try {
    const res = await fetch(CONFIG.N8N_REFDATA);
    const { miembros: m, categorias } = await res.json();
    miembros = m;
    const sel = document.getElementById('dash-nombre');
    m.forEach(n => sel.add(new Option(n, n)));
    document.getElementById('equipo-badge').textContent = `${m.length} miembros`;

    // Construir mapa código → label ES desde categorias (fuente completa)
    (categorias || []).forEach(cat => {
      (cat.actividades || []).forEach(a => {
        const codigo = a.label.match(/^(\d+-\d+)/)?.[1];
        if (codigo) labelES[codigo] = a.label.replace(/^\d+-\d+\.\s*/, '');
      });
    });
  } catch (e) { console.warn('Error miembros:', e.message); }
}

document.getElementById('dash-nombre').addEventListener('change', async function () {
  const nombre = this.value;
  if (!nombre) return;
  if (tabActiva === 'personal') await cargarPersonal(nombre);
  if (tabActiva === 'mensual')  renderMensual(nombre);
});

// ── Backup completo ───────────────────────────────────────────────────────────

async function cargarBackupCompleto() {
  try {
    const res  = await fetch(CONFIG.N8N_BACKUP_ALL);
    const data = await res.json();
    backupData = data.registros || [];
  } catch { backupData = []; }
}

// ── Tabs principales ──────────────────────────────────────────────────────────

document.querySelectorAll('.dash-top .dash-tab').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.dash-top .dash-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tabActiva = btn.dataset.tab;
    document.querySelectorAll('.dash-section').forEach(s => s.hidden = true);
    document.getElementById(`tab-${tabActiva}`).hidden = false;

    const nombre = document.getElementById('dash-nombre').value;
    if (tabActiva === 'personal' && nombre) await cargarPersonal(nombre);
    if (tabActiva === 'mensual'  && nombre) renderMensual(nombre);
    if (tabActiva === 'equipo') {
      renderEquipoResumen();
      if (subtabActiva === 'eq-proyecto') renderEquipoSeccion();
      else renderEquipoMes();
    }
  });
});

// Subtabs equipo
document.querySelectorAll('#equipo-subtabs .dash-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#equipo-subtabs .dash-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    subtabActiva = btn.dataset.subtab;
    document.getElementById('eq-mes').hidden      = subtabActiva !== 'eq-mes';
    document.getElementById('eq-proyecto').hidden = subtabActiva !== 'eq-proyecto';
    if (subtabActiva === 'eq-proyecto') renderEquipoSeccion();
    else renderEquipoMes();
  });
});

// ── Tab: Mi progreso ──────────────────────────────────────────────────────────

async function cargarPersonal(nombre) {
  document.getElementById('horas-body').innerHTML =
    '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Cargando...</td></tr>';
  try {
    const res  = await fetch(`${CONFIG.N8N_DASHBOARD}?nombre=${encodeURIComponent(nombre)}`);
    const data = await res.json();
    renderPersonal(data);
  } catch {
    document.getElementById('horas-body').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#dc2626">Error al cargar</td></tr>';
  }
}

function renderPersonal(data) {
  const { totalPlan, totalEjecutado, totalRestante, actividades } = data;
  const pct = totalPlan > 0 ? Math.round((totalEjecutado / totalPlan) * 100) : 0;

  document.getElementById('stat-plan').textContent = totalPlan;
  document.getElementById('stat-exec').textContent = totalEjecutado;
  document.getElementById('stat-rest').textContent = Math.max(totalRestante, 0);
  document.getElementById('stat-pct').textContent  = `${pct}%`;
  document.getElementById('dash-badge').textContent = data.nombre;

  const fill = document.getElementById('progress-fill');
  fill.style.width = `${Math.min(pct, 100)}%`;
  fill.className   = 'progress-bar-fill' + (pct > 100 ? ' over' : '');

  const tbody = document.getElementById('horas-body');
  if (!actividades?.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin actividades planificadas</td></tr>';
    return;
  }

  tbody.innerHTML = actividades.map(a => {
    const pctA    = a.planificado > 0 ? Math.round((a.ejecutado / a.planificado) * 100) : 0;
    const excedido = pctA > 100;
    const estado  = a.ejecutado === 0 ? 'pendiente' : excedido ? 'excedido' : pctA >= 80 ? 'completado' : 'progreso';
    const labelTxt = a.ejecutado === 0
      ? 'Pendiente'
      : excedido
        ? `Excedió ${Math.abs(a.diferencia)} día${Math.abs(a.diferencia) !== 1 ? 's' : ''}`
        : pctA >= 80 ? `Completado · ${pctA}%` : `En progreso · ${pctA}%`;
    const badge   = `<div class="mini-progress">
      <div class="mini-bar-track">
        <div class="mini-bar-fill ${estado}" style="width:${Math.min(pctA,100)}%"></div>
      </div>
      <span class="mini-label ${estado}">${labelTxt}</span>
    </div>`;
    const rest    = a.diferencia >= 0
      ? a.diferencia
      : `<span style="color:#dc2626;font-weight:600">+${Math.abs(a.diferencia)}</span>`;
    const desc = labelES[a.codigo] || '';
    return `<tr class="${excedido ? 'fila-excedida' : ''}">
      <td data-label="Actividad" class="celda-titulo">
        ${desc
          ? `<span style="color:var(--accent);font-weight:600">${a.codigo}</span>
             <strong style="margin-left:6px">${desc.replace(/^\d+-\d+\.\s*/, '')}</strong>`
          : `<strong style="color:var(--accent)">${a.codigo}</strong>`
        }
      </td>
      <td data-label="Días Asignados" style="font-weight:500;color:var(--accent)">${a.planificado}</td>
      <td data-label="Días Trabajados" style="font-weight:500;color:var(--teal)">${a.ejecutado}</td>
      <td data-label="Días Pendientes">${rest}</td>
      <td data-label="% Completado">${badge}</td>
    </tr>`;
  }).join('');
}

// ── Tab: Por mes ──────────────────────────────────────────────────────────────

function renderMensual(nombre) {
  const [mes, anio] = document.getElementById('sel-mes').value.split('-');

  const registros = backupData.filter(r =>
    r[2]?.trim().toLowerCase() === nombre.trim().toLowerCase() &&
    r[4] === mes && String(r[5]) === anio
  );

  const dias  = registros.reduce((s, r) => s + (parseFloat(r[13]) || 0), 0);
  const codes = new Set(registros.map(r => r[11]).filter(Boolean));

  document.getElementById('mensual-dias').textContent  = dias;
  document.getElementById('mensual-acts').textContent  = codes.size;
  document.getElementById('mensual-label').textContent = `${mes} ${anio}`;

  const tbody = document.getElementById('mensual-body');
  if (!registros.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin registros este mes</td></tr>';
    return;
  }

  tbody.innerHTML = registros
    .sort((a, b) => parseInt(a[3]) - parseInt(b[3]))
    .map(r => `<tr>
      <td data-label="Día">${r[3]}</td>
      <td data-label="Código" class="celda-titulo"><strong>${r[11] || r[7].split(' ')[0]}</strong></td>
      <td data-label="Actividad" style="font-size:12px;color:var(--text-muted)">${r[8] || ''}</td>
      <td data-label="Lugar">${r[6] === 'Remote' ? 'Virtual' : 'Presencial'}</td>
      <td data-label="Días">${r[13]}</td>
    </tr>`).join('');
}

// ── Equipo: helpers ────────────────────────────────────────────────────────────

const MES_IDX = { Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11 };
const COLORES = ['#F97048','#00C9B1','#8B5CF6','#EC4899','#F59E0B','#3B82F6','#10B981','#EF4444','#6366F1'];

// Plan total del equipo en DÍAS (la tabla está en horas)
function planTotalDias() {
  return (equipoPlan.planTotal || 0) / HORAS_POR_DIA;
}

// Ejecutado total del equipo en DÍAS (desde backup)
function ejecutadoTotalDias() {
  return backupData.reduce((s, r) => s + (parseFloat(r[13]) || 0), 0);
}

// ── Equipo: resumen general (tarjetas + dona) ──────────────────────────────────

function renderEquipoResumen() {
  const plan = planTotalDias();
  const exec = ejecutadoTotalDias();
  const rest = Math.max(0, plan - exec);
  const pct  = plan > 0 ? Math.round(exec / plan * 100) : 0;

  document.getElementById('eq-plan').textContent = Math.round(plan);
  document.getElementById('eq-exec').textContent = Math.round(exec * 10) / 10;
  document.getElementById('eq-rest').textContent = Math.round(rest);
  document.getElementById('eq-pct').textContent  = `${pct}%`;
  document.getElementById('equipo-badge').textContent = `${miembros.length} miembros`;

  const ctx = document.getElementById('chart-equipo-global').getContext('2d');
  if (chartEquipoGlobal) chartEquipoGlobal.destroy();

  chartEquipoGlobal = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Ejecutado', 'Falta'],
      datasets: [{
        data: [Math.round(exec * 10) / 10, Math.round(rest * 10) / 10],
        backgroundColor: ['#00C9B1', '#E5E7EB'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { display: false } }
    },
    plugins: [{
      id: 'centroTexto',
      afterDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        ctx.save();
        ctx.font = '600 26px IBM Plex Mono, monospace';
        ctx.fillStyle = '#F97048';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pct}%`, (left + right) / 2, (top + bottom) / 2);
        ctx.restore();
      }
    }]
  });
}

// ── Equipo: avance acumulado en el tiempo (línea) ──────────────────────────────

function renderEquipoMes() {
  // Agrupar ejecutado por mes-año, en orden cronológico
  const porMes = {};
  backupData.forEach(r => {
    const mi  = MES_IDX[r[4]] ?? 0;
    const key = `${r[5]}-${String(mi).padStart(2, '0')}`;
    porMes[key] = (porMes[key] || 0) + (parseFloat(r[13]) || 0);
  });

  const keys = Object.keys(porMes).sort();
  const canvas = document.getElementById('chart-equipo-mes');

  if (!keys.length) {
    canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding-top:40px">Sin registros todavía</p>';
    return;
  }

  const labels = keys.map(k => {
    const [a, m] = k.split('-');
    return `${MESES[+m]} ${a.slice(2)}`;
  });

  // Ejecutado acumulado
  let acum = 0;
  const dataExec = keys.map(k => { acum += porMes[k]; return Math.round(acum * 10) / 10; });

  // Meta: línea recta de 0 hasta el plan total, repartida en los meses con actividad
  const plan = planTotalDias();
  const dataMeta = keys.map((_, i) => Math.round(plan * (i + 1) / keys.length));

  const ctx = canvas.getContext('2d');
  if (chartEquipoMes) chartEquipoMes.destroy();

  chartEquipoMes = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Meta acumulada',
          data: dataMeta,
          borderColor: '#9CA3AF',
          borderDash: [6, 5],
          pointRadius: 0,
          tension: 0,
          fill: false
        },
        {
          label: 'Ejecutado acumulado',
          data: dataExec,
          borderColor: '#F97048',
          backgroundColor: 'rgba(249,112,72,0.10)',
          pointRadius: 4,
          pointBackgroundColor: '#F97048',
          tension: 0.25,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Días acumulados' } }
      }
    }
  });
}

// ── Equipo: distribución por sección (dona) ────────────────────────────────────

function renderEquipoSeccion() {
  // Agrupar ejecutado por sección (categoria_ES)
  const grupos = {};
  backupData.forEach(r => {
    const cat = r[10] || 'Sin sección';
    grupos[cat] = (grupos[cat] || 0) + (parseFloat(r[13]) || 0);
  });

  const entradas = Object.entries(grupos).sort((a, b) => b[1] - a[1]);
  const canvas = document.getElementById('chart-equipo-seccion');

  if (!entradas.length) {
    canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding-top:40px">Sin datos</p>';
    return;
  }

  const labels = entradas.map(([cat]) => cat);
  const datos  = entradas.map(([, d]) => Math.round(d * 10) / 10);

  const ctx = canvas.getContext('2d');
  if (chartEquipoSeccion) chartEquipoSeccion.destroy();

  chartEquipoSeccion = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: datos,
        backgroundColor: labels.map((_, i) => COLORES[i % COLORES.length]),
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 12 }, padding: 12, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: c => {
              const total = datos.reduce((s, v) => s + v, 0);
              const p = total > 0 ? Math.round(c.parsed / total * 100) : 0;
              return ` ${c.parsed} días (${p}%)`;
            }
          }
        }
      }
    }
  });
}

// ── Helper toast ──────────────────────────────────────────────────────────────

function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = type ? `show ${type}` : 'show';
  setTimeout(() => t.className = '', 3200);
}

init();
