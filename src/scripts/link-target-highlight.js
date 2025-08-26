function highlightTarget() {
  const hash = window.location.hash;
  // Prüfe, ob das Hash mit "#v-" beginnt
  if (hash && hash.startsWith('#v-')) {
    const target = document.querySelector(hash);
    if (target) {
      target.classList.add('target_highlight');
      setTimeout(() => {
        target.classList.add('fade-out');
      }, 3000);
      setTimeout(() => {
        target.classList.remove('target_highlight', 'fade-out');
      }, 4000);
    }
  }
}

window.addEventListener('load', highlightTarget);
window.addEventListener('hashchange', highlightTarget);
