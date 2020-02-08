"use strict";
exports.__esModule = true;
;
function Parser(run) {
    this.run = run;
}
exports.Parser = Parser;
// FUNCTOR
// Apply a function to any value parsed.
// (fmap)
Parser.prototype.map = function (fn) {
    var _this = this;
    return new Parser(function (input) { return _this.run(input).map(function (val) { return [fn(val[0]), val[1]]; }); });
};
// Replace all locations in any value parsed with the same value.
// (<$)
Parser.prototype.cons = function (val) {
    return this.map(function (_) { return val; });
};
// MONAD
// Inject a value into the parser.
// (return)
exports.pure = function (val) {
    return new Parser(function (input) { return [[val, input]]; });
};
// Sequentially compose two parsers, passing any value produced
// by the first as an argument to the second.
// (>>=)
Parser.prototype.bind = function (fn) {
    var _this = this;
    return new Parser(function (input) { return [].concat.apply([], _this.runParser(input).map(function (val) { return fn(val[0]).run(val[1]); })); });
};
// Sequentially compose two parsers, discarding any value produced
// by the first.
// (>>)
Parser.prototype.then = function (parser) {
    return this.bind(function (_) { return parser; });
};
// ALTERNATIVE
// The identity of Parser.prototype.or.
// (empty)
exports.empty = function () {
    return new Parser(function (_) { return []; });
};
// If the first parser doesn't produce any value, return the value
// produced by the second.
// (<|>)
Parser.prototype.or = function (parser) {
    var _this = this;
    return new Parser(function (input) {
        var val = _this.run(input);
        if (val.length == 0)
            return parser.run(input);
        return val;
    });
};
// One or more.
// (some)
Parser.prototype.some = function () {
    var _this = this;
    return new Parser(function (input) {
        var val, xs = _this.run(input).map(function (x) { return [[x[0]], x[1]]; });
        if (xs.length == 0)
            return [];
        while (xs.length > 0) {
            val = xs;
            xs = [].concat.apply([], val.map(function (x) { return _this.run(x[1]).map(function (y) { return [x[0].concat([y[0]]), y[1]]; }); }));
        }
        return val;
    });
};
// Zero or more.
// (many)
Parser.prototype.many = function () {
    var _this = this;
    return new Parser(function (input) {
        var val, xs = _this.run(input).map(function (x) { return [[x[0]], x[1]]; });
        if (xs.length == 0)
            return [[[], input]];
        while (xs.length > 0) {
            val = xs;
            xs = [].concat.apply([], val.map(function (x) { return _this.run(x[1]).map(function (y) { return [x[0].concat([y[0]]), y[1]]; }); }));
        }
        return val;
    });
};
