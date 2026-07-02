(function () {
  const BLOCK_KEY    = 'isf_pin_block';
  const ATTEMPTS_KEY = 'isf_pin_attempts';
  const SESSION_KEY  = 'isf_session';
  const RETURN_KEY   = 'isf_pin_return';
  const MAX_ATTEMPTS = 3;
  const PEEK_MS      = 500;

  const inputs      = Array.from(document.querySelectorAll('.pin-input'));
  const errorEl     = document.getElementById('pin-error');
  const attemptsEl  = document.getElementById('pin-attempts');
  const formArea    = document.getElementById('pin-form-area');
  const blockedArea = document.getElementById('pin-blocked-area');
  const loadingEl   = document.getElementById('pin-loading');
  const countdownEl = document.getElementById('pin-countdown');

  // PIN real nunca queda en el DOM — se guarda aquí y se limpia siempre
  const pinValues = ['', '', '', '', ''];

  function clearPin() {
    pinValues.fill('');
    inputs.forEach(inp => {
      clearTimeout(inp._peekTimer);
      inp.type  = 'password';
      inp.value = '';
      inp.classList.remove('filled');
    });
  }

  function getRemainingBlock() {
    const data = JSON.parse(localStorage.getItem(BLOCK_KEY) || 'null');
    if (!data) return 0;
    const remaining = CONFIG.PIN_BLOCK_MINUTES * 60 * 1000 - (Date.now() - data.ts);
    if (remaining > 0) return remaining;
    localStorage.removeItem(BLOCK_KEY);
    localStorage.removeItem(ATTEMPTS_KEY);
    return 0;
  }

  function showBlocked(remaining) {
    formArea.hidden    = true;
    loadingEl.hidden   = true;
    blockedArea.hidden = false;
    tick(remaining);
  }

  function tick(remaining) {
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    countdownEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    const r = getRemainingBlock();
    if (r > 0) setTimeout(() => tick(r), 1000);
    else location.reload();
  }

  // Comprobar bloqueo al cargar
  const blocked = getRemainingBlock();
  if (blocked) showBlocked(blocked);
  else inputs[0].focus();

  // Comportamiento OTP con peek
  inputs.forEach((inp, i) => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace') {
        clearTimeout(inp._peekTimer);
        pinValues[i] = '';
        inp.type  = 'password';
        inp.value = '';
        inp.classList.remove('filled');
        if (i > 0) inputs[i - 1].focus();
      }
    });

    inp.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '').slice(-1);
      if (!val) { inp.value = ''; return; }

      pinValues[i] = val;
      inp.type  = 'text';  // mostrar dígito
      inp.value = val;
      inp.classList.add('filled');

      // Ocultar tras PEEK_MS
      clearTimeout(inp._peekTimer);
      inp._peekTimer = setTimeout(() => {
        inp.type = 'password';
      }, PEEK_MS);

      if (i < 4) inputs[i + 1].focus();
      if (pinValues.every(v => v)) submitPin();
    });

    inp.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 5);
      text.split('').forEach((ch, idx) => {
        if (!inputs[idx]) return;
        pinValues[idx] = ch;
        inputs[idx].type  = 'text';
        inputs[idx].value = ch;
        inputs[idx].classList.add('filled');
        clearTimeout(inputs[idx]._peekTimer);
        inputs[idx]._peekTimer = setTimeout(() => {
          inputs[idx].type = 'password';
        }, PEEK_MS);
      });
      if (text.length === 5) submitPin();
      else if (inputs[text.length]) inputs[text.length].focus();
    });
  });

  async function submitPin() {
    const pin = pinValues.join('');
    if (pin.length < 5) return;

    formArea.hidden  = true;
    loadingEl.hidden = false;
    errorEl.textContent   = '';
    attemptsEl.textContent = '';
    clearPin(); // limpiar inputs antes de enviar

    try {
      const res  = await apiFetch(CONFIG.N8N_PIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();

      if (data.valid) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
        localStorage.removeItem(ATTEMPTS_KEY);
        const returnUrl = localStorage.getItem(RETURN_KEY) || ROUTES.asistencia;
        localStorage.removeItem(RETURN_KEY);
        window.location.replace(returnUrl);
      } else {
        let attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0') + 1;
        localStorage.setItem(ATTEMPTS_KEY, String(attempts));
        loadingEl.hidden = true;
        formArea.hidden  = false;
        inputs[0].focus();

        if (attempts >= MAX_ATTEMPTS) {
          localStorage.setItem(BLOCK_KEY, JSON.stringify({ ts: Date.now() }));
          localStorage.removeItem(ATTEMPTS_KEY);
          showBlocked(CONFIG.PIN_BLOCK_MINUTES * 60 * 1000);
        } else {
          errorEl.textContent    = 'Código incorrecto';
          attemptsEl.textContent = `Intento ${attempts} de ${MAX_ATTEMPTS}`;
        }
      }
    } catch {
      loadingEl.hidden = true;
      formArea.hidden  = false;
      inputs[0].focus();
      errorEl.textContent = 'Error de conexión, intenta de nuevo';
    }
  }
})();
