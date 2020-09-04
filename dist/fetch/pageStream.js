"use strict";

exports.__esModule = true;
exports.default = void 0;

var _through = _interopRequireDefault(require("through2"));

var _readableStream = require("readable-stream");

var _hardClose = _interopRequireDefault(require("../hardClose"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getURL = stream => stream.first ? getURL(stream.first) : typeof stream.url === 'function' ? stream.url() : stream.url;

const closeIt = i => {
  if (!i.readable) return;
  if (i.abort) return i.abort();
  (0, _hardClose.default)(i);
};

const softClose = i => {
  i.end(null);
}; // merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
// keep this aligned w/ multiStream.js


var _default = ({
  startPage,
  getNextPage,
  concurrent = 2,
  onError
} = {}) => {
  // concurrency can either be 1 or 2, 2 will start loading the next page once it reads a first datum from the current page
  const actualConcurrency = Math.min(2, concurrent);

  const out = _through.default.obj();

  out.currentPage = startPage;
  out.running = [];

  out.abort = () => {
    (0, _hardClose.default)(out);
    out.running.forEach(closeIt);
  };

  out.url = getURL.bind(null, out);

  const done = (src, err) => {
    const idx = out.running.indexOf(src);
    if (idx === -1) return; // already finished

    out.running.splice(idx, 1); // remove it from the run list
    // if this stream is the first in the concurrent queue and got no data, abort
    // we hit the end of the road paging through data

    const finished = idx === 0 && !src._gotData; // let the consumer figure out how they want to handle errors

    if (err && onError) {
      onError({
        canContinue: !finished,
        error: err,
        output: out,
        input: src
      });
    }

    finished ? softClose(out) : schedule();
  };

  const schedule = () => {
    if (out._closed) return;
    const remainingSlots = actualConcurrency - out.running.length;
    if (remainingSlots < 1) return;
    const nextPage = out.currentPage;
    out.currentPage = nextPage + 1;
    run(getNextPage(nextPage));
  };

  const run = src => {
    out.running.push(src);
    if (!out.first) out.first = src;
    const thisStream = (0, _readableStream.pipeline)(src, _through.default.obj((chunk, _, cb) => {
      src._gotData = true;
      schedule();
      cb(null, chunk);
    }), err => {
      done(src, err);
    });
    thisStream.pipe(out, {
      end: false
    });
  }; // kick it all off


  schedule();
  return out;
};

exports.default = _default;
module.exports = exports.default;