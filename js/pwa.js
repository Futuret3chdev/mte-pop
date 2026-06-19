const PWA = (() => {
  function init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js?v=13').catch(() => {});
    }
  }

  return { init };
})();