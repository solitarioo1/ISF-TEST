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
const selDia        = document.getElementById('dia');
const diaTrigger    = document.getElementById('dia-trigger');
const diaLabel      = document.getElementById('dia-label');
const diaOverlay    = document.getElementById('dia-overlay');
const diaList       = document.getElementById('dia-list');
const diaClose      = document.getElementById('dia-close');
let   diaOpciones   = []; // { value, text, disabled, registrado }

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
// Transición Q2→Q3 se retrasa hasta CONFIG.Q2_CIERRE para cierre de datos
// (el mes de cierre puede ser cualquiera, no solo julio — se calcula dinámicamente)
const mesActual = now.getMonth();
const cierreQ2 = new Date(CONFIG.Q2_CIERRE);
const mesCierre = cierreQ2.getMonth();
const enExtensionQ2 = now < cierreQ2 && mesActual > 5 && mesActual <= mesCierre;
const trimestreInicio = enExtensionQ2 ? 3 : Math.floor(mesActual / 3) * 3;
const mesesQ = enExtensionQ2
  ? Array.from({ length: mesCierre - 3 + 1 }, (_, i) => 3 + i)  // Abr...mes de cierre
  : [trimestreInicio, trimestreInicio + 1, trimestreInicio + 2];

let mesSeleccionado = mesActual;

function poblarDias(mes) {
  const year  = now.getFullYear();
  const total = new Date(year, mes + 1, 0).getDate();
  diaOpciones = [];
  for (let d = 1; d <= total; d++) {
    const fecha   = new Date(year, mes, d);
    const diaSem  = fecha.getDay();
    const esFinde = diaSem === 0 || diaSem === 6;
    const feriado = FERIADOS.get(`${year}-${mes}-${d}`);
    diaOpciones.push({
      value: d,
      text: `${DIAS_SEMANA2[diaSem]}  ${d} de ${MESES_LARGO[mes]}`,
      disabled: !!(esFinde || feriado),
      registrado: false,
    });
  }
  // Reset selección
  selDia.value = '';
  diaLabel.textContent = 'Selecciona el día';
  diaTrigger.classList.remove('filled');
  renderDiaList();
}

function renderDiaList() {
  diaList.innerHTML = '';
  diaOpciones.forEach(op => {
    const li = document.createElement('li');
    li.style.cssText = `font-family:var(--mono);font-size:13px;display:flex;justify-content:space-between;align-items:center;`;
    if (op.disabled) {
      li.style.color = '#bbb';
      li.style.cursor = 'default';
      li.style.pointerEvents = 'none';
    } else if (op.registrado) {
      li.style.color = '#16a34a';
      li.style.fontWeight = '600';
    }
    if (String(op.value) === String(selDia.value)) li.classList.add('selected');
    if (op.registrado) {
      li.innerHTML = `<span>${op.text}</span>
        <button type="button" data-dia="${op.value}" data-texto="${op.text.trim()}" style="font-size:11px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:2px 10px;border-radius:4px;cursor:pointer;font-family:var(--sans);white-space:nowrap">
          🗑 Eliminar
        </button>`;
      li.querySelector('button').addEventListener('click', e => {
        e.stopPropagation();
        selDia.value = op.value;
        diaLabel.textContent = op.text.trim();
        closeDiaPicker();
        openModalEliminar();
      });
    } else {
      li.innerHTML = `<span>${op.text}</span>`;
    }
    if (!op.disabled && !op.registrado) {
      li.addEventListener('click', () => {
        selDia.value = op.value;
        diaLabel.textContent = op.text.trim();
        diaTrigger.classList.add('filled');
        diaTrigger.style.borderColor = '';
        closeDiaPicker();
        actualizarBtnEliminar();
      });
    }
    diaList.appendChild(li);
  });
}

function openDiaPicker() {
  diaOverlay.hidden = false;
  // Scroll al día seleccionado o al día de hoy
  setTimeout(() => {
    const selected = diaList.querySelector('.selected') || diaList.querySelector('li:not([style*="pointer-events"])');
    if (selected) selected.scrollIntoView({ block: 'center' });
  }, 50);
}

function closeDiaPicker() { diaOverlay.hidden = true; }

diaTrigger.addEventListener('click', openDiaPicker);
diaTrigger.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDiaPicker(); } });
diaClose.addEventListener('click', closeDiaPicker);
diaOverlay.addEventListener('click', e => { if (e.target === diaOverlay) closeDiaPicker(); });

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
  diaOpciones.forEach(op => {
    op.registrado = diasRegistrados.includes(op.value);
  });
  renderDiaList();
  actualizarBtnEliminar();
}

function actualizarBtnEliminar() {
  const dia = parseInt(selDia.value);
  const esDiaRegistrado = dia && diasRegistrados.includes(dia);
  document.getElementById('eliminar-registro').hidden = !esDiaRegistrado;
}

// ── Carga de datos desde n8n ────────────────────────────────────────────────

let categoriasData = [];
let categoriaActual = null;
let codigosAsignados = null;
let personalData     = {};  // codigo → { plan, exec }
let opcionesPorMiembro = {}; // nombre → { '1': bool, '0.5': bool, '0.25': bool, '0.125': bool }

const TIEMPO_LABELS = {
  '1':     '1 — Día completo',
  '0.5':   '0.5 — Medio día',
  '0.25':  '0.25 — Cuarto de día',
  '0.125': '0.125 — Octavo de día',
};

function actualizarOpcionesTiempo(nombre) {
  const selTiempo = document.getElementById('days_worked');
  const opciones  = opcionesPorMiembro[nombre];
  const valorPrevio = selTiempo.value;
  Array.from(selTiempo.options).forEach(op => {
    if (!op.value) return; // "Selecciona"
    const permitido = !opciones || opciones[op.value] !== false;
    op.hidden = !permitido;
    op.disabled = !permitido;
  });
  if (valorPrevio && selTiempo.options[selTiempo.selectedIndex]?.disabled) {
    selTiempo.value = '';
    actualizarFilledSelect(selTiempo);
  }
}

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

    miembros.forEach(m => {
      const nombre = typeof m === 'string' ? m : m.nombre;
      document.getElementById('nombre').add(new Option(nombre, nombre));
      if (typeof m === 'object' && m.opciones) opcionesPorMiembro[nombre] = m.opciones;
    });
    categoriasData = categorias;
    setStatus('ok', 'Conectado · Google Drive listo');
    document.getElementById('nombre').addEventListener('change', async () => {
      const nombre = document.getElementById('nombre').value;
      actualizarFilledSelect(document.getElementById('nombre'));
      actualizarOpcionesTiempo(nombre);
      codigosAsignados = null;
      // Bloquear picker hasta que carguen los datos
      trigger.style.pointerEvents = 'none';
      trigger.style.opacity = '0.5';
      triggerLabel.textContent = 'Cargando actividades...';
      if (nombre) await Promise.all([cargarActividadesAsignadas(nombre), cargarPersonalData(nombre)]);
      trigger.style.pointerEvents = '';
      trigger.style.opacity = '';
      triggerLabel.textContent = 'Selecciona la actividad';
      trigger.classList.remove('filled');
      hiddenActividad.value = '';
      actividadMeta = {};
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
  document.getElementById('conf-dia').textContent       = diaLabel.textContent.trim();
  document.getElementById('conf-tiempo').textContent    =
    TIEMPO_LABELS[payload.days_worked] || payload.days_worked;
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
    document.querySelectorAll('#form-registro select').forEach(actualizarFilledSelect);
    hiddenActividad.value = '';
    triggerLabel.textContent = 'Selecciona la actividad';
    trigger.classList.remove('filled');
    actividadMeta = {};
    document.getElementById('actividad-progreso').hidden = true;
    selDia.value = '';
    diaLabel.textContent = 'Selecciona el día';
    diaTrigger.classList.remove('filled');
    document.getElementById('eliminar-registro').hidden = true;
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

  const campos = ['nombre', 'days_worked', 'lugar'];
  const payload = {};
  let valido = true;

  campos.forEach(id => {
    const el = document.getElementById(id);
    payload[id] = el.value;
    el.style.borderColor = el.value ? '' : '#ef4444';
    if (!el.value) valido = false;
  });

  // Día (custom picker)
  payload.dia = selDia.value;
  if (!payload.dia) {
    diaTrigger.style.borderColor = '#ef4444';
    valido = false;
  }

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

// Filled state en selects nativos
function actualizarFilledSelect(s) {
  s.style.borderColor = '';
  s.classList.toggle('filled', !!s.value);
}
document.querySelectorAll('select').forEach(s =>
  s.addEventListener('change', () => actualizarFilledSelect(s))
);
diaTrigger.addEventListener('click', () => diaTrigger.style.borderColor = '');

// Mostrar/ocultar botón eliminar al cambiar día
selDia.addEventListener('change', actualizarBtnEliminar);

// ── Eliminar registro ───────────────────────────────────────────────────────

// ── Modal eliminar ──────────────────────────────────────────────────────────

const modalEliminar    = document.getElementById('modal-eliminar');
const btnElimCancelar  = document.getElementById('btn-elim-cancelar');
const btnElimConfirmar = document.getElementById('btn-elim-confirmar');

function openModalEliminar() {
  const nombre = document.getElementById('nombre').value;
  const dia    = parseInt(selDia.value);
  const mes    = CONFIG.MESES[mesSeleccionado];
  if (!nombre || !dia) return;
  document.getElementById('elim-nombre').textContent = nombre;
  document.getElementById('elim-dia').textContent    = diaLabel.textContent.trim();
  document.getElementById('elim-mes').textContent    = `${mes} ${now.getFullYear()}`;
  modalEliminar.hidden = false;
}

function closeModalEliminar() { modalEliminar.hidden = true; }

document.getElementById('btn-eliminar').addEventListener('click', openModalEliminar);
btnElimCancelar.addEventListener('click', closeModalEliminar);
modalEliminar.addEventListener('click', e => { if (e.target === modalEliminar) closeModalEliminar(); });

btnElimConfirmar.addEventListener('click', async () => {
  const nombre = document.getElementById('nombre').value;
  const dia    = parseInt(selDia.value);
  const mes    = CONFIG.MESES[mesSeleccionado];
  const anio   = now.getFullYear();

  btnElimConfirmar.disabled = true;
  btnElimConfirmar.textContent = 'Eliminando...';
  setStatus('loading', 'Eliminando registro...');

  try {
    const res = await apiFetch(CONFIG.N8N_DELETE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, dia, mes, anio }),
    });
    if (!res.ok) throw new Error();
    closeModalEliminar();
    toast('Registro eliminado correctamente', 'success');
    selDia.value = '';
    diaLabel.textContent = 'Selecciona el día';
    diaTrigger.classList.remove('filled');
    document.getElementById('eliminar-registro').hidden = true;
    setStatus('ok', 'Conectado · Google Drive listo');
    await checkDias();
  } catch {
    toast('Error al eliminar. Intenta de nuevo.', 'error');
    setStatus('ok', 'Conectado · Google Drive listo');
  }

  btnElimConfirmar.disabled = false;
  btnElimConfirmar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> Sí, eliminar`;
});

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
