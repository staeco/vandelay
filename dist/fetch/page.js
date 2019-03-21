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
exports.default = (startPage, getNext, { concurrent = 2, onError } = {}) => {
  const actualConcurrency = Math.min(2, concurrent); // limit concurrency to either 1 or 2
  const out = (0, _through2.default)({ objectMode: true });
  out.currentPage = startPage;
  out.running = [];
  out.setMaxListeners(0);
  out.abort = () => {
    (0, _hardClose2.default)(out);
    out.running.forEach(i => {
      if (!i.readable) return;
      if (i.abort) return i.abort();
      (0, _hardClose2.default)(i);
    });
  };
  out.on('unpipe', src => done(src));

  const done = (src, err) => {
    const idx = out.running.indexOf(src);
    if (idx === -1) return; // already finished
    out.running.splice(idx, 1); // remove it from the run list
    const finished = out.running.length === 0 && !src._gotData;

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
    if (!canContinue) return (0, _hardClose2.default)(out);
    if (src._gotData) schedule(); // schedule any additional work
  };

  const schedule = () => {
    if (out._closed) return;
    const remainingSlots = actualConcurrency - out.running.length;
    if (remainingSlots === 0) return;
    const nextPage = out.currentPage;
    out.currentPage = nextPage + 1;
    run(getNext(nextPage));
  };

  const run = src => {
    out.running.push(src);
    (0, _endOfStream2.default)(src, err => done(src, err));
    src.once('data', () => {
      src._gotData = true;
      schedule();
    }).pause(); // since the data handler will put it in a flowing state
    src.pipe(out, { end: false });
  };

  // kick it all off
  schedule();
  return out;
};

module.exports = exports.default;