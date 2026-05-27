# Timesheet Automation — ISF Peru

Sistema de registro de participaciones por reunión, automatizado con n8n y una app web propia.

---

## Problema que resuelve

Actualmente cada persona del equipo (11+) debe entrar manualmente a su Excel mensual después de cada reunión para registrar: día trabajado, actividad, lugar y proyecto. Esto es lento, propenso a errores y no escala.

---

## Solución

Una app web hosteada en el servidor propio del equipo, conectada a n8n, que permite:

1. **Registrar** una participación en segundos desde cualquier dispositivo
2. **Ver** el resumen mensual de registros propios
3. **Controlar** las horas consumidas por actividad *(fase 2)*

---

## Arquitectura

```
[App Web] ──POST──▶ [n8n Webhook] ──▶ [Lee Reference_Data.xlsx]
                                  ──▶ [Busca o crea Nombre_Mes_Año.xlsx]
                                  ──▶ [Escribe fila del día]
                                  ──▶ [Guarda en Google Drive / servidor]
                                  ──▶ [Notificación confirmación]

[App Web] ──GET───▶ [n8n Webhook] ──▶ [Lee Excel del usuario ese mes]
                                  ──▶ [Devuelve registros en JSON]
                                  ──▶ [App muestra dashboard]
```

---

## Estructura de archivos

```
project/
├── README.md                        ← este archivo
├── frontend/
│   ├── index.html                   ← formulario de registro
│   ├── dashboard.html               ← vista de registros del mes
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── form.js                  ← lógica del formulario + fetch al webhook
│       └── dashboard.js             ← fetch y render de registros
├── data/
│   └── Reference_Data.xlsx          ← hoja de control única (miembros, actividades)
└── excels/
    └── [Nombre]_[Mes]_[Año].xlsx    ← uno por persona por mes (generado automático)
```

---

## Archivos Excel

### `Reference_Data.xlsx` — hoja de control compartida
| Columna | Contenido |
|---|---|
| Select Team Member | Lista de todos los integrantes |
| Select remark | Todas las actividades (ISF Peru - 1.1 hasta 9.2) |
| Project | ISF Peru (fijo) |
| Expert / Institution / Daily Rate | Info por persona |

> Agregar un nuevo miembro = añadir una fila aquí. El formulario lo detecta automáticamente.

### `[Nombre]_[Mes]_[Año].xlsx` — timesheet individual
- Se crea automáticamente si no existe (copia de la plantilla modelo)
- Una por persona por mes
- Columnas que se llenan: `Days worked` · `Place of Performance` · `Remarks` · `Project`
- Columnas que NO se tocan: `Date` (fórmula) · `Daily Rate` (fórmula)

---

## Campos del formulario

| Campo | Tipo | Fuente |
|---|---|---|
| Nombre | Dropdown | Reference_Data → Select Team Member |
| Día | Dropdown | 1 al 31 (según mes actual) |
| Días trabajados | Dropdown | 0.5 · 1 |
| Lugar | Dropdown | Remote · Field |
| Actividad (Remarks) | Dropdown | Reference_Data → Select remark |
| Proyecto | Automático | Siempre "ISF Peru" |

> Todo es selección — el usuario no escribe nada manualmente.

---

## Fases de desarrollo

### Fase 1 — Core (MVP)
- [ ] Separar `Reference_Data.xlsx` como hoja de control independiente
- [ ] Crear plantilla modelo limpia del timesheet
- [ ] Página web: formulario de registro con dropdowns
- [ ] Workflow n8n: recibir datos → buscar/crear Excel → escribir fila → guardar
- [ ] Confirmación visual al usuario tras el registro

### Fase 2 — Dashboard personal
- [ ] Página web: vista de registros del mes por usuario
- [ ] n8n endpoint GET: leer Excel del usuario y devolver JSON
- [ ] Mostrar tabla de participaciones del mes
- [ ] Mostrar total de días trabajados acumulados

### Fase 3 — Control de horas por actividad
- [ ] Horas máximas definidas por actividad y por usuario en Reference_Data
- [ ] Dashboard muestra % consumido por actividad
- [ ] Alerta visual si se supera el límite

### Fase 4 — Administración
- [ ] Vista de admin: ver todos los timesheets del mes
- [ ] Agregar/quitar miembros desde la app (actualiza Reference_Data)
- [ ] Exportar resumen mensual consolidado

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML · CSS · JavaScript vanilla |
| Backend / automatización | n8n (self-hosted) |
| Procesamiento Excel | Python + openpyxl (nodo Code de n8n) |
| Almacenamiento | Google Drive o servidor propio |
| Hosting | Servidor propio con dominio |
| Notificaciones | Email o Slack vía n8n |

---

## Lógica de fila en el Excel

El día seleccionado en el formulario se traduce a la fila Excel con:

```
fila_excel = día + 15
```

Ejemplo: día 9 → fila 24 del Excel (porque las filas 1–15 son headers).

---

## Cómo agregar un nuevo integrante

1. Abrir `Reference_Data.xlsx`
2. Agregar una fila con el nombre del nuevo miembro en `Select Team Member`
3. Listo — el formulario lo detecta automáticamente en el siguiente registro

No se necesita crear nada más manualmente. n8n crea su Excel la primera vez que registra.

---

## Notas importantes

- El campo `Project` siempre es **ISF Peru** — hardcodeado, no editable por el usuario
- `Daily Rate` y `Date` tienen fórmulas propias en el Excel — n8n **nunca** las toca
- La plantilla modelo es el Excel de referencia — todos los timesheets individuales se generan a partir de ella
- El sistema es multi-cliente: si en el futuro hay otro cliente, se replica la estructura con su propio `Reference_Data`