import {Parser} from "../src/parser";
const {pure, empty, liftA2} = Parser;
const {char, digit} = Parser.char;
const {curry} = Parser.utils;



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

// <factor> -> <term> "*" <factor> | <term>
factor.set(term.bind(a => char('*').then(factor).bind(b => pure(a*b))).or(term));
factor.set(<Parser<number>> pure(curry((x,y) => x*y)).ap(term).ap(char('*').then(factor)).or(term));
factor.set(liftA2((x,y) => x*y, term, char('*').then(factor)).or(term));

// <expr> -> <factor> "+" <expr> | <factor>
expr.set(factor.bind(a => char('+').then(expr).bind(b => pure(a+b))).or(factor));
expr.set(<Parser<number>> pure(curry((x,y) => x+y)).ap(factor).ap(char('+').then(expr)).or(factor));
expr.set(liftA2((x,y) => x+y, factor, char('+').then(expr)).or(factor));



// Examples
console.log("((-1))", "=", expr.run("((-1))")[0][0]);
console.log("2+3*4", "=", expr.run("2+3*4")[0][0]);
console.log("(2+3)*4", "=", expr.run("(2+3)*4")[0][0]);
console.log("(2+3)*-4", "=", expr.run("(2+3)*-4")[0][0]);
console.log("(2+3)*(5+3)", "=", expr.run("(2+3)*(5+3)")[0][0]);