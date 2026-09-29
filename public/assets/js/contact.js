(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;
  const status = document.querySelector('#form-status');
  const submit = form.querySelector('button[type="submit"]');
  const challenge = document.querySelector('#turnstile-container');
  let turnstileWidgetId = null;

  const params = new URLSearchParams(location.search);
  const interest = params.get('interest');
  if (interest) {
    const select = form.elements.interest;
    const option = [...select.options].find(o => o.value === interest) || [...select.options].find(o => o.value.toLowerCase().includes(interest.toLowerCase()));
    if (option) select.value = option.value;
  }

  fetch('/api/config', { headers: { 'Accept': 'application/json' } })
    .then(r => r.json())
    .then(config => {
      if (!config.turnstileSiteKey) {
        setStatus('The enquiry form is awaiting final security configuration. Please use the email address shown on this page for now.', 'warning');
        submit.disabled = true;
        return;
      }
      waitForTurnstile(() => {
        turnstileWidgetId = window.turnstile.render(challenge, {
          sitekey: config.turnstileSiteKey,
          theme: 'auto'
        });
      });
    })
    .catch(() => {
      setStatus('The enquiry form could not initialise. Please use the email address shown on this page.', 'error');
      submit.disabled = true;
    });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('', '');
    submit.disabled = true;

    const turnstileToken = turnstileWidgetId !== null && window.turnstile
      ? window.turnstile.getResponse(turnstileWidgetId)
      : '';
    if (!turnstileToken) {
      setStatus('Please complete the security check.', 'error');
      submit.disabled = false;
      return;
    }

    const fd = new FormData(form);
    const payload = {
      name: fd.get('name'),
      email: fd.get('email'),
      company: fd.get('company'),
      role: fd.get('role'),
      country: fd.get('country'),
      interest: fd.get('interest'),
      message: fd.get('message'),
      website: fd.get('website'),
      consent: fd.get('consent') === 'on',
      marketingConsent: fd.get('marketingConsent') === 'on',
      turnstileToken,
      sourcePage: location.href,
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || ''
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to send enquiry.');
      form.reset();
      if (turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
      setStatus(result.message, 'success');
    } catch (error) {
      setStatus(error.message || 'Unable to send enquiry. Please try again.', 'error');
      if (turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    } finally {
      submit.disabled = false;
    }
  });

  function waitForTurnstile(callback, attempt = 0) {
    if (window.turnstile) return callback();
    if (attempt > 100) {
      setStatus('Security check did not load. Please refresh the page.', 'error');
      submit.disabled = true;
      return;
    }
    setTimeout(() => waitForTurnstile(callback, attempt + 1), 100);
  }

  function setStatus(message, type) {
    status.textContent = message;
    status.dataset.state = type;
    status.hidden = !message;
  }
})();
