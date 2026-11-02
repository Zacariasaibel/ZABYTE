import assert from 'node:assert/strict';
import { compiled } from './test-runtime.mjs';

const { NotificationTimer } = await import(compiled + 'notification-timer.js');
let now = 0;
let nextId = 0;
const tasks = new Map();
const clock = {
  now: () => now,
  set: (callback, delay) => { const id = ++nextId; tasks.set(id, { at: now + delay, callback }); return id; },
  clear: (id) => tasks.delete(id),
};
function advance(duration) {
  const end = now + duration;
  for (;;) {
    const next = [...tasks.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!next) break;
    now = next[1].at; tasks.delete(next[0]); next[1].callback();
  }
  now = end;
}
let dismissed = 0;
const timer = new NotificationTimer(() => dismissed++, clock);
timer.start(); advance(5999); assert.equal(dismissed, 0); advance(1); assert.equal(dismissed, 1);
timer.start(); advance(1000); timer.pause('pointer'); timer.pause('focus'); advance(20000);
assert.equal(dismissed, 1, 'No timeout while interacting');
timer.resume('pointer'); advance(20000); assert.equal(dismissed, 1, 'Keyboard focus still pauses');
timer.resume('focus'); advance(4999); assert.equal(dismissed, 1); advance(1); assert.equal(dismissed, 2);
timer.start(); advance(3000); timer.start(); advance(5999); assert.equal(dismissed, 2);
advance(1); assert.equal(dismissed, 3, 'A new notice receives its full duration');
timer.start(); timer.pause('focus'); timer.start(); advance(20000); assert.equal(dismissed, 3);
timer.resume('focus'); advance(6000); assert.equal(dismissed, 4);
timer.start(); timer.stop(); advance(20000); assert.equal(dismissed, 4, 'Close/navigation cancels the timer');
assert.equal(tasks.size, 0);
console.log('PASS notification: expiry, simultaneous hover/focus pause, remaining duration, replacement and cancellation.');
