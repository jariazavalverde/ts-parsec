import {Parser} from "../src/parser";
const {pure, empty} = Parser;
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
term.set(char('(').then(expr).lseq(char(')')).or(integer));

// <factor> -> <term> "*" <factor> | <term>
factor.set(term.bind(a => char("*").then(factor).bind(b => pure(a*b))).or(term));
factor.set(pure(curry((x,y) => x*y)).seq(term).seq(char('*').rseq(factor)).or(term));

// <expr> -> <factor> "+" <expr> | <factor>
expr.set(factor.bind(a => char("+").then(expr).bind(b => pure(a+b))).or(factor));
expr.set(pure(curry((x,y) => x+y)).seq(factor).seq(char('+').rseq(expr)).or(factor));



// Examples
console.log("((-1))", "=", expr.run("((-1))")[0][0]);
console.log("2+3*4", "=", expr.run("2+3*4")[0][0]);
console.log("(2+3)*4", "=", expr.run("(2+3)*4")[0][0]);
console.log("(2+3)*-4", "=", expr.run("(2+3)*-4")[0][0]);
console.log("(2+3)*(5+3)", "=", expr.run("(2+3)*(5+3)")[0][0]);