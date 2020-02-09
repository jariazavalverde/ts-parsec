"use strict";
exports.__esModule = true;
;
function Parser(run) {
    this.run = run;
}
exports.Parser = Parser;
Parser.prototype.set = function (parser) {
    this.run = parser.run;
};
// FUNCTOR
// Apply a function to any value parsed.
// (fmap)
Parser.prototype.map = function (fn) {
    var _this = this;
    return new Parser(function (input) { return _this.run(input).map(function (val) { return [fn(val[0]), val[1]]; }); });
};
// Replace all locations in any value parsed with the same value.
// (<$)
Parser.prototype.replace = function (val) {
    return this.map(function (_) { return val; });
};
// APPLICATIVE
// Inject a value into the parser.
// (pure) (return)
Parser.pure = function (val) {
    return new Parser(function (input) { return [[val, input]]; });
};
// Sequential application.
// (<*>)
Parser.prototype.ap = function (parser) {
    var _this = this;
    return new Parser(function (input) { return [].concat.apply([], _this.run(input).map(function (val) { return parser.map(val[0]).run(val[1]); })); });
};
// Sequence actions, discarding the value of the first argument.
// (*>) (>>)
Parser.prototype.then = function (parser) {
    return this.replace(function (x) { return x; }).ap(parser);
};
// Sequence actions, discarding the value of the second argument.
// (<*)
Parser.prototype.left = function (parser) {
    return Parser.liftA2(function (x, _) { return x; }, this, parser);
};
// Lift a binary function to actions.
// (liftA2)
Parser.liftA2 = function (fn, a, b) {
    fn = fn.length > 1 ? Parser.utils.curry(fn) : fn;
    return Parser.pure(fn).ap(a).ap(b);
};
// MONAD
// Sequentially compose two parsers, passing any value produced
// by the first as an argument to the second.
// (>>=)
Parser.prototype.bind = function (fn) {
    var _this = this;
    return new Parser(function (input) { return [].concat.apply([], _this.run(input).map(function (val) { return fn(val[0]).run(val[1]); })); });
};
// ALTERNATIVE
// The identity of Parser.prototype.or.
// (empty)
Parser.empty = function () {
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
// UTILS
Parser.utils = {
    // Currying a function.
    // (curry)
    curry: function (fn, ctx) {
        var args = Array.prototype.slice.call(arguments, 2);
        return function () {
            var args2 = args.concat(Array.prototype.slice.call(arguments, 0));
            if (args2.length >= fn.length) {
                return fn.apply(ctx || null, args2);
            }
            else {
                args2.unshift(fn, ctx);
                return Parser.utils.curry.apply(null, args2);
            }
        };
    },
    // Identity function.
    // (id)
    id: function (val) {
        return val;
    },
    // Function composition.
    // (.)
    compose: function (f) {
        return function (g) { return function (x) { return f(g(x)); }; };
    }
};
// CHARACTERS
var char_satisfy = function (predicate) {
    return new Parser(function (input) { return input.length > 0 && predicate(input[0]) ? [[input[0], input.substr(1)]] : []; });
};
var char_string = function (val) {
    var length = val.length;
    return new Parser(function (input) { return input.length >= length && input.substr(0, length) == val ? [[val, input.substr(length)]] : []; });
};
var char_space = char_satisfy(function (c) { return /\s/.test(c); });
var char_newline = char_satisfy(function (c) { return c === '\n'; });
var char_crlf = char_string("\r\n").replace("\n");
Parser.char = {
    // Parse an alphabetic or numeric character.
    // Returns the parsed character.
    alphaNum: char_satisfy(function (c) { return c.toLowerCase() !== c.toUpperCase() || c >= '0' && c <= '9'; }),
    // Parse any character.
    // Returns the parsed character.
    anyChar: new Parser(function (input) { return input.length > 0 ? [[input[0], input.substr(1)]] : []; }),
    // Parse a single character.
    // Returns the parsed character.
    char: function (c) {
        return char_satisfy(function (x) { return x === c; });
    },
    // Parse a carriage return character ('\r') followed by a newline character ('\n').
    // Returns a newline character.
    crlf: char_crlf,
    // Parse a CRLF (see Parser.char.crlf) or LF (see Parser.char.newline) end-of-line.
    // Returns a newline character ('\n').
    endOfLine: char_newline.or(char_crlf),
    // Parse a hexadecimal digit (a digit or a letter between 'a' and 'f' or 'A' and 'F').
    // Returns the parsed character.
    hexDigit: char_satisfy(function (c) { return c >= '0' && c <= '9' || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F'; }),
    // Parse an ASCII digit.
    // Returns the parsed character.
    digit: char_satisfy(function (c) { return c >= '0' && c <= '9'; }),
    // Parse an alphabetic Unicode characters.
    // Returns the parsed character.
    letter: char_satisfy(function (c) { return c.toLowerCase() !== c.toUpperCase(); }),
    // Parse an lower case letter.
    // Returns the parsed character.
    lower: char_satisfy(function (c) { return c.toLowerCase() !== c.toUpperCase() && c === c.toLowerCase(); }),
    // Parse a newline character ('\n').
    // Returns a newline character.
    newline: char_newline,
    // Succeed if the current character is not in the supplied list of characters.
    // Returns the parsed character.
    noneOf: function (cs) {
        return char_satisfy(function (c) { return cs.indexOf(c) === -1; });
    },
    // Parse an octal digit (a character between '0' and '7').
    // Returns the parsed character.
    octDigit: char_satisfy(function (c) { return c >= '0' && c <= '7'; }),
    // Succeed if the current character is in the supplied list of characters.
    // Returns the parsed character.
    oneOf: function (cs) {
        return char_satisfy(function (c) { return cs.indexOf(c) !== -1; });
    },
    // Succeed for any character for which the supplied function returns true.
    // Returns the parsed character.
    satisfy: char_satisfy,
    // Parse a white space character.
    // Returns the parsed character.
    space: char_space,
    // Skip zero or more white space characters.
    spaces: char_space.many().replace(undefined),
    // Parse a sequence of characters.
    // Returns the parsed string.
    string: char_string,
    // Parse a tab character ('\t').
    // Returns a tab character.
    tab: char_satisfy(function (c) { return c === '\t'; }),
    // Parse an upper case letter.
    // Returns the parsed character.
    upper: char_satisfy(function (c) { return c.toLowerCase() !== c.toUpperCase() && c === c.toUpperCase(); })
};
