(() => {
  const invoke = window.__TAURI__?.core?.invoke;
  const el = id => document.getElementById(id);
  const buttons = { check: el('check'), download: el('download'), install: el('install') };
  let snapshot = { phase: 'idle', current: '', version: null, notes: '', downloaded: 0, total: null, error: null };
  let pending = null;
  let actionError = null;
  let statusError = null;
  let revision = 0;
  let stopped = false;
  let timer;

  const busy = () => !!pending || ['checking', 'downloading', 'installing'].includes(snapshot.phase);
  const bytes = count => `${(Math.max(0, count) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;

  function render() {
    const s = snapshot;
    const previousFocus = document.activeElement;
    document.body.dataset.phase = s.phase;
    el('current').textContent = s.current ? `Installed version ${s.current}` : 'Reading your app version…';
    const next = s.version ? `Lilt ${s.version}` : 'A new version of Lilt';
    const messages = {
      idle: 'Check when you’re ready.',
      checking: 'Checking for updates…',
      up_to_date: 'Lilt is up to date.',
      available: `${next} is available.`,
      downloading: `Downloading ${s.version ? `Lilt ${s.version}` : 'the update'}…`,
      ready: `${next} is ready to install.`,
      installing: 'Updating Lilt. Your app will restart…',
      unconfigured: 'Updates are not configured for this build.',
    };
    el('status').textContent = messages[s.phase] ?? 'The updater could not read its status. Try checking again.';
    const error = actionError || s.error || statusError;
    el('error').textContent = error || '';
    el('error').hidden = !error;
    buttons.check.disabled = busy() || !['idle', 'up_to_date', 'available'].includes(s.phase) || !invoke;
    buttons.download.hidden = !['available', 'downloading'].includes(s.phase);
    buttons.install.hidden = !['ready', 'installing'].includes(s.phase);
    buttons.download.disabled = busy() || s.phase !== 'available';
    buttons.install.disabled = busy() || s.phase !== 'ready';
    el('progress-wrap').hidden = s.phase !== 'downloading';
    if (Number.isFinite(s.total) && s.total > 0) {
      el('progress').max = s.total;
      el('progress').value = Math.min(s.total, Math.max(0, s.downloaded));
      el('progress-label').textContent = `${bytes(s.downloaded)} of ${bytes(s.total)} downloaded`;
    } else {
      el('progress').removeAttribute('value');
      el('progress-label').textContent = `${bytes(s.downloaded)} downloaded`;
    }
    el('hint').textContent = s.phase === 'installing'
      ? 'Keep Lilt open while the update finishes.'
      : s.phase === 'ready'
        ? 'Finish your take before restarting. Your recordings stay on this computer.'
        : s.phase === 'downloading'
          ? 'You can close this window. The download will continue.'
          : s.phase === 'unconfigured'
            ? 'This copy of Lilt does not have an update source set up.'
            : 'You choose when to download and restart.';
    el('release').hidden = !s.version;
    el('release-title').textContent = s.version ? `What’s new in ${s.version}` : 'What’s new';
    // Release notes come from a remote release; never interpret them as HTML.
    el('notes').textContent = s.notes || 'No release notes were included.';
    if (Object.values(buttons).includes(previousFocus) && previousFocus.hidden) {
      const nextButton = Object.values(buttons).find(button => !button.hidden && !button.disabled);
      nextButton?.focus();
    }
  }

  const explain = error => error instanceof Error ? error.message : String(error);

  async function act(action) {
    if (busy() || !invoke || buttons[action].hidden || buttons[action].disabled) return;
    pending = action;
    revision++;
    actionError = null;
    statusError = null;
    render();
    try {
      snapshot = await invoke(`update_${action}`);
    } catch (error) {
      actionError = explain(error);
    } finally {
      // Ignore status reads started before this command finished.
      revision++;
      pending = null;
      render();
    }
  }

  async function refresh() {
    const started = revision;
    try {
      const next = await invoke('update_status');
      if (started === revision) { snapshot = next; statusError = null; render(); }
    } catch (error) {
      if (started === revision) { statusError = explain(error); render(); }
    } finally {
      if (!stopped) timer = window.setTimeout(refresh, 750);
    }
  }

  for (const [action, button] of Object.entries(buttons)) button.addEventListener('click', () => void act(action));
  window.addEventListener('pagehide', () => { stopped = true; window.clearTimeout(timer); });
  if (invoke) void refresh();
  else {
    snapshot.phase = 'unconfigured';
    render();
    el('current').textContent = 'Open this window from the installed Lilt app.';
  }
})();
