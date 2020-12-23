"use strict";

exports.__esModule = true;
exports.default = void 0;

var _stream = require("stream");

var _hardClose = _interopRequireDefault(require("../hardClose"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint no-loops/no-loops: "off" */
const getURL = stream => stream.first ? getURL(stream.first) : typeof stream.url === 'function' ? stream.url() : stream.url;

const closeIt = i => {
  if (!i.readable) return;

  if (i.abort) {
    i._closed = true;
    return i.abort();
  }

  (0, _hardClose.default)(i);
};

const softClose = i => {
  i._closed = true;
  i.end(null);
}; // merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch


var _default = ({
  concurrent = 8,
  onError,
  inputs = []
} = {}) => {
  if (inputs.length === 0) throw new Error('No inputs specified!');
  const out = new _stream.PassThrough({
    objectMode: true
  });
  out.setMaxListeners(0);
  out.remaining = Array.from(inputs);
  out.running = [];

  out.abort = () => {
    (0, _hardClose.default)(out);
    out.running.forEach(closeIt);
    inputs.forEach(closeIt);
  };

  out.url = getURL.bind(null, out);

  const done = (src, err) => {
    const idx = out.running.indexOf(src);
    if (idx === -1) return; // already finished

    out.running.splice(idx, 1); // remove it from the run list

    schedule(); // schedule any additional work

    const finished = out.running.length === 0 && out.remaining.length === 0; // let the consumer figure out how they want to handle errors

    if (err && onError) {
      onError({
        canContinue: !finished,
        fatal: finished && inputs.length === 1,
        error: err,
        output: out,
        input: src
      });
    }

    if (finished) softClose(out);
  };

  const schedule = () => {
    if (out._closed) return;
    const toRun = concurrent - out.running.length;
    if (toRun === 0) return;

    for (let i = 0; i <= toRun; i++) {
      if (out.remaining.length === 0) break;
      run(out.remaining.shift());
    }
  };

  const run = i => {
    if (out._closed) return;
    const src = typeof i === 'function' ? i() : i;
    out.running.push(src);
    if (!out.first) out.first = src;
    src.pipe(out, {
      end: false
    });
    (0, _stream.finished)(src, done.bind(null, src));
  };

  schedule(); // kick it all off

  return out;
};

exports.default = _default;
module.exports = exports.default;