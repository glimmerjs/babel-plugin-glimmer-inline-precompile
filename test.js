'use strict';

/* globals QUnit */

const lint = require('qunit-eslint');

lint(['index.js', 'test.js']);

const babel = require('babel-core');
const GlimmerInlinePrecompile = require('./index');

// work around https://github.com/qunitjs/qunit/issues/1182
const root = process.cwd();
for (let key in require.cache) {
  if (key.startsWith(root) && !key.startsWith(`${root}/node_modules`)) {
    delete require.cache[key];
  }
}

function transform(source) {
  let result = babel.transform(source, {
    plugins: [
      [GlimmerInlinePrecompile, { precompile: input => JSON.stringify(input.toUpperCase()) }],
    ],
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
});
