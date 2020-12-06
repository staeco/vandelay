"use strict";

exports.__esModule = true;
exports.default = void 0;

var _url = _interopRequireDefault(require("url"));

var _qs = _interopRequireDefault(require("qs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (origUrl, newQuery) => {
  const sourceUrl = _url.default.parse(origUrl);

  const query = _qs.default.stringify({ ..._qs.default.parse(sourceUrl.query),
    ...newQuery
  }, {
    strictNullHandling: true
  });

  return _url.default.format({ ...sourceUrl,
    search: query
  });
};

exports.default = _default;
module.exports = exports.default;