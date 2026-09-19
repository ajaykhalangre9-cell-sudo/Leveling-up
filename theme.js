(() => {
  const storageKey = 'levelingUpTheme';

  const applyTheme = (theme) => {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-theme', isLight);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.textContent = isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme';
    }
  };

  const getSavedTheme = () => localStorage.getItem(storageKey) || 'dark';

  window.levelingUpTheme = {
    apply: applyTheme,
    current: getSavedTheme,
    toggle() {
      const nextTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
      localStorage.setItem(storageKey, nextTheme);
      applyTheme(nextTheme);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getSavedTheme());
    document.getElementById('themeToggle')?.addEventListener('click', window.levelingUpTheme.toggle);
  });
})();
