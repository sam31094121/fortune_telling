// Standalone Node server tests need the same marker resolution as Next's
// react-server condition. This does not replace any application implementation.
const Module = require('node:module');
const serverMarker = require.resolve('next/dist/compiled/server-only/empty.js');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return request === 'server-only' ? serverMarker : originalResolve.call(this, request, ...rest);
};
