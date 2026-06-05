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
const HORAS_POR_DIA = 1;

let equipoPlan = { planPorCodigo: {}, planTotal: 0 };

let chartEquipoGlobal  = null;
let chartEquipoMes     = null;
let controlData        = null;

// ── Trimestres ────────────────────────────────────────────────────────────────
// Q1 es especial: Dic 2025 + Ene/Feb/Mar 2026
const TRIMESTRES = {
  Q1: [{ mes: 'Dic', anio: 2025 }, { mes: 'Ene', anio: 2026 }, { mes: 'Feb', anio: 2026 }, { mes: 'Mar', anio: 2026 }],
  Q2: [{ mes: 'Abr', anio: 2026 }, { mes: 'May', anio: 2026 }, { mes: 'Jun', anio: 2026 }],
  Q3: [{ mes: 'Jul', anio: 2026 }, { mes: 'Ago', anio: 2026 }, { mes: 'Sep', anio: 2026 }],
  Q4: [{ mes: 'Oct', anio: 2026 }, { mes: 'Nov', anio: 2026 }, { mes: 'Dic', anio: 2026 }],
};

function trimestreActual() {
  const m = mesActual;
  if (m === 11 || m <= 2) return 'Q1';
  if (m <= 5) return 'Q2';
  if (m <= 8) return 'Q3';
  return 'Q4';
}

let trimestreSeleccionado = 'Acumulado';

function renderTrimestresPersonal() {
  const container = document.getElementById('trimestre-chips');
  if (!container) return;
  container.innerHTML = '';
  ['Acumulado', ...Object.keys(TRIMESTRES)].forEach(q => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mes-chip' + (q === trimestreSeleccionado ? ' active' : '');
    chip.textContent = q;
    chip.addEventListener('click', async () => {
      trimestreSeleccionado = q;
      renderTrimestresPersonal();
      const nombre = document.getElementById('dash-nombre').value;
      if (nombre) await cargarPersonal(nombre);
    });
    container.appendChild(chip);
  });
}

// ── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
  poblarMeses();
  renderTrimestresPersonal();
  setConexion('loading', 'Cargando datos…');
  await Promise.all([cargarMiembros(), cargarBackupCompleto(), cargarEquipoPlan()]);
  if (miembros.length > 0) {
    setConexion('ok', 'Conectado · Google Drive listo');
  } else {
    setConexion('error', 'Sin conexión · revisa los webhooks');
  }
}

// Actualiza el indicador de conexión del footer
function setConexion(estado, texto) {
  const el = document.getElementById('conn-status');
  const txt = document.getElementById('conn-text');
  if (!el || !txt) return;
  el.className = `conn-status ${estado}`;
  txt.textContent = texto;
  // Al conectar, ocultar suavemente después de unos segundos
  if (estado === 'ok') {
    setTimeout(() => { el.style.opacity = '0'; }, 4000);
  } else {
    el.style.opacity = '1';
  }
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

  document.getElementById('sel-mes-equipo')?.addEventListener('change', renderEquipoMes);
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
      if (subtabActiva === 'eq-proyecto') cargarControl();
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
    if (subtabActiva === 'eq-proyecto') cargarControl();
    else renderEquipoMes();
  });
});

// ── Tab: Mi progreso ──────────────────────────────────────────────────────────

async function cargarPersonal(nombre) {
  document.getElementById('horas-body').innerHTML =
    '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Cargando...</td></tr>';
  try {
    const q   = trimestreSeleccionado !== 'Acumulado' ? `&trimestre=${trimestreSeleccionado}` : '';
    const url = `${CONFIG.N8N_DASHBOARD}?nombre=${encodeURIComponent(nombre)}${q}`;
    const res  = await fetch(url);
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

  const asignadas   = actividades.filter(a => a.planificado > 0);
  const sinAsignar  = actividades.filter(a => a.planificado === 0 && a.ejecutado > 0);
  const separador   = sinAsignar.length > 0
    ? `<tr class="fila-separador"><td colspan="5">Actividades no asignadas</td></tr>`
    : '';

  const filaHTML = (a) => {
    const pctA      = a.planificado > 0 ? Math.round((a.ejecutado / a.planificado) * 100) : 0;
    const sinAsignar = a.planificado === 0 && a.ejecutado > 0;
    const excedido   = sinAsignar || pctA > 100;
    const estado     = a.ejecutado === 0 ? 'pendiente'
                     : sinAsignar        ? 'excedido'
                     : pctA > 100        ? 'excedido'
                     : pctA >= 80        ? 'completado'
                     : 'progreso';
    const labelTxt   = a.ejecutado === 0
      ? 'Pendiente'
      : sinAsignar
        ? `Sin asignar · +${a.ejecutado} día${a.ejecutado !== 1 ? 's' : ''}`
        : pctA > 100
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
      <td data-label="Días Asignados" style="font-weight:600;color:#e0552f">${a.planificado}</td>
      <td data-label="Días Trabajados" style="font-weight:600;color:#008c7a">${a.ejecutado}</td>
      <td data-label="Días Pendientes">${rest}</td>
      <td data-label="% Completado">${badge}</td>
    </tr>`;
  };

  tbody.innerHTML = asignadas.map(filaHTML).join('') + separador + sinAsignar.map(filaHTML).join('');
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
      <td data-label="Día">
        <span class="dia-num">${r[3]} ${mes}</span>
        <span class="dia-full">${r[3]} de ${mes}</span>
      </td>
      <td data-label="Código" class="celda-titulo cod-col"><strong>${r[11] || r[7].split(' ')[0]}</strong></td>
      <td data-label="Actividad" style="font-size:14px;color:#3f3f3a">${r[8] || ''}</td>
      <td data-label="Modalidad">${r[6] === 'Remote' ? 'Virtual' : 'Presencial'}</td>
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

// ── Equipo: matriz de participación por mes ────────────────────────────────────

const SECCIONES = ['1','2','3','4','5','6','7','8','9'];
const SEC_LABEL = {
  '1':'Distribución','2':'Modelo Climático','3':'Capacitación',
  '4':'Tecnología','5':'Suscripción','6':'Pagos',
  '7':'Reportes','8':'ISF Support','9':'Sostenibilidad'
};

function renderEquipoMes() {
  const selVal = document.getElementById('sel-mes-equipo')?.value;
  if (!selVal) return;
  const [mes, anio] = selVal.split('-');

  // Construir matriz: persona → sección → días
  const matriz = {};
  const seccionesUsadas = new Set();

  backupData.forEach(r => {
    if (r[4] !== mes || String(r[5]) !== anio) return;
    const nombre  = r[2];
    const seccion = (r[11] || '').split('-')[0];
    const dias    = parseFloat(r[13]) || 0;
    if (!nombre || !seccion || !SECCIONES.includes(seccion)) return;
    if (!matriz[nombre]) matriz[nombre] = {};
    matriz[nombre][seccion] = (matriz[nombre][seccion] || 0) + dias;
    seccionesUsadas.add(seccion);
  });

  const contenedor = document.getElementById('eq-mes-matriz');
  const personas   = Object.keys(matriz).sort();
  const secs       = SECCIONES;

  if (!personas.length) {
    contenedor.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:32px">Sin registros este mes</p>';
    document.getElementById('eq-mes-badge').textContent = '—';
    return;
  }

  document.getElementById('eq-mes-badge').textContent = `${personas.length} participantes · ${mes} ${anio}`;

  const totalDias = personas.reduce((s, p) =>
    s + secs.reduce((ss, sec) => ss + (matriz[p][sec] || 0), 0), 0);

  // Cabecera
  let html = '<table class="matriz-table"><thead><tr><th class="matriz-nombre">Miembro</th>';
  secs.forEach(s => {
    html += `<th class="matriz-sec" title="${SEC_LABEL[s] || ''}">${s}</th>`;
  });
  html += '<th class="matriz-total">Total</th></tr></thead><tbody>';

  // Filas
  personas.forEach((p, i) => {
    const totalP = secs.reduce((s, sec) => s + (matriz[p][sec] || 0), 0);
    html += `<tr class="${i % 2 === 0 ? 'fila-par' : ''}">`;
    html += `<td class="matriz-nombre-cel">${p}</td>`;
    secs.forEach(sec => {
      const d = matriz[p][sec] || 0;
      const cls = d === 0 ? '' : d <= 0.5 ? 'cel-bajo' : d <= 2 ? 'cel-medio' : 'cel-alto';
      html += `<td class="matriz-cel ${cls}">${d > 0 ? d : ''}</td>`;
    });
    html += `<td class="matriz-cel-total">${totalP}</td></tr>`;
  });

  // Fila totales
  html += '<tr class="fila-totales"><td class="matriz-nombre-cel">Total equipo</td>';
  secs.forEach(sec => {
    const tot = personas.reduce((s, p) => s + (matriz[p][sec] || 0), 0);
    html += `<td class="matriz-cel matriz-cel-footer">${tot > 0 ? tot : ''}</td>`;
  });
  html += `<td class="matriz-cel-total matriz-cel-footer">${totalDias}</td></tr>`;
  html += '</tbody></table>';

  // Leyenda
  html += `<div class="matriz-leyenda">
    <span class="ley-item"><span class="ley-dot cel-bajo"></span>≤ 0.5 días</span>
    <span class="ley-item"><span class="ley-dot cel-medio"></span>1–2 días</span>
    <span class="ley-item"><span class="ley-dot cel-alto"></span>> 2 días</span>
  </div>`;

  contenedor.innerHTML = html;
}

// ── Equipo: distribución por sección (dona) ────────────────────────────────────

async function cargarControl() {
  const contenedor = document.getElementById('eq-proyecto');
  if (controlData) { renderControl(controlData); return; }
  contenedor.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:32px">Cargando…</p>';
  try {
    const res = await fetch(CONFIG.N8N_CONTROL);
    const data = await res.json();
    controlData = data;
    renderControl(data);
  } catch {
    contenedor.innerHTML = '<p style="text-align:center;color:#dc2626;padding:32px">Error al cargar datos</p>';
  }
}

function renderControl(data) {
  const { actividades } = data;
  const contenedor = document.getElementById('eq-proyecto');
  if (!actividades?.length) {
    contenedor.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:32px">Sin datos</p>';
    return;
  }

  const fmt = n => '€' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filas = actividades.map(a => {
    const estado   = a.pct > 100 ? 'excedido' : a.pct >= 90 ? 'advertencia' : 'completado';
    const rowClass = a.pct > 100 ? 'fila-excedida' : a.pct >= 90 ? 'fila-advertencia' : '';
    const badge    = `<div class="mini-progress">
      <div class="mini-bar-track">
        <div class="mini-bar-fill ${estado}" style="width:${Math.min(a.pct, 100)}%"></div>
      </div>
      <span class="mini-label ${estado}">${a.pct}%</span>
    </div>`;
    const obsHTML = a.observados?.length
      ? a.observados.map(o => {
          const [nombre, tipo] = typeof o === 'string' ? o.split('·') : [o.nombre, o.motivo];
          const cls = tipo === 'exc' || tipo === 'excedió' ? 'exc' : 'sin';
          return `<span class="obs-chip obs-${cls}">${nombre}</span>`;
        }).join('')
      : '<span style="color:#9ca3af;font-size:11px">—</span>';
    return `<tr class="${rowClass}">
      <td data-label="Actividad"><strong style="color:var(--accent)">${a.codigo}</strong></td>
      <td data-label="Días Plan" style="text-align:center">${a.diasPlan}</td>
      <td data-label="Días Ejec" style="text-align:center;color:var(--teal);font-weight:600">${a.diasEjec}</td>
      <td data-label="Monto Estimado" style="text-align:right">${fmt(a.montoEstimado)}</td>
      <td data-label="Monto Real" style="text-align:right;font-weight:600">${fmt(a.montoReal)}</td>
      <td data-label="% Consumo">${badge}</td>
      <td data-label="Observados">${obsHTML}</td>
    </tr>`;
  }).join('');

  contenedor.innerHTML = `
    <div class="card" style="margin-top:0">
      <div class="card-header">
        <span class="card-title">Control presupuestal por actividad</span>
        <div class="matriz-leyenda" style="margin:0">
          <span class="ley-item"><span class="obs-chip obs-exc">nombre</span> Excedió días</span>
          <span class="ley-item"><span class="obs-chip obs-sin">nombre</span> Sin asignar</span>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Actividad</th>
              <th style="text-align:center">Días Plan</th>
              <th style="text-align:center;color:var(--teal)">Días Ejec</th>
              <th style="text-align:right">Monto Estimado</th>
              <th style="text-align:right;color:var(--accent)">Monto Real</th>
              <th>% Consumo</th>
              <th>Observados</th>
            </tr>
          </thead>
          <tbody id="control-body">${filas}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Helper toast ──────────────────────────────────────────────────────────────

function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = type ? `show ${type}` : 'show';
  setTimeout(() => t.className = '', 3200);
}

init();
