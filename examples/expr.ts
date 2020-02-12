import {Parser} from "../src/parser";
const {pure, empty, chain, liftA2} = Parser;
const {char, digit} = Parser.char;
const {between} = Parser.combinator;
const {curry2} = Parser.utils;



// Grammar
const
	natural: Parser<number> = empty(),
	integer: Parser<number> = empty(),
	term: Parser<number> = empty(),
	factor: Parser<number> = empty(),
	expr: Parser<number> = empty();

// <natural> -> [0-9]+
natural.set(digit.some().map(x => parseInt(x.join(""))));

// <integer> -> "-" <natural> | <natural> 
integer.set(char('-').then(natural).map(x => -x).or(natural));

// <term> -> "(" <expr> ")" | <integer>
term.set(char('(').then(expr).left(char(')')).or(integer));
term.set(between(char('('), char(')'), expr).or(integer));

// <factor> -> <term> "*" <factor> | <term>
const mul = (x: number, y: number): number => x*y;
factor.set(term.bind(a => char('*').then(factor).bind(b => pure(a*b))).or(term));
factor.set(pure(curry2(mul)).ap(term).ap(char('*').then(factor)).or(term));
factor.set(liftA2(curry2(mul), term, char('*').then(factor)).or(term));
factor.set(chain([
	term.to("x"),
	char('*'),
	factor.to("y"),
	args => pure(args.x * args.y)
]).or(term));

// <expr> -> <factor> "+" <expr> | <factor>
const add = (x: number, y: number): number => x+y;
expr.set(factor.bind(a => char('+').then(expr).bind(b => pure(a+b))).or(factor));
expr.set(pure(curry2(add)).ap(factor).ap(char('+').then(expr)).or(factor));
expr.set(liftA2(curry2(add), factor, char('+').then(expr)).or(factor));



// Examples
console.log("((-1))", "=", expr.run("((-1))")[0][0]);
console.log("2+3*4", "=", expr.run("2+3*4")[0][0]);
console.log("(2+3)*4", "=", expr.run("(2+3)*4")[0][0]);
console.log("(2+3)*-4", "=", expr.run("(2+3)*-4")[0][0]);
console.log("(2+3)*(5+3)", "=", expr.run("(2+3)*(5+3)")[0][0]);