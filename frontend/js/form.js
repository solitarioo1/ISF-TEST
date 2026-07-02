// ── Inicialización ──────────────────────────────────────────────────────────

const now = new Date();
const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const NB = ' ';
const DIAS_SEMANA = [
  'Domingo' + NB+NB,
  'Lunes'   + NB+NB+NB+NB,
  'Martes'  + NB+NB+NB,
  'Miércoles',
  'Jueves'  + NB+NB+NB,
  'Viernes' + NB+NB,
  'Sábado'  + NB+NB+NB,
];
function padDia(s, n) { return s + ' '.repeat(n); }
const DIAS_SEMANA2 = [
  padDia('Domingo',  2),
  padDia('Lunes',    4),
  padDia('Martes',   3),
  'Miércoles',
  padDia('Jueves',   3),
  padDia('Viernes',  2),
  padDia('Sábado',   3),
];
const selDia = document.getElementById('dia');

function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function getFeriadosPerú(year) {
  const easter = easterDate(year);
  const juevesSanto = new Date(easter); juevesSanto.setDate(easter.getDate() - 3);
  const viernesSanto = new Date(easter); viernesSanto.setDate(easter.getDate() - 2);
  const fijos = [
    [0,  1,  'Año Nuevo'],
    [4,  1,  'Día del Trabajo'],
    [5,  7,  'Batalla de Arica'],
    [5, 29,  'San Pedro y San Pablo'],
    [6, 28,  'Independencia del Perú'],
    [6, 29,  'Gran Parada Militar'],
    [7, 30,  'Santa Rosa de Lima'],
    [9,  8,  'Combate de Angamos'],
    [10, 1,  'Todos los Santos'],
    [11, 8,  'Inmaculada Concepción'],
    [11,25,  'Navidad'],
  ];
  const set = new Map();
  fijos.forEach(([m, d, nombre]) => set.set(`${year}-${m}-${d}`, nombre));
  set.set(`${year}-${juevesSanto.getMonth()}-${juevesSanto.getDate()}`, 'Jueves Santo');
  set.set(`${year}-${viernesSanto.getMonth()}-${viernesSanto.getDate()}`, 'Viernes Santo');
  return set;
}

const FERIADOS = getFeriadosPerú(now.getFullYear());

// Trimestre actual (0-based): Q1=0,1,2 Q2=3,4,5 Q3=6,7,8 Q4=9,10,11
// Transición Q2→Q3 se retrasa hasta el 30 de julio para cierre de datos
const mesActual = now.getMonth();
const cierreQ2 = new Date(CONFIG.Q2_CIERRE);
const esJulioTemprano = now < cierreQ2 && now.getMonth() === 6;
const trimestreInicio = Math.floor((esJulioTemprano ? 5 : mesActual) / 3) * 3;
const mesesQ = esJulioTemprano
  ? [3, 4, 5, 6]  // Abr, May, Jun + Jul durante transición
  : [trimestreInicio, trimestreInicio + 1, trimestreInicio + 2];

let mesSeleccionado = mesActual;

function poblarDias(mes) {
  selDia.innerHTML = '<option value="">Selecciona el día</option>';
  const year  = now.getFullYear();
  const total = new Date(year, mes + 1, 0).getDate();
  const esHoy = mes === mesActual;
  for (let d = 1; d <= total; d++) {
    const fecha    = new Date(year, mes, d);
    const diaSem   = fecha.getDay();
    const esFinde  = diaSem === 0 || diaSem === 6;
    const feriado  = FERIADOS.get(`${year}-${mes}-${d}`);
    const label = `${DIAS_SEMANA2[diaSem]}  ${d} de ${MESES_LARGO[mes]}`;
    const o = new Option(label, d);
    if (esFinde || feriado) { o.disabled = true; o.style.color = '#ccc'; }
    if (esHoy && d === now.getDate()) o.selected = true;
    selDia.add(o);
  }
}

function renderChips() {
  const container = document.getElementById('mes-chips');
  container.innerHTML = '';
  mesesQ.forEach(m => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mes-chip' + (m === mesSeleccionado ? ' active' : '');
    chip.textContent = `${CONFIG.MESES[m]} ${now.getFullYear()}`;
    chip.addEventListener('click', () => {
      mesSeleccionado = m;
      renderChips();
      poblarDias(m);
      checkDias();
    });
    container.appendChild(chip);
  });
}

renderChips();
poblarDias(mesActual);

// ── Check días registrados ──────────────────────────────────────────────────

let diasRegistrados = [];

async function checkDias() {
  const nombre = document.getElementById('nombre').value;
  if (!nombre) { diasRegistrados = []; marcarDias(); return; }
  try {
    const url = `${CONFIG.N8N_CHECK}?nombre=${encodeURIComponent(nombre)}&mes=${CONFIG.MESES[mesSeleccionado]}&anio=${now.getFullYear()}`;
    const res = await apiFetch(url);
    const data = await res.json();
    diasRegistrados = data.diasRegistrados || [];
  } catch { diasRegistrados = []; }
  marcarDias();
}

function marcarDias() {
  const year = now.getFullYear();
  Array.from(selDia.options).forEach(o => {
    const d = parseInt(o.value);
    if (!d) return;
    const fecha   = new Date(year, mesSeleccionado, d);
    const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
    const feriado = FERIADOS.get(`${year}-${mesSeleccionado}-${d}`);
    if (diasRegistrados.includes(d)) {
      o.disabled = true;
      o.text = o.text.includes('✓') ? o.text : `✓ ${o.text}`;
      o.style.color = '#16a34a';
    } else if (esFinde || feriado) {
      o.disabled = true;
      o.style.color = '#bbb';
    } else {
      o.disabled = false;
      o.text = o.text.replace('✓ ', '');
      o.style.color = '';
    }
  });
}

// ── Carga de datos desde n8n ────────────────────────────────────────────────

let categoriasData = [];
let categoriaActual = null;
let codigosAsignados = null;
let personalData     = {};  // codigo → { plan, exec }

async function cargarPersonalData(nombre) {
  try {
    const res  = await apiFetch(`${CONFIG.N8N_DASHBOARD}?nombre=${encodeURIComponent(nombre)}`);
    const data = await res.json();
    personalData = {};
    (data.actividades || []).forEach(a => {
      personalData[a.codigo] = { plan: a.planificado, exec: a.ejecutado };
    });
  } catch { personalData = {}; }
}

async function cargarActividadesAsignadas(nombre) {
  try {
    const res  = await apiFetch(`${CONFIG.N8N_ACTIVIDADES}?nombre=${encodeURIComponent(nombre)}`);
    const data = await res.json();
    codigosAsignados = data.codigos || [];
  } catch { codigosAsignados = null; }
}

function categoriasFiltradas() {
  if (!codigosAsignados) return categoriasData;
  return categoriasData
    .map(cat => ({
      ...cat,
      actividades: cat.actividades.filter(a => {
        const codigo = a.label.match(/^(\d+-\d+)/)?.[1];
        return codigo && codigosAsignados.includes(codigo);
      })
    }))
    .filter(cat => cat.actividades.length > 0);
}

async function cargarDatos() {
  setStatus('loading', 'Cargando datos...');
  try {
    const res = await apiFetch(CONFIG.N8N_REFDATA);
    if (!res.ok) throw new Error('n8n respondió con error');
    const { miembros, categorias } = await res.json();

    miembros.forEach(m => document.getElementById('nombre').add(new Option(m, m)));
    categoriasData = categorias;
    setStatus('ok', 'Conectado · Google Drive listo');
    document.getElementById('nombre').addEventListener('change', async () => {
      const nombre = document.getElementById('nombre').value;
      codigosAsignados = null;
      if (nombre) await Promise.all([cargarActividadesAsignadas(nombre), cargarPersonalData(nombre)]);
      checkDias();
    });
  } catch (e) {
    console.warn('n8n no disponible:', e.message);
    setStatus('ok', 'Sin conexión a Drive');
  }
}

// ── Picker de actividad ─────────────────────────────────────────────────────

const overlay       = document.getElementById('actividad-overlay');
const trigger       = document.getElementById('actividad-trigger');
const triggerLabel  = document.getElementById('actividad-label');
const searchInput   = document.getElementById('actividad-search');
const pickerList    = document.getElementById('actividad-list');
const closeBtn      = document.getElementById('actividad-close');
const hiddenActividad = document.getElementById('actividad');

function renderCategorias() {
  pickerList.innerHTML = '';
  searchInput.placeholder = 'Buscar categoría...';
  const q = searchInput.value.toLowerCase();
  const filtradas = categoriasFiltradas().filter(c => c.nombre.toLowerCase().includes(q));
  filtradas.forEach(cat => {
    const li = document.createElement('li');
    li.textContent = cat.nombre;
    li.addEventListener('click', () => {
      categoriaActual = cat;
      searchInput.value = '';
      renderActividades(cat.actividades);
    });
    pickerList.appendChild(li);
  });
}

function renderActividades(items) {
  pickerList.innerHTML = '';
  searchInput.placeholder = 'Buscar actividad...';

  // Botón volver
  const back = document.createElement('li');
  back.textContent = '← Volver a categorías';
  back.style.cssText = 'color:var(--accent);font-weight:500;font-size:13px;';
  back.addEventListener('click', () => { searchInput.value = ''; categoriaActual = null; renderCategorias(); });
  pickerList.appendChild(back);

  const q = searchInput.value.toLowerCase();
  const filtradas = items.filter(a => a.label.toLowerCase().includes(q));
  filtradas.forEach(a => {
    const li = document.createElement('li');
    const codigo = a.label.match(/^(\d+-\d+)/)?.[1] || '';
    const d = personalData[codigo];
    let barraHTML = '';
    if (d && d.plan > 0) {
      const pct   = Math.min(Math.round((d.exec / d.plan) * 100), 100);
      const color = pct >= 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#00C9B1';
      barraHTML = `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">
        <div style="flex:1;height:4px;background:#e5e7eb;border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
        </div>
        <span style="font-size:10px;font-family:var(--mono);color:${color};white-space:nowrap">${d.exec}/${d.plan} · ${pct}%</span>
      </div>`;
    }
    li.innerHTML = `<span>${a.label}</span>${barraHTML}`;
    li.style.display = 'flex';
    li.style.flexDirection = 'column';
    if (a.value === hiddenActividad.value) li.classList.add('selected');
    li.addEventListener('click', () => selectActividad(a));
    pickerList.appendChild(li);
  });
}

const CAT_IN = {
  '1': 'Distribution Model', '2': 'Climatic Model', '3': 'Capacity Building',
  '4': 'IT Requirements',    '5': 'Program Roll Out','6': 'Climatic Reporting',
  '7': 'ISF Reporting',      '8': 'Premium Collection','9': 'Technical Partnership'
};

let actividadMeta = {};

function mostrarProgresoActividad(codigo) {
  const el = document.getElementById('actividad-progreso');
  const d  = personalData[codigo];
  if (!d || d.plan === 0) { el.hidden = true; return; }
  const pct   = Math.min(Math.round((d.exec / d.plan) * 100), 100);
  const color = pct >= 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#00C9B1';
  el.hidden = false;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
      <div style="flex:1;height:6px;background:#e5e7eb;border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s"></div>
      </div>
      <span style="white-space:nowrap;font-family:var(--mono);color:${color};font-weight:600">${d.exec} / ${d.plan} días · ${pct}%</span>
    </div>`;
}

function selectActividad(item) {
  hiddenActividad.value = item.value;
  triggerLabel.textContent = `${categoriaActual.nombre} · ${item.label}`;
  trigger.classList.add('filled');
  trigger.style.borderColor = '';

  const codigo = item.label.match(/^(\d+-\d+)/)?.[1] || '';
  mostrarProgresoActividad(codigo);
  const catNum = codigo.split('-')[0];
  actividadMeta = {
    actividad_IN:  item.value,
    actividad_ES:  item.label,
    categoria_ES:  categoriaActual.nombre,
    categoria_IN:  CAT_IN[catNum] || '',
    codigo,
  };
  closePicker();
}

function openPicker() {
  searchInput.value = '';
  categoriaActual = null;
  renderCategorias();
  overlay.hidden = false;
  searchInput.focus();
}

function closePicker() {
  overlay.hidden = true;
}

trigger.addEventListener('click', openPicker);
trigger.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } });
closeBtn.addEventListener('click', closePicker);
overlay.addEventListener('click', e => { if (e.target === overlay) closePicker(); });


// ── Modal de confirmación ───────────────────────────────────────────────────

const modal     = document.getElementById('modal-confirm');
const btnCancel = document.getElementById('btn-cancelar');
const btnConfirm = document.getElementById('btn-confirmar');

let pendingPayload = null;

const LUGAR_ES = { 'Remote': 'Virtual', 'Field': 'Presencial' };

function showModal(payload) {
  pendingPayload = payload;
  document.getElementById('conf-nombre').textContent    = payload.nombre;
  document.getElementById('conf-dia').textContent       = selDia.options[selDia.selectedIndex].text;
  document.getElementById('conf-tiempo').textContent    =
    payload.days_worked === '0.5' ? '0.5 — Medio día' : '1 — Día completo';
  document.getElementById('conf-lugar').textContent     = LUGAR_ES[payload.lugar] || payload.lugar;
  document.getElementById('conf-actividad').textContent = triggerLabel.textContent;
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
  pendingPayload = null;
}

btnCancel.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

btnConfirm.addEventListener('click', async () => {
  if (!pendingPayload) return;
  btnConfirm.disabled = true;
  btnConfirm.textContent = 'Guardando...';
  setStatus('loading', 'Enviando a n8n...');

  try {
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingPayload) };
    const [r] = await Promise.all([
      apiFetch(CONFIG.N8N_SUBMIT, opts),
      apiFetch(CONFIG.N8N_BACKUP, opts).catch(() => {}),
    ]);
    if (!r.ok) throw new Error('n8n respondió con error');
    closeModal();
    toast('Registro guardado correctamente', 'success');
    document.getElementById('form-registro').reset();
    hiddenActividad.value = '';
    triggerLabel.textContent = 'Selecciona la actividad';
    trigger.classList.remove('filled');
    actividadMeta = {};
    document.getElementById('actividad-progreso').hidden = true;
    setStatus('ok', 'Conectado · Google Drive listo');
    await checkDias();
  } catch {
    toast('Error al guardar. Intenta de nuevo.', 'error');
    setStatus('ok', 'Conectado · Google Drive listo');
  }

  btnConfirm.disabled = false;
  btnConfirm.textContent = 'Confirmar y guardar';
});

// ── Submit — abre modal en vez de enviar directo ────────────────────────────

document.getElementById('form-registro').addEventListener('submit', e => {
  e.preventDefault();

  const campos = ['nombre', 'dia', 'days_worked', 'lugar'];
  const payload = {};
  let valido = true;

  campos.forEach(id => {
    const el = document.getElementById(id);
    payload[id] = el.value;
    el.style.borderColor = el.value ? '' : '#ef4444';
    if (!el.value) valido = false;
  });

  // Actividad
  payload.actividad = hiddenActividad.value;
  if (!payload.actividad) {
    trigger.style.borderColor = '#ef4444';
    valido = false;
  }

  if (!valido) { toast('Completa todos los campos', 'error'); return; }

  payload.proyecto     = CONFIG.PROYECTO;
  payload.mes          = CONFIG.MESES[mesSeleccionado];
  payload.anio         = now.getFullYear();
  payload.trimestre    = `Q${Math.floor(mesSeleccionado / 3) + 1}`;
  payload.actividad_IN = actividadMeta.actividad_IN || payload.actividad;
  payload.actividad_ES = actividadMeta.actividad_ES || '';
  payload.categoria_IN = actividadMeta.categoria_IN || '';
  payload.categoria_ES = actividadMeta.categoria_ES || '';
  payload.codigo       = actividadMeta.codigo || '';

  showModal(payload);
});

// Limpiar borde rojo al cambiar el select
document.querySelectorAll('select').forEach(s =>
  s.addEventListener('change', () => s.style.borderColor = '')
);

// ── Helpers ────────────────────────────────────────────────────────────────

function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = type ? `show ${type}` : 'show';
  setTimeout(() => t.className = '', 3200);
}

function setStatus(state, text) {
  const dot = document.getElementById('status-dot');
  dot.className = state === 'loading' ? 'status-dot loading' : 'status-dot';
  document.getElementById('status-text').textContent = text;
}

// ── Boot ───────────────────────────────────────────────────────────────────
cargarDatos();
