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
  let remaining = inputs.slice(); // clone
  let running = [];
  const out = _through2.default.obj();
  const done = (src, err) => {
    running = running.filter(i => i !== src);
    schedule();
    // let the consumer figure out how thye want to handle errors
    if (err && onError) {
      onError({
        canContinue: remaining.length > 0,
        error: err,
        output: out,
        input: src
      });
    }
    if (!running.length && out.readable) out.end();
  };
  const schedule = () => {
    const toRun = concurrent - running.length;
    for (let i = 0; i <= toRun; i++) {
      if (remaining.length === 0) return;
      run(remaining.shift());
    }
  };
  const run = src => {
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