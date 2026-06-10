(function () {
  const SESSION_KEY = 'isf_session';
  const RETURN_KEY  = 'isf_pin_return';

  function redirect() {
    localStorage.setItem(RETURN_KEY, window.location.href);
    window.location.replace('/pin');
  }

  const data = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  if (!data) return redirect();

  const sessionMs = CONFIG.PIN_SESSION_HOURS * 3600 * 1000;
  if (Date.now() - data.ts > sessionMs) {
    sessionStorage.removeItem(SESSION_KEY);
    return redirect();
  }
})();
