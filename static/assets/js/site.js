(() => {
  const button = document.querySelector('[data-menu-button]');
  const nav = document.querySelector('[data-menu]');
  if (button && nav) {
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      nav.toggleAttribute('data-open', !open);
    });
  }

  // Analytics-ready CTA event. No personal information is collected here.
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-track]');
    if (!target) return;
    window.dispatchEvent(new CustomEvent('zenai:cta', {
      detail: { action: target.dataset.track, path: location.pathname }
    }));
  });
})();
