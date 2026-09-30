(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  const status = document.querySelector('#form-status');
  const submit = form.querySelector('button[type="submit"]');
  const params = new URLSearchParams(location.search);
  const interest = params.get('interest');

  if (interest) {
    const select = form.elements.interest;
    const option = [...select.options].find(o => o.value === interest) ||
      [...select.options].find(o => o.value.toLowerCase().includes(interest.toLowerCase()));
    if (option) select.value = option.value;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('', '');

    const accessKey = String(form.elements.access_key?.value || '').trim();
    if (!accessKey || accessKey.includes('PASTE_WEB3FORMS_ACCESS_KEY_HERE')) {
      setStatus('The contact form needs its Web3Forms access key before it can send enquiries. Please email info@cloudtechinfo.com for now.', 'warning');
      return;
    }

    submit.disabled = true;
    const originalText = submit.textContent;
    submit.textContent = 'Sending...';
    setStatus('Sending your enquiry...', '');

    try {
      const formData = new FormData(form);
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to send enquiry.');
      }

      form.reset();
      if (interest) {
        const select = form.elements.interest;
        const option = [...select.options].find(o => o.value === interest) ||
          [...select.options].find(o => o.value.toLowerCase().includes(interest.toLowerCase()));
        if (option) select.value = option.value;
      }
      setStatus('Thank you. Your enquiry has been sent successfully. We will be in touch.', 'success');
    } catch (error) {
  setStatus(
    error?.message || 'We could not send your enquiry. Please email info@cloudtechinfo.com.',
    'warning');
    } finally {
      submit.disabled = false;
      submit.textContent = originalText;
    }
  });

  function setStatus(message, type) {
    status.textContent = message;
    status.dataset.state = type;
    status.hidden = !message;
  }
})();
