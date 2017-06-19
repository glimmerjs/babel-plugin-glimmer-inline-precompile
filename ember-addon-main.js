'use strict';

module.exports = {
  name: 'babel-plugin-glimmer-inline-precompile',

  included(app) {
    this._super.included.apply(this, arguments);

    let options = this.parent.options || app.options;
    options.babel = options.babel || {};
    let plugins = options.babel.plugins = options.babel.plugins || [];

    if (!plugins.find(tuple => tuple[0].name === 'glimmer-inline-precompile')) {
      options.babel.plugins.push([require('./index')]);
    }
  },
};
