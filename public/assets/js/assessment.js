(() => {
  const form = document.querySelector('#capability-assessment');
  const result = document.querySelector('#assessment-result');
  const bars = document.querySelector('#assessment-bars');
  const constraint = document.querySelector('#assessment-constraint');
  if (!form || !result || !bars || !constraint) return;

  const labels = {
    strategy: 'Strategy & Value',
    'operating-model': 'Leadership & Operating Model',
    business: 'Business Capabilities & Processes',
    information: 'Information, Knowledge & Data',
    architecture: 'Enterprise & AI Architecture',
    engineering: 'AI Engineering & Delivery',
    governance: 'Governance, Risk & Trust',
    people: 'People, Skills & Culture',
    change: 'Transformation & Change',
    measurement: 'Measurement & Continuous Evolution'
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const scores = Object.keys(labels).map(key => ({ key, label: labels[key], score: Number(data.get(key)) }));
    if (scores.some(x => !x.score)) return;
    bars.innerHTML = scores.map(x => `<div class="score-row"><div><strong>${x.label}</strong><span>${x.score}/5</span></div><div class="score-track" aria-label="${x.label}: ${x.score} out of 5"><i style="width:${x.score * 20}%"></i></div></div>`).join('');
    const min = Math.min(...scores.map(x => x.score));
    const lows = scores.filter(x => x.score === min).map(x => x.label);
    constraint.innerHTML = `<strong>Lowest self-rated capability:</strong> ${lows.join(', ')}. Treat this as a hypothesis to validate against evidence, dependencies and the capability level your strategy actually requires.`;
    result.hidden = false;
    result.focus();
  });
})();
