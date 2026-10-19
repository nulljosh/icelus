import { useState, useEffect } from 'react';
import { account, cleanName, displayName, validEmail, validPassword, authProblem, NAME_MAX } from '../lib/account.js';
import { t, language, LANGUAGES, languageName, setLanguage } from '../i18n.js';
import './AccountPanel.css';

// Who is signed in, kept in step with the client. A reset link (?recovery_token=) opens the panel on its own.
export function useAccount(enabled) {
  const [user, setUser] = useState(null);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    const { data } = account().auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, [enabled]);
  return { user, setUser, recovery, setRecovery };
}

const back = () => `${location.origin}/app/`;

// Signed out: sign in, create an account, or ask for a reset link. Signed in: your name, sign out, delete.
function Profile({ user, setUser, recovery, setRecovery }) {
  const [view, setView] = useState(recovery ? 'reset' : 'signin'); // signin | signup | forgot | sent | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(displayName(user));
  const [problem, setProblem] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => setName(displayName(user)), [user]);
  useEffect(() => { if (recovery) setView('reset'); }, [recovery]);

  const run = async (work) => {
    setBusy(true); setProblem(null); setNotice(null);
    try { await work(); } catch { setProblem('auth_offline'); } finally { setBusy(false); }
  };
  const submit = e => {
    e.preventDefault();
    if (view !== 'reset' && !validEmail(email)) { setProblem('auth_email'); return; }
    if ((view === 'signin' || view === 'signup' || view === 'reset') && !validPassword(password)) { setProblem('auth_password'); return; }
    run(async () => {
      const auth = account().auth;
      if (view === 'signin') {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) setProblem(authProblem(error)); else setPassword('');
      } else if (view === 'signup') {
        const { error } = await auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: back() } });
        if (error) setProblem(authProblem(error)); else { setPassword(''); setView('sent'); setNotice('check_email'); }
      } else if (view === 'forgot') {
        const { error } = await auth.resetPasswordForEmail(email.trim(), { redirectTo: back() });
        if (error) setProblem(authProblem(error)); else { setView('sent'); setNotice('reset_sent'); }
      } else if (view === 'reset') {
        const { error } = await auth.updateUser({ password });
        if (error) setProblem(authProblem(error)); else { setPassword(''); setRecovery(false); setNotice('password_saved'); }
      }
    });
  };

  if (user && view !== 'reset') {
    const saveName = e => {
      e.preventDefault();
      run(async () => {
        const { data, error } = await account().auth.updateUser({ data: { display_name: cleanName(name) } });
        if (error) setProblem(authProblem(error)); else { setUser(data.user); setNotice('name_saved'); }
      });
    };
    const remove = () => run(async () => {
      const { error } = await account().auth.deleteAccount();
      if (error) setProblem(authProblem(error)); else { setUser(null); setDeleting(false); setNotice('account_deleted'); }
    });
    return (
      <div className="account-body">
        <p className="account-who">{t('signed_in_as', { email: user.email })}</p>
        <form className="account-form" onSubmit={saveName}>
          <label className="account-label" htmlFor="account-name">{t('display_name')}</label>
          <input id="account-name" className="account-input" value={name} maxLength={NAME_MAX} autoComplete="nickname"
            onChange={e => setName(e.target.value)} />
          <button className="btn" type="submit" disabled={busy || cleanName(name) === displayName(user)}>{t('save')}</button>
        </form>
        {problem && <p className="account-problem" role="alert">{t(problem)}</p>}
        {notice && <p className="account-notice" role="status">{t(notice)}</p>}
        <div className="account-actions">
          <button className="btn" type="button" disabled={busy} onClick={() => run(async () => { await account().auth.signOut(); setUser(null); })}>{t('sign_out')}</button>
          {!deleting && <button className="btn btn-danger" type="button" onClick={() => setDeleting(true)}>{t('delete_account')}</button>}
        </div>
        {deleting && (
          <div className="account-danger" role="alertdialog" aria-label={t('delete_account')}>
            <p>{t('delete_confirm')}</p>
            <div className="account-actions">
              <button className="btn" type="button" onClick={() => setDeleting(false)}>{t('cancel')}</button>
              <button className="btn btn-danger" type="button" disabled={busy} onClick={remove}>{t('delete_for_good')}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const title = { signin: 'sign_in', signup: 'create_account', forgot: 'forgot_password', sent: 'check_inbox', reset: 'new_password' }[view];
  return (
    <div className="account-body">
      <p className="account-why">{t('account_why')}</p>
      {/* Signing in needs no heading of its own: the sheet says Profile and the button says Sign in. */}
      {view !== 'signin' && <h3 className="account-title">{t(title)}</h3>}
      {view !== 'sent' && (
        <form className="account-form" onSubmit={submit} noValidate>
          {view !== 'reset' && <>
            <label className="account-label" htmlFor="account-email">{t('email')}</label>
            <input id="account-email" className="account-input" type="email" autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} />
          </>}
          {view !== 'forgot' && <>
            <label className="account-label" htmlFor="account-password">{t(view === 'reset' ? 'new_password' : 'password')}</label>
            <input id="account-password" className="account-input" type="password" value={password} aria-describedby="password-hint"
              autoComplete={view === 'signin' ? 'current-password' : 'new-password'} onChange={e => setPassword(e.target.value)} />
            {view !== 'signin' && <span id="password-hint" className="account-hint">{t('password_hint')}</span>}
          </>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {t({ signin: 'sign_in', signup: 'create_account', forgot: 'send_reset', reset: 'save_password' }[view])}
          </button>
        </form>
      )}
      {problem && <p className="account-problem" role="alert">{t(problem)}</p>}
      {notice && <p className="account-notice" role="status">{t(notice)}</p>}
      <div className="account-switch">
        {view === 'signin' && <>
          <button type="button" className="account-link" onClick={() => { setView('signup'); setProblem(null); }}>{t('no_account')}</button>
          <button type="button" className="account-link" onClick={() => { setView('forgot'); setProblem(null); }}>{t('forgot_password')}</button>
        </>}
        {view === 'reset' && <button type="button" className="account-link" onClick={() => { setRecovery(false); setView('signin'); setProblem(null); setNotice(null); }}>{t('not_now')}</button>}
        {view !== 'signin' && view !== 'reset' && <button type="button" className="account-link" onClick={() => { setView('signin'); setProblem(null); setNotice(null); }}>{t('have_account')}</button>}
      </div>
    </div>
  );
}

// Settings: what used to sit around the app, in one place.
function Settings({ darkMode, setDarkMode, look, setLook, more, setMore, onTutorial }) {
  return (
    <div className="account-body">
      <div className="account-group">
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="setting-theme">{t('theme')}</label>
        <select id="setting-theme" className="inspector-select" value={darkMode ? 'dark' : 'light'} onChange={e => setDarkMode(e.target.value === 'dark')}>
          <option value="light">{t('theme_light')}</option>
          <option value="dark">{t('theme_dark')}</option>
        </select>
      </div>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="setting-look">{t('look')}</label>
        <select id="setting-look" className="inspector-select" value={look} onChange={e => setLook(e.target.value)}>
          <option value="real">{t('look_real')}</option>
          <option value="text">{t('look_text')}</option>
        </select>
      </div>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="setting-language">{t('language')}</label>
        <select id="setting-language" className="inspector-select" value={language} onChange={e => setLanguage(e.target.value)}>
          {LANGUAGES.map(code => <option key={code} value={code}>{languageName(code)}</option>)}
        </select>
      </div>
      <div className="inspector-row">
        <label className="inspector-key" htmlFor="setting-more">{t('show_more')}</label>
        <input id="setting-more" type="checkbox" className="inspector-switch" checked={more} onChange={e => setMore(e.target.checked)} />
      </div>
      </div>
      {onTutorial && <button type="button" className="btn account-wide" onClick={onTutorial}>{t('tutorial')}</button>}
    </div>
  );
}

// One sheet, one job: the nav bar opens Profile or Settings directly, so there are no tabs to switch.
export default function AccountPanel({ tab = 'profile', onClose, user, setUser, recovery, setRecovery, settings }) {
  return (
    <div className="tour-overlay" onClick={onClose}>
      <div className="tour-card account-card" role="dialog" aria-modal="true" aria-label={t(tab)} onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <div className="account-head">
          <h2 className="account-title">{t(tab)}</h2>
          <button type="button" className="account-done" onClick={onClose}>{t('done')}</button>
        </div>
        {tab === 'settings'
          ? <Settings {...settings} />
          : <Profile user={user} setUser={setUser} recovery={recovery} setRecovery={setRecovery} />}
      </div>
    </div>
  );
}
