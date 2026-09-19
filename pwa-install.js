(() => {
  let deferredInstallPrompt;
  const installButton = document.getElementById('installAppBtn');
  const installNotice = document.getElementById('installAppNotice');
  const installedStorageKey = 'levelingUpPwaInstalled';

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (!installButton) return;

  const showInstallNotice = (message) => {
    if (!installNotice) return;
    installNotice.textContent = message;
    installNotice.hidden = false;
  };

  if (isStandalone || window.localStorage.getItem(installedStorageKey) === 'true') {
    installButton.hidden = true;
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      showInstallNotice(isIos
        ? 'To install Leveling Up on iPhone or iPad: open this page in Safari, tap Share, then choose Add to Home Screen.'
        : 'To install Leveling Up: open your browser menu and choose Install app. This requires the published HTTPS website, not a local file or an in-app browser.');
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = undefined;
    installButton.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = undefined;
    window.localStorage.setItem(installedStorageKey, 'true');
    installButton.hidden = true;
    if (installNotice) installNotice.hidden = true;
  });
})();
