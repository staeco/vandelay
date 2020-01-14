"use strict";

exports.__esModule = true;
exports.default = void 0;

var _through = _interopRequireDefault(require("through2"));

var _endOfStream = _interopRequireDefault(require("end-of-stream"));

var _hardClose = _interopRequireDefault(require("../hardClose"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint no-loops/no-loops: "off" */
const getURL = stream => stream.first ? getURL(stream.first) : typeof stream.url === 'function' ? stream.url() : stream.url;

const closeIt = i => {
  if (!i.readable) return;
  if (i.abort) return i.abort();
  (0, _hardClose.default)(i);
}; // merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch


var _default = ({
  concurrent = 10,
  onError,
  inputs = []
} = {}) => {
  if (inputs.length === 0) throw new Error('No inputs specified!');
  const out = (0, _through.default)({
    objectMode: true
  });
  out.remaining = inputs.slice(0);
  out.running = [];
  out.setMaxListeners(0);

  out.abort = () => {
    (0, _hardClose.default)(out);
    out.running.forEach(closeIt);
    inputs.forEach(closeIt);
  };

  out.url = getURL.bind(null, out);
  out.on('unpipe', src => done(src));

  const done = (src, err) => {
    const idx = out.running.indexOf(src);
    if (idx === -1) return; // already finished

    out.running.splice(idx, 1); // remove it from the run list

    schedule(); // schedule any additional work

    const finished = out.running.length === 0 && out.remaining.length === 0; // let the consumer figure out how they want to handle errors

    const canContinue = !finished && out.readable;

    if (err && onError) {
      onError({
        canContinue,
        fatal: !canContinue && inputs.length === 1,
        error: err,
        output: out,
        input: src
      });
    }

    if (!canContinue) (0, _hardClose.default)(out);
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
    const src = typeof i === 'function' ? i() : i;
    out.running.push(src);
    if (!out.first) out.first = src;
    (0, _endOfStream.default)(src, err => done(src, err));
    src.pipe(out, {
      end: false
    });
  };

  schedule(); // kick it all off

  return out;
};

exports.default = _default;
module.exports = exports.default;