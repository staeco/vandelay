"use strict";

exports.__esModule = true;
exports.default = void 0;

const rewriteError = info => {
  if (info.status) return new Error(`Server responded with "${info.statusMessage}"`);
  if (info.code === 'ENOTFOUND') return new Error('Failed to resolve server host');
  if (info.code === 'ECONNRESET') return new Error('Connection to server was lost');
  if (typeof info.code === 'string' && info.code.includes('TIMEDOUT')) return new Error('Server took too long to respond');
  return new Error('Failed to connect to server');
};

var _default = (err, res) => {
  const base = {
    code: res && res.code || err.code,
    status: res && res.statusCode || err.statusCode,
    headers: res && res.headers || err.headers,
    body: res && res.text || err.text
  };
  const nerror = rewriteError({
    code: base.code,
    status: base.status,
    statusMessage: res && res.statusMessage || err.statusMessage
  });
  nerror.requestError = true;
  nerror.code = base.code;
  nerror.status = base.status;
  nerror.headers = base.headers;
  nerror.body = base.body;
  return nerror;
};

exports.default = _default;
module.exports = exports.default;