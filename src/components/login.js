export function renderLogin({ configured }) {
  return `
    <main class="login-page">
      <section class="login-brand">
        <div class="brand-mark">NZ</div>
        <div class="brand-copy">
          <p>NICOLA ZECCHI</p>
          <h1>STAFF</h1>
          <span>Organizza. Allena. Migliora.</span>
        </div>
      </section>
      <section class="login-panel">
        <div class="login-card">
          <div class="login-heading">
            <span>AREA RISERVATA</span>
            <h2>Accesso staff</h2>
            <p>Inserisci le credenziali autorizzate per entrare.</p>
          </div>
          ${configured ? '' : '<div class="configuration-warning">Configurazione Supabase mancante. Controlla il file <strong>.env</strong>.</div>'}
          <form id="loginForm" class="login-form">
            <label><span>Email</span><input name="email" type="email" autocomplete="email" required /></label>
            <label><span>Password</span><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" minlength="6" required /><button id="togglePassword" type="button">Mostra</button></div></label>
            <p id="authMessage" class="auth-message"></p>
            <button id="loginButton" class="primary-button" type="submit" ${configured ? '' : 'disabled'}>Accedi</button>
          </form>
        </div>
      </section>
    </main>
  `
}
