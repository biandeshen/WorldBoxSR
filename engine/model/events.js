export function pushEvent(world, event) {
  world.history.push({ day: world.day, ...event });
  const overflow = world.history.length - world.config.maxEventHistory;
  if (overflow > 0) world.history.splice(0, overflow);
}
