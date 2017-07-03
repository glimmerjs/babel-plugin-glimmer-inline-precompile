'use strict';

/* globals QUnit */

const lint = require('qunit-eslint');

lint(['index.js', 'ember-addon-main.js', 'test.js']);

const babel = require('babel-core');

// work around https://github.com/qunitjs/qunit/issues/1182
const root = process.cwd();
for (let key in require.cache) {
  if (key.startsWith(root) && !key.startsWith(`${root}/node_modules`)) {
    delete require.cache[key];
  }
}

const GlimmerInlinePrecompile = require('./index');
const GlimmerInlinePrecompileAddon = require('./ember-addon-main');

function transform(source, _plugins) {
  let plugins = _plugins || [
    [GlimmerInlinePrecompile, { precompile: input => JSON.stringify(input.toUpperCase()) }],
  ];

  let result = babel.transform(source, {
    plugins,
  });

  return result.code;
}

function matches(source, expected) {
  QUnit.test(`${source}`, assert => {
    let actual = transform(source);

    assert.equal(actual, expected);
  });
}

QUnit.module('glimmer-inline-precompile', () => {
  QUnit.module('only processes with correct import', () => {
    // should not replace (no import)
    matches(
      `let template = hbs\`{{hello}}\`;`,
      `let template = hbs\`{{hello}}\`;`
    );

    matches(
      `import hbs from 'glimmer-inline-precompile'; let template = hbs\`{{hello}}\`;`,
      `let template = "{{HELLO}}";`
    );
  });

  QUnit.module('does not allow interpolation', () => {
    QUnit.test('throws an error', assert => {
      assert.throws(() => {
        let input = `import hbs from 'glimmer-inline-precompile'; let template = hbs\`{{hello}} $\{name}\`;`;
        transform(input);
      }, /placeholders inside a tagged template string are not supported/);


    });
  });

  QUnit.test('allows configuring import path to replace', assert => {
    let actual = transform(`import hbs from 'herpy/derpy/doo'; let template = hbs\`{{hello}}\`;`, [
      [GlimmerInlinePrecompile, { importPath: 'herpy/derpy/doo', precompile: input => JSON.stringify(input.toUpperCase()) }],
    ]);

    assert.equal(actual, `let template = "{{HELLO}}";`);
  });
});

QUnit.module('ember-addon-main', hooks => {
  let fakeGlimmerAppInstance;

  hooks.before(() => {
    GlimmerInlinePrecompileAddon.parent = { };
    GlimmerInlinePrecompileAddon._super = {
      included() { },
    };
  });

  hooks.beforeEach(assert => {
    fakeGlimmerAppInstance = { options: { } };

    assert.hasBabelPlugin = () => {
      let plugins = fakeGlimmerAppInstance.options.babel.plugins;
      let hasPlugin = false;
      for (let i = 0; i < plugins.length; i++) {
        if (plugins[i][0] === GlimmerInlinePrecompile) {
          hasPlugin = true;
          break;
        }
      }

      assert.pushResult({
        result: hasPlugin,
        actual: plugins,
        message: 'glimmer-inline-precompile should be present',
      });
    };
  });

  hooks.after(() => {
    delete GlimmerInlinePrecompileAddon._super;
  });

  QUnit.test('adds plugin to options', assert => {
    GlimmerInlinePrecompileAddon.included(fakeGlimmerAppInstance);

    assert.hasBabelPlugin();
  });

  QUnit.test('merges with existing options', assert => {
    fakeGlimmerAppInstance.options.foo = true;
    GlimmerInlinePrecompileAddon.included(fakeGlimmerAppInstance);

    assert.hasBabelPlugin();
    assert.ok(fakeGlimmerAppInstance.options.foo);
  });

  QUnit.test('merges with existing babel options', assert => {
    fakeGlimmerAppInstance.options = { babel: { foo: true } };
    GlimmerInlinePrecompileAddon.included(fakeGlimmerAppInstance);

    assert.hasBabelPlugin();
    assert.ok(fakeGlimmerAppInstance.options.babel.foo);
  });

  QUnit.test('merges with existing babel plugins', assert => {
    fakeGlimmerAppInstance.options = { babel: { plugins: [['a']] } };
    GlimmerInlinePrecompileAddon.included(fakeGlimmerAppInstance);

    assert.hasBabelPlugin();
    assert.deepEqual(fakeGlimmerAppInstance.options.babel.plugins[0], ['a']);
  });

  QUnit.test('does not add if plugin is already present', assert => {
    fakeGlimmerAppInstance.options = {
      babel: {
        plugins: [[{ name: 'glimmer-inline-precompile', fakeEntry: true }]],
      },
    };
    GlimmerInlinePrecompileAddon.included(fakeGlimmerAppInstance);

    assert.deepEqual(fakeGlimmerAppInstance.options.babel.plugins, [
      [{ name: 'glimmer-inline-precompile', fakeEntry: true }],
    ]);
  });
});
