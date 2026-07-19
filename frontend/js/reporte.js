// ── Reporte PDF (Equipo) — hoja A4 horizontal con KPIs, dona y participantes ──
// Depende de globals de dashboard.js: controlCache, trimestreControl, backupData,
// fmtDias, SEC_LABEL, toast(), y de Chart.js / html2canvas / jsPDF cargados antes.

const REPORTE_MODAL_HTML = `
<div id="modal-pdf" class="modal-overlay" hidden>
  <div class="modal" style="max-width:1160px;width:96vw">
    <div class="modal-header">
      <span class="modal-title">Vista previa del reporte</span>
    </div>
    <div class="modal-body" style="padding:16px;background:#e5e7eb">
      <div style="overflow:auto;max-height:70vh;display:flex;justify-content:center">
        <div id="pdf-preview-scale" style="transform-origin:top center;transform:scale(0.6)"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-secondary" id="btn-pdf-cancelar">Cancelar</button>
      <button type="button" class="btn-primary" id="btn-pdf-descargar">Descargar PDF</button>
    </div>
  </div>
</div>`;

const REPORTE_TEMPLATE_HTML = `
<div id="pdf-report" style="position:fixed;left:-9999px;top:0;width:1123px;height:794px;background:#fff;font-family:'IBM Plex Sans',sans-serif;box-sizing:border-box;color:#1a1a1a;overflow:hidden">
  <div style="position:relative;z-index:1;padding:36px 44px;height:100%;box-sizing:border-box">

  <img id="pdf-watermark" src="img/logo_la_positiva.png?v=4" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:880px;height:auto;opacity:0.08;z-index:1000;pointer-events:none">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #F97048;padding-bottom:14px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:14px">
        <img src="img/logo_la_positiva.png?v=4" style="height:42px;width:auto">
        <div>
          <div style="font-size:22px;font-weight:700">ISF Café Seguro Perú</div>
          <div style="font-size:14px;color:#666;margin-top:2px">Reporte de Control Presupuestal — <span id="pdf-trimestre">Acumulado</span></div>
        </div>
      </div>
      <div style="text-align:right;font-size:12px;color:#666">
        <div>Generado el <strong id="pdf-fecha">—</strong></div>
        <div id="pdf-hora">—</div>
      </div>
    </div>

  <div style="display:flex;gap:16px;margin-bottom:20px">
    <div style="flex:1;background:#FEF8F5;border:1px solid #f9bfaa;border-radius:8px;padding:14px 18px;text-align:center">
      <div style="font-size:26px;font-weight:700" id="pdf-kpi-plan">—</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase">Días planificados</div>
    </div>
    <div style="flex:1;background:#E6FAF8;border:1px solid #00C9B1;border-radius:8px;padding:14px 18px;text-align:center">
      <div style="font-size:26px;font-weight:700;color:#00857a" id="pdf-kpi-exec">—</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase">Días ejecutados</div>
    </div>
    <div style="flex:1;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;padding:14px 18px;text-align:center">
      <div style="font-size:26px;font-weight:700" id="pdf-kpi-rest">—</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase">Días faltantes</div>
    </div>
    <div style="flex:1;background:#fff1ec;border:1px solid #F97048;border-radius:8px;padding:14px 18px;text-align:center">
      <div style="font-size:26px;font-weight:700;color:#F97048" id="pdf-kpi-pct">—</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase">Avance</div>
    </div>
  </div>

  <div style="display:flex;gap:20px;margin-bottom:16px">
    <table style="flex:1.4;border-collapse:collapse;font-size:11px;height:fit-content">
      <thead>
        <tr style="background:#f3f4f6;text-align:left">
          <th style="padding:6px 8px;border-bottom:2px solid #d1d5db">Categoría</th>
          <th style="padding:6px 8px;border-bottom:2px solid #d1d5db;text-align:center">Plan</th>
          <th style="padding:6px 8px;border-bottom:2px solid #d1d5db;text-align:center">Ejec</th>
          <th style="padding:6px 8px;border-bottom:2px solid #d1d5db;text-align:center">%</th>
          <th style="padding:6px 8px;border-bottom:2px solid #d1d5db;text-align:right">Monto Est.</th>
          <th style="padding:6px 8px;border-bottom:2px solid #d1d5db;text-align:right">Monto Cons.</th>
        </tr>
      </thead>
      <tbody id="pdf-tabla-categorias"></tbody>
    </table>
    <div style="flex:0.9;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px">
      <div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;margin-bottom:6px">Avance general</div>
      <canvas id="pdf-donut" width="160" height="160"></canvas>
      <div style="display:flex;gap:14px;margin-top:8px;font-size:10px">
        <span><span style="display:inline-block;width:8px;height:8px;background:#00C9B1;border-radius:2px;margin-right:4px"></span>Ejecutado</span>
        <span><span style="display:inline-block;width:8px;height:8px;background:#E5E7EB;border-radius:2px;margin-right:4px"></span>Falta</span>
      </div>
    </div>
  </div>

  <div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;margin-bottom:6px">
    Participación acumulada por miembro (<span id="pdf-participantes-count">0</span>)
  </div>
    <div id="pdf-participantes" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:3px 16px;font-size:10.5px"></div>
  </div>
</div>`;

document.body.insertAdjacentHTML('beforeend', REPORTE_MODAL_HTML + REPORTE_TEMPLATE_HTML);

// ── Cálculos ─────────────────────────────────────────────────────────────────

function calcularResumenCategorias(actividades) {
  const porCategoria = {};
  (actividades || []).forEach(a => {
    const cat = a.codigo.split('-')[0];
    if (!porCategoria[cat]) porCategoria[cat] = { diasPlan: 0, diasEjec: 0, montoEstimado: 0, montoReal: 0 };
    const c = porCategoria[cat];
    c.diasPlan      += a.diasPlan;
    c.diasEjec      += a.diasEjec;
    c.montoEstimado += a.montoEstimado;
    c.montoReal     += a.montoReal;
  });
  return Object.keys(porCategoria).sort((a, b) => Number(a) - Number(b)).map(cat => ({ cat, ...porCategoria[cat] }));
}

function calcularParticipantesAcumulado() {
  const porPersona = {};
  miembros.forEach(nombre => { porPersona[nombre] = 0; });
  backupData.forEach(r => {
    const nombre    = r[2];
    const trimestre = r[12];
    const dias      = parseFloat(r[13]) || 0;
    if (!nombre || !dias) return;
    if (trimestreControl !== 'Acumulado' && trimestre !== trimestreControl) return;
    porPersona[nombre] = (porPersona[nombre] || 0) + dias;
  });
  return Object.entries(porPersona)
    .map(([nombre, dias]) => ({ nombre, dias: fmtDias(dias) }))
    .sort((a, b) => b.dias - a.dias);
}

// ── Render del template ─────────────────────────────────────────────────────

let pdfDonutChart = null;

function llenarReportePDF() {
  const data = controlCache[trimestreControl];
  const actividades = data?.actividades || [];
  const resumen = calcularResumenCategorias(actividades);
  const fmt = n => '€' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  document.getElementById('pdf-trimestre').textContent = trimestreControl;
  document.getElementById('pdf-fecha').textContent = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  document.getElementById('pdf-hora').textContent   = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  document.getElementById('pdf-kpi-plan').textContent = document.getElementById('eq-plan').textContent;
  document.getElementById('pdf-kpi-exec').textContent = document.getElementById('eq-exec').textContent;
  document.getElementById('pdf-kpi-rest').textContent = document.getElementById('eq-rest').textContent;
  document.getElementById('pdf-kpi-pct').textContent  = document.getElementById('eq-pct').textContent;

  document.getElementById('pdf-tabla-categorias').innerHTML = resumen.map((r, i) => {
    const pct = r.diasPlan > 0 ? Math.round((r.diasEjec / r.diasPlan) * 100) : 0;
    const bg  = i % 2 === 0 ? '#fff' : '#fafafa';
    return `<tr style="background:${bg}">
      <td style="padding:6px 8px;border-bottom:1px solid #eee"><strong style="color:#F97048">${r.cat}</strong> · ${SEC_LABEL[r.cat] || ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${fmtDias(r.diasPlan)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;color:#00857a">${fmtDias(r.diasEjec)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${pct}%</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(r.montoEstimado)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmt(r.montoReal)}</td>
    </tr>`;
  }).join('');

  // Dona: ejecutado vs falta (mismos números que las tarjetas KPI)
  const planNum = parseFloat(document.getElementById('eq-plan').textContent) || 0;
  const execNum = parseFloat(document.getElementById('eq-exec').textContent) || 0;
  const restNum = Math.max(0, planNum - execNum);
  const ctx = document.getElementById('pdf-donut').getContext('2d');
  if (pdfDonutChart) pdfDonutChart.destroy();
  pdfDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['Ejecutado', 'Falta'], datasets: [{ data: [execNum, restNum], backgroundColor: ['#00C9B1', '#E5E7EB'], borderWidth: 0 }] },
    options: { responsive: false, animation: false, plugins: { legend: { display: false } }, cutout: '68%' }
  });

  // Listado de participantes acumulado
  const participantes = calcularParticipantesAcumulado();
  document.getElementById('pdf-participantes-count').textContent = participantes.length;
  document.getElementById('pdf-participantes').innerHTML = participantes.map(p =>
    `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #f3f4f6">
      <span>${p.nombre}</span><strong style="color:#00857a;margin-left:8px">${p.dias}</strong>
    </div>`
  ).join('');
}

// ── Preview / descarga ───────────────────────────────────────────────────────

function abrirPreviewPDF() {
  if (!controlCache[trimestreControl]) {
    toast('Espera a que carguen los datos de Control Presupuestal', 'error');
    return;
  }
  llenarReportePDF();
  const original = document.getElementById('pdf-report');
  const donutImg = original.querySelector('#pdf-donut').toDataURL('image/png');

  const scaleWrap = document.getElementById('pdf-preview-scale');
  scaleWrap.innerHTML = '';
  const clon = original.cloneNode(true);
  clon.style.position = 'static';
  clon.style.left = '';
  clon.removeAttribute('id');
  // cloneNode no copia el contenido dibujado del <canvas>; se reemplaza por una imagen
  const canvasClon = clon.querySelector('#pdf-donut');
  const img = document.createElement('img');
  img.src = donutImg;
  img.width = 160;
  img.height = 160;
  canvasClon.replaceWith(img);
  scaleWrap.appendChild(clon);
  document.getElementById('modal-pdf').hidden = false;
}

function cerrarPreviewPDF() {
  document.getElementById('modal-pdf').hidden = true;
}

function esperarImagenes(el) {
  const imgs = [...el.querySelectorAll('img')].filter(img => !img.complete);
  if (!imgs.length) return Promise.resolve();
  return Promise.all(imgs.map(img => new Promise(res => {
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
  })));
}

async function descargarPDF() {
  const btn = document.getElementById('btn-pdf-descargar');
  const original = document.getElementById('pdf-report');
  if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
    toast('No se pudo generar el PDF', 'error');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Generando…';
  try {
    await esperarImagenes(original);
    const canvas = await html2canvas(original, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const { jsPDF } = jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, pageH);

    const fechaArchivo = new Date().toISOString().slice(0, 10);
    pdf.save(`ISF-Peru_Control-Presupuestal_${trimestreControl}_${fechaArchivo}.pdf`);
    toast('PDF descargado correctamente', 'success');
    cerrarPreviewPDF();
  } catch (e) {
    console.error(e);
    toast('Error al generar el PDF', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Descargar PDF';
  }
}

document.getElementById('btn-exportar-pdf')?.addEventListener('click', abrirPreviewPDF);
document.addEventListener('click', e => {
  if (e.target.id === 'btn-pdf-cancelar') cerrarPreviewPDF();
  if (e.target.id === 'btn-pdf-descargar') descargarPDF();
  if (e.target.id === 'modal-pdf') cerrarPreviewPDF();
});
