(function (scope) {
  'use strict';

  if (typeof module !== 'undefined' && module.exports) {
    const api = {};
    Object.assign(api, require('./core.js'));
    Object.assign(scope.StrandMath = scope.StrandMath || {}, api);
    Object.assign(api, require('./permutation.js'));
    Object.assign(scope.StrandMath, api);
    Object.assign(api, require('./hecke.js'));
    Object.assign(scope.StrandMath, api);
    Object.assign(api, require('./kl.js'));
    Object.assign(scope.StrandMath, api);
    Object.assign(api, require('./temperley_lieb.js'));
    Object.assign(scope.StrandMath, api);
    Object.assign(api, require('./burau.js'));
    Object.assign(scope.StrandMath, api);
    Object.assign(api, require('./calculate.js'));
    Object.assign(scope.StrandMath, api);
    Object.assign(api, require('./diagrammatics.js'));
    Object.assign(scope.StrandMath, api);
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
