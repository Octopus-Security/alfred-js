'use strict';

/**
 * The deploy-verification stamp, and why it is a log line rather than a route.
 *
 * Portainer polls and reports back to nobody, so "did my push land" could only
 * be inferred from whether a command behaved differently in Discord.
 *
 * Every other service in the estate answers this on /api/build. This one has no
 * HTTP surface at all — no express, no http server, no ports in the compose
 * file; it dials OUT to Discord's gateway and listens for nothing. Opening a
 * port on a process holding a Discord token, purely to give a stamp somewhere
 * to live, would be a worse trade than the problem it solves. So the stamp goes
 * to stdout at startup, which is already the only way this container is
 * observed:
 *
 *     docker logs alfred_js_bot | grep '[alfred] build'
 *
 * The property worth defending is unchanged: the stamp MOVES when the code
 * moves. A stamp that silently stops tracking is worse than none, because it
 * reports "nothing changed" for a deploy that did.
 *
 * Run: node --test test/build-stamp.test.js
 */

const { test } = require('node:test');
const assert   = require('node:assert');
const fs       = require('node:fs');
const path     = require('node:path');

const root = path.join(__dirname, '..');
const bot  = path.join(root, 'discord-bot');
const { BUILD, sourceFiles } = require('../discord-bot/build');

function stampWith(relPath) {
  const target   = path.join(root, relPath);
  const original = fs.readFileSync(target);
  try {
    fs.writeFileSync(target, Buffer.concat([original, Buffer.from('\n// build-stamp probe\n')]));
    delete require.cache[require.resolve('../discord-bot/build')];
    return require('../discord-bot/build').BUILD;
  } finally {
    fs.writeFileSync(target, original);
    delete require.cache[require.resolve('../discord-bot/build')];
  }
}

test('the stamp is a real hash, not the failure value', () => {
  assert.match(BUILD, /^[0-9a-f]{12}$/);
  assert.notStrictEqual(BUILD, 'unknown');
});

test('editing the entrypoint moves the stamp', () => {
  assert.notStrictEqual(stampWith('discord-bot/index.js'), BUILD,
    'editing discord-bot/index.js did not move the stamp');
});

test('editing a command moves it too — commands are the deployed behaviour', () => {
  const name = fs.readdirSync(path.join(bot, 'commands')).find(f => f.endsWith('.js'));
  assert.ok(name, 'expected at least one command');
  assert.notStrictEqual(stampWith(`discord-bot/commands/${name}`), BUILD,
    `editing commands/${name} did not move the stamp`);
});

test('the walk covers commands and events and skips dependencies', () => {
  const files = sourceFiles();
  assert.ok(files.includes('index.js'), 'the entrypoint is not covered');
  assert.ok(files.some(f => f.startsWith('commands/')), 'commands are not covered');
  assert.ok(files.some(f => f.startsWith('events/')), 'events are not covered');
  assert.ok(!files.some(f => f.includes('node_modules')), 'node_modules must not be hashed');
});

/**
 * The mistake this nearly shipped, kept as a test.
 *
 * The Dockerfile says `COPY discord-bot/. .`, so in the image build.js sits at
 * /app/build.js and its parent is the FILESYSTEM ROOT. The obvious
 * `path.join(__dirname, '..')` — obvious because in a checkout '..' is the repo
 * — would have walked the whole container filesystem, slowly, for a number that
 * means nothing. The two layouts are not the same shape and the image's is the
 * one that matters.
 */
test('the walk is rooted at this directory, not its parent', () => {
  const src = fs.readFileSync(path.join(bot, 'build.js'), 'utf8');
  assert.match(src, /^const ROOT = __dirname;$/m,
    "ROOT must be __dirname — the Dockerfile flattens discord-bot/ into /app, so '..' is /");
  assert.ok(!/const ROOT = path\.join\(__dirname, '\.\.'\)/.test(src),
    'this would hash the entire container filesystem');

  // And the consequence, checked rather than assumed: nothing outside the bot
  // directory is in the list.
  assert.ok(sourceFiles().every(f => !f.startsWith('..') && !f.startsWith('/')),
    'the walk escaped the bot directory');
});

test('the stamp is printed at startup, before login', () => {
  const src   = fs.readFileSync(path.join(bot, 'index.js'), 'utf8');
  const log   = src.indexOf('[alfred] build');
  const login = src.indexOf('client.login(');
  assert.ok(log > 0, 'the build stamp is never printed, so nothing can report it');
  assert.ok(login > 0, 'expected client.login to exist');
  assert.ok(log < login,
    'the stamp must print before login — otherwise a bad token means no stamp, ' +
    'and the container that most needs identifying is the one that stays silent');
});

/**
 * If this ever starts failing, the bot has grown an HTTP surface and should get
 * a real /api/build like every other service. Left as a test rather than a
 * comment, because a comment does not notice.
 */
test('there is still no HTTP surface to hang a route on', () => {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.js')) files.push(full);
    }
  })(bot);

  const listeners = files.filter(f => {
    const src = fs.readFileSync(f, 'utf8');
    return /require\(['"](node:)?http['"]\)|require\(['"]express['"]\)|\.listen\(/.test(src);
  });
  assert.deepEqual(listeners.map(f => path.relative(root, f)), [],
    'this bot now listens on a port, so it should serve /api/build like the rest of the estate');

  const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
  assert.ok(!/^\s*ports:/m.test(compose), 'the compose file now publishes a port');
});
