'use strict';

exports.__esModule = true;

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _endOfStream = require('end-of-stream');

var _endOfStream2 = _interopRequireDefault(_endOfStream);

var _hardClose = require('../hardClose');

var _hardClose2 = _interopRequireDefault(_hardClose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
exports.default = ({ concurrent = 50, onError, inputs = [] } = {}) => {
  if (inputs.length === 0) throw new Error('No inputs specified!');

  const out = (0, _through2.default)({ objectMode: true, highWaterMark: concurrent });
  out.remaining = inputs.slice(0);
  out.running = [];
  out.setMaxListeners(0);

  const done = (src, err) => {
    const idx = out.running.indexOf(src);
    if (idx === -1) return; // already finished
    out.running.splice(idx, 1); // remove it from the run list
    schedule(); // schedule any additional work
    const finished = out.running.length === 0 && out.remaining.length === 0;

    // let the consumer figure out how they want to handle errors
    const canContinue = !finished && out.readable;
    if (err && onError) {
      onError({
        canContinue,
        error: err,
        output: out,
        input: src
      });
    }
    if (!canContinue) (0, _hardClose2.default)(out);
  };
  const schedule = () => {
    const toRun = concurrent - out.running.length;
    if (toRun === 0) return;
    for (let i = 0; i <= toRun; i++) {
      if (out.remaining.length === 0) break;
      run(out.remaining.shift());
    }
  };
  const run = i => {
    const src = typeof i === 'function' ? i() : i;
    out.running.push(src);
    (0, _endOfStream2.default)(src, err => done(src, err));
    src.pipe(out, { end: false });
  };

  out.abort = () => {
    (0, _hardClose2.default)(out);
    inputs.forEach(i => {
      if (!i.readable) return;
      if (i.abort) return i.abort();
      (0, _hardClose2.default)(i);
    });
  };
  out.on('unpipe', src => done(src));

  schedule(); // kick it all off
  return out;
};

module.exports = exports.default;