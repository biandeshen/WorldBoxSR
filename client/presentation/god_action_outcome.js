export function acceptedGodAction(effect, details = {}) {
  const noEffect = details?.noEffect === true;
  return {
    ...details,
    accepted: true,
    effect,
    noEffect,
    status: noEffect ? 'no_effect' : 'applied'
  };
}

export function isAppliedGodAction(outcome) {
  return outcome?.accepted === true && outcome.status === 'applied';
}

export function isNoEffectGodAction(outcome) {
  return outcome?.accepted === true && outcome.status === 'no_effect';
}
