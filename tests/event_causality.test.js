import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { commandRef, entityRef, eventRef, pushEvent } from '../engine/model/events.js';

test('events receive stable monotonic IDs and survive deterministic save/load continuation', () => {
  const world = createWorld({ seed: 42, width: 12, height: 12, population: 0 });
  assert.deepEqual(world.history.map((event) => event.id), [1]);

  const land = world.tiles.find((tile) => tile.passable);
  applyCommand(world, { type: 'spawn_human', x: land.x, y: land.y, count: 2 });
  assert.equal(world.history.at(-1).id, 2);
  assert.deepEqual(world.history.at(-1).causes, [{ kind: 'command', id: 1, commandType: 'spawn_human' }]);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  tickWorld(world, 500);
  tickWorld(restored, 500);
  assert.deepEqual(snapshotWorld(world), snapshotWorld(restored));
});

test('rejected commands do not consume command IDs', () => {
  const world = createWorld({ seed: 7, width: 12, height: 12, population: 0 });
  const land = world.tiles.find((tile) => tile.passable);
  assert.throws(() => applyCommand(world, { type: 'spawn_human', x: -1, y: 0, count: 1 }), /x must/);
  assert.equal(world.nextCommandId, 1);
  applyCommand(world, { type: 'spawn_human', x: land.x, y: land.y, count: 1 });
  assert.equal(world.nextCommandId, 2);
  assert.equal(world.history.at(-1).causes[0].id, 1);
});

test('serialized causal references cover command, entity, and prior-event causes', () => {
  const world = createWorld({ seed: 9, width: 12, height: 12, population: 0 });
  const parent = pushEvent(world, { type: 'test.parent' });
  const child = pushEvent(world, {
    type: 'test.child',
    subject: entityRef('human', 99),
    causes: [commandRef(3, 'test.command'), entityRef('human', 12), eventRef(parent.id)]
  });

  assert.deepEqual(child.causes, [
    { kind: 'command', id: 3, commandType: 'test.command' },
    { kind: 'entity', entityKind: 'human', id: 12 },
    { kind: 'event', id: parent.id }
  ]);
  assert.throws(
    () => pushEvent(world, { type: 'test.future', causes: [eventRef(world.nextEventId)] }),
    /prior event/
  );
});

test('event references remain stable when their parent is evicted from bounded history', () => {
  const world = createWorld({ seed: 11, width: 12, height: 12, population: 0, config: { maxEventHistory: 2 } });
  const parent = pushEvent(world, { type: 'test.parent' });
  const child = pushEvent(world, { type: 'test.child', causes: [eventRef(parent.id)] });

  assert.equal(world.history.some((event) => event.id === parent.id), true);
  pushEvent(world, { type: 'test.tail' });
  assert.equal(world.history.some((event) => event.id === parent.id), false);
  assert.deepEqual(child.causes, [{ kind: 'event', id: parent.id }]);
});
