/* NODE_PATH=~/outils/esbuild/node_modules node --test test/api/ — headless engine harness (tools/engine/harness.js). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
let esbuild = null;
try { esbuild = require('esbuild'); } catch (e) { /* skipped */ }
const H = require('../../tools/engine/harness.js');
const skip = !esbuild && 'esbuild missing';

let booted = null;
function boot() { return booted || (booted = H.bootEngine({ seed: 1, extra: ["export { defineJobs } from './src/jobs.js';"] })); }

test('the engine boots headless (protoplasm, captures of the boot vBinds)', { skip }, async () => {
  const ctx = await boot();
  assert.equal(ctx.EV.global.race.species, 'protoplasm');
  assert.ok(ctx.__vueCaptures.length > 10);
  assert.ok(ctx.__vueCaptures.some((c) => c.el === '#resRNA' && c.methods && typeof c.methods.craft === 'function'));
});

test('$(object)[0] is the object; $(selector) still absorbs calls', () => {
  const ctx = H.makeContext();
  const o = { a: 1 }, f = function () {};
  assert.equal(ctx.$(o)[0], o); assert.equal(ctx.$(o).length, 1); assert.equal(ctx.$(f)[0], f);
  assert.equal(ctx.$(o).addClass('x').removeClass('y')[0], o);
  assert.equal(ctx.$('#x').length, 0); assert.equal(ctx.$('#x').append('a').html().length, 0);
});

test('new Vue(options) is captured', () => {
  const ctx = H.makeContext();
  new ctx.Vue({ el: '#a', methods: { go() { return 1; } } });
  assert.equal(ctx.__vueCaptures.length, 1); assert.equal(ctx.__vueCaptures[0].methods.go(), 1);
});

test('seeded Math.random is reproducible and leaves the host Math alone', () => {
  const a = H.makeContext({ seed: 5 }), b = H.makeContext({ seed: 5 });
  const s1 = [a.Math.random(), a.Math.random()], s2 = [b.Math.random(), b.Math.random()];
  assert.deepEqual(s1, s2); assert.notEqual(Math.random, a.Math.random); assert.equal(a.Math.floor(2.5), 2);
});

test('drawing the Jobs tab captures methods.add of each job', { skip }, async () => {
  const ctx = await boot();
  ctx.__vueCaptures.length = 0;
  ctx.EV.defineJobs();
  const farmer = ctx.__vueCaptures.find((c) => c.el === '#civ-farmer');
  assert.ok(farmer, 'capture of #civ-farmer');
  assert.equal(typeof farmer.methods.add, 'function');
});

test('actions.city.basic_housing.action() builds one hut and pays its real cost', { skip }, async () => {
  const ctx = await boot();
  const EV = ctx.EV, g = EV.global;
  g.race.species = 'human'; g.tech.housing = 1; g.city.basic_housing = { count: 0 };
  g.resource.human = g.resource.human || { name: 'Human', display: false, amount: 0, max: 0, rate: 0, crafted: 0, diff: 0, delta: 0 };
  Object.assign(g.resource.Lumber, { display: true, amount: 1000, max: 1000 });
  const bh = EV.actions.city.basic_housing, cost = bh.cost.Lumber();
  assert.equal(bh.action(), true);
  assert.equal(g.city.basic_housing.count, 1);
  assert.equal(g.resource.Lumber.amount, 1000 - cost);
  assert.ok(bh.cost.Lumber() > cost, 'the next hut costs more');
});
