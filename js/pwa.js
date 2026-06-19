const PWA = (() => {
  const $ = id => document.getElementById(id);
  let deferredPrompt = null;
  let installShown = false;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function show(el) {
    el?.classList.remove('hidden');
  }

  function hide(el) {
    el?.classList.add('hidden');
  }

  async function install() {
    if (!deferredPrompt) {
      if (isIOS()) show($('ios-install-hint'));
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    hide($('install-banner'));
    installShown = true;
    return outcome === 'accepted';
  }

  function maybeAutoInstall() {
    if (installShown || isStandalone() || !deferredPrompt) return;
    if (isAndroid()) {
      installShown = true;
      setTimeout(() => install(), 1200);
    }
  }

  function init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      maybeAutoInstall();
    });

    $('install-btn')?.addEventListener('click', () => install());
    $('install-dismiss')?.addEventListener('click', () => hide($('install-banner')));
    $('ios-hint-close')?.addEventListener('click', () => hide($('ios-install-hint')));

    if (isStandalone()) {
      hide($('install-banner'));
      hide($('ios-install-hint'));
    }

    window.addEventListener('appinstalled', () => {
      hide($('install-banner'));
      deferredPrompt = null;
      installShown = true;
    });
  }

  return { init, isStandalone, isIOS, isAndroid, install };
})();