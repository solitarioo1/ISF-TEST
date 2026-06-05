// ── Inicialización ──────────────────────────────────────────────────────────

const now = new Date();
const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const selDia = document.getElementById('dia');

// Trimestre actual (0-based): Q1=0,1,2 Q2=3,4,5 Q3=6,7,8 Q4=9,10,11
const mesActual = now.getMonth();
const trimestreInicio = Math.floor(mesActual / 3) * 3;
const mesesQ = [trimestreInicio, trimestreInicio + 1, trimestreInicio + 2];

let mesSeleccionado = mesActual;

function poblarDias(mes) {
  selDia.innerHTML = '<option value="">Selecciona el día</option>';
  const total = new Date(now.getFullYear(), mes + 1, 0).getDate();
  const esHoy = mes === mesActual;
  for (let d = 1; d <= total; d++) {
    const o = new Option(`${d} de ${MESES_LARGO[mes]}`, d);
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
  Array.from(selDia.options).forEach(o => {
    const d = parseInt(o.value);
    if (diasRegistrados.includes(d)) {
      o.disabled = true;
      o.text = o.text.includes('✓') ? o.text : `✓ ${o.text} — ya registrado`;
    } else {
      o.disabled = false;
      o.text = o.text.replace(' — ya registrado', '').replace('✓ ', '');
    }
  });
}

// ── Carga de datos desde n8n ────────────────────────────────────────────────

let categoriasData = [];
let categoriaActual = null;
let codigosAsignados = null; // null = sin filtro, [] = sin asignaciones

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
      if (nombre) await cargarActividadesAsignadas(nombre);
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
    li.textContent = a.label;
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

function selectActividad(item) {
  hiddenActividad.value = item.value;
  triggerLabel.textContent = `${categoriaActual.nombre} · ${item.label}`;
  trigger.classList.add('filled');
  trigger.style.borderColor = '';

  const codigo = item.label.match(/^(\d+-\d+)/)?.[1] || '';
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
