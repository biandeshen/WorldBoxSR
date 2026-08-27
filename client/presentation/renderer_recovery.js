export function rendererRecoveryDestinations({ href, renderer = 'phaser' } = {}) {
  if (typeof href !== 'string' || href.length === 0) throw new TypeError('renderer recovery href is required');
  const current = new URL(href);
  const normalizedRenderer = renderer === 'legacy' ? 'legacy' : 'phaser';
  const retryHref = current.href;

  if (normalizedRenderer === 'legacy') {
    return {
      renderer: normalizedRenderer,
      retryHref,
      legacyHref: null,
      dropsScenario: false
    };
  }

  const legacy = new URL(current.href);
  legacy.searchParams.set('renderer', 'legacy');
  const dropsScenario = legacy.searchParams.has('scenario');
  if (dropsScenario) legacy.searchParams.delete('scenario');

  return {
    renderer: normalizedRenderer,
    retryHref,
    legacyHref: legacy.href,
    dropsScenario
  };
}

export function rendererRecoveryPresentation({ renderer = 'phaser', dropsScenario = false } = {}) {
  const normalizedRenderer = renderer === 'legacy' ? 'legacy' : 'phaser';
  if (normalizedRenderer === 'legacy') {
    return {
      heading: 'Compatibility renderer could not start',
      retryLabel: 'Retry compatibility renderer',
      fallbackLabel: null,
      note: 'Retry reloads this same renderer and keeps the current URL.'
    };
  }

  return {
    heading: 'Phaser renderer could not start',
    retryLabel: 'Retry Phaser',
    fallbackLabel: 'Compatibility renderer',
    note: dropsScenario
      ? 'Compatibility renderer cannot run Scenario links; it will open an ordinary world.'
      : 'Compatibility mode opens the existing Legacy Canvas renderer.'
  };
}
