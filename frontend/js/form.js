// ── Inicialización ──────────────────────────────────────────────────────────

const now = new Date();

document.getElementById('date-badge').textContent =
  `${CONFIG.MESES[now.getMonth()]} ${now.getFullYear()}`;

// Poblar dropdown de días con formato "28 de Mayo"
const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const totalDias = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const mesLargo  = MESES_LARGO[now.getMonth()];
const selDia    = document.getElementById('dia');

for (let d = 1; d <= totalDias; d++) {
  const label = `${d} de ${mesLargo}`;
  const o = new Option(label, d);
  if (d === now.getDate()) o.selected = true;
  selDia.add(o);
}

// ── Carga de datos desde n8n ────────────────────────────────────────────────

let categoriasData = [];
let categoriaActual = null;

async function cargarDatos() {
  setStatus('loading', 'Cargando datos...');
  try {
    const res = await fetch(CONFIG.N8N_REFDATA);
    if (!res.ok) throw new Error('n8n respondió con error');
    const { miembros, categorias } = await res.json();

    miembros.forEach(m => document.getElementById('nombre').add(new Option(m, m)));
    categoriasData = categorias;
    setStatus('ok', 'Conectado · Google Drive listo');
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
  const filtradas = categoriasData.filter(c => c.nombre.toLowerCase().includes(q));
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

function selectActividad(item) {
  hiddenActividad.value = item.value;
  triggerLabel.textContent = `${categoriaActual.nombre} · ${item.label}`;
  trigger.classList.add('filled');
  trigger.style.borderColor = '';
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
      fetch(CONFIG.N8N_SUBMIT, opts),
      fetch(CONFIG.N8N_BACKUP, opts).catch(() => {}),
    ]);
    if (!r.ok) throw new Error('n8n respondió con error');
    closeModal();
    toast('Registro guardado correctamente', 'success');
    document.getElementById('form-registro').reset();
    hiddenActividad.value = '';
    triggerLabel.textContent = 'Selecciona la actividad';
    trigger.classList.remove('filled');
    selDia.value = now.getDate();
    setStatus('ok', 'Conectado · Google Drive listo');
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

  // Actividad (hidden input + trigger visual)
  payload.actividad = hiddenActividad.value;
  if (!payload.actividad) {
    trigger.style.borderColor = '#ef4444';
    valido = false;
  }

  if (!valido) { toast('Completa todos los campos', 'error'); return; }

  payload.proyecto = CONFIG.PROYECTO;
  payload.mes      = CONFIG.MESES[now.getMonth()];
  payload.anio     = now.getFullYear();

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
