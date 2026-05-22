(function () {
  function markNoTranslate(root = document) {
    const selectors = [
      'input',
      'textarea',
      'select',
      'option',
      '.material-symbols-outlined',
      '.model-search-btn',
      '.model-search-results',
      '.eye-toggle',
      '.field-control',
      '.relative-container',
      '.notranslate',
      '[data-no-translate]'
    ];

    selectors.forEach((sel) => {
      root.querySelectorAll(sel).forEach((el) => {
        el.setAttribute('translate', 'no');
        el.classList.add('notranslate');
      });
    });

    // не даём переводчику трогать кодоподобные значения
    root.querySelectorAll('code, pre').forEach((el) => {
      el.setAttribute('translate', 'no');
      el.classList.add('notranslate');
    });

    // provider / model name / api key поля
    root.querySelectorAll('.field, .model-section').forEach((field) => {
      const title = field.textContent || '';
      if (
        /Provider|Model name|API key|Embedding|OpenRouter|anthropic|claude|gpt|kimi|gemini/i.test(title)
      ) {
        field.querySelectorAll('*').forEach((el) => {
          if (
            el.matches('input, textarea, select, option, .field-control, .relative-container, .model-search-btn, .model-search-results')
          ) {
            el.setAttribute('translate', 'no');
            el.classList.add('notranslate');
          }
        });
      }
    });
  }

  function run() {
    markNoTranslate(document);
  }

  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node && node.nodeType === 1) {
          markNoTranslate(node);
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  });
})();
