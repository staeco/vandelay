'use strict';

exports.__esModule = true;

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _endOfStream = require('end-of-stream');

var _endOfStream2 = _interopRequireDefault(_endOfStream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
exports.default = ({ concurrent = 10, onError, inputs = [] } = {}) => {
  if (inputs.length === 0) throw new Error('No inputs specified!');
  const remaining = inputs.slice(0);
  let running = [];
  const out = _through2.default.obj();
  out.setMaxListeners(0);

  const done = (src, err) => {
    const idx = running.indexOf(src);
    if (idx === -1) return; // already finished
    running.splice(idx, 1); // remove it from the run list
    schedule(); // schedule any additional work
    const finished = running.length === 0 && remaining.length === 0;

    // let the consumer figure out how thye want to handle errors
    if (err && onError) {
      onError({
        canContinue: !finished,
        error: err,
        output: out,
        input: src
      });
    }
    if (finished && out.readable) out.end();
  };
  const schedule = () => {
    const toRun = concurrent - running.length;
    if (toRun === 0) return;
    for (let i = 0; i <= toRun; i++) {
      if (remaining.length === 0) break;
      run(remaining.shift());
    }
  };
  const run = i => {
    const src = typeof i === 'function' ? i() : i;
    running.push(src);
    (0, _endOfStream2.default)(src, err => done(src, err));
    src.pipe(out, { end: false });
  };

  out.abort = () => {
    inputs.forEach(i => {
      if (!i.readable) return;
      if (i.abort) return i.abort();
      i.end();
    });
  };
  out.on('unpipe', src => done(src));

  schedule(); // kick it all off
  return out;
};

module.exports = exports['default'];