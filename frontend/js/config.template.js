const CONFIG = {
  N8N_SUBMIT:      '${N8N_SUBMIT}',
  N8N_REFDATA:     '${N8N_REFDATA}',
  N8N_GET_MES:     '${N8N_GET_MES}',
  N8N_BACKUP:      '${N8N_BACKUP}',
  N8N_CHECK:       '${N8N_CHECK}',
  N8N_DASHBOARD:   '${N8N_DASHBOARD}',
  N8N_BACKUP_ALL:  '${N8N_BACKUP_ALL}',
  N8N_ACTIVIDADES: '${N8N_ACTIVIDADES}',
  N8N_CONTROL:     '${N8N_CONTROL}',
  API_KEY:         '${API_KEY}',

  PROYECTO: 'ISF Peru',
  MESES: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
};

function apiFetch(url, options = {}) {
  const headers = { 'x-api-key': CONFIG.API_KEY, ...(options.headers || {}) };
  return fetch(url, { ...options, headers });
}
