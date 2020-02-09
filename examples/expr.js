"use strict";
exports.__esModule = true;
var parser_1 = require("../src/parser");
var pure = parser_1.Parser.pure, empty = parser_1.Parser.empty, liftA2 = parser_1.Parser.liftA2;
var _a = parser_1.Parser.char, char = _a.char, digit = _a.digit;
var curry = parser_1.Parser.utils.curry;
// Grammar
var natural = empty(), integer = empty(), term = empty(), factor = empty(), expr = empty();
// <natural> -> [0-9]+
natural.set(digit.some().map(function (x) { return parseInt(x.join("")); }));
// <integer> -> "-" <natural> | <natural> 
integer.set(char('-').then(natural).map(function (x) { return -x; }).or(natural));
// <term> -> "(" <expr> ")" | <integer>
term.set(char('(').then(expr).left(char(')')).or(integer));
// <factor> -> <term> "*" <factor> | <term>
factor.set(term.bind(function (a) { return char('*').then(factor).bind(function (b) { return pure(a * b); }); }).or(term));
factor.set(pure(curry(function (x, y) { return x * y; })).ap(term).ap(char('*').then(factor)).or(term));
factor.set(liftA2(function (x, y) { return x * y; }, term, char('*').then(factor)).or(term));
// <expr> -> <factor> "+" <expr> | <factor>
expr.set(factor.bind(function (a) { return char('+').then(expr).bind(function (b) { return pure(a + b); }); }).or(factor));
expr.set(pure(curry(function (x, y) { return x + y; })).ap(factor).ap(char('+').then(expr)).or(factor));
expr.set(liftA2(function (x, y) { return x + y; }, factor, char('+').then(expr)).or(factor));
// Examples
console.log("((-1))", "=", expr.run("((-1))")[0][0]);
console.log("2+3*4", "=", expr.run("2+3*4")[0][0]);
console.log("(2+3)*4", "=", expr.run("(2+3)*4")[0][0]);
console.log("(2+3)*-4", "=", expr.run("(2+3)*-4")[0][0]);
console.log("(2+3)*(5+3)", "=", expr.run("(2+3)*(5+3)")[0][0]);
