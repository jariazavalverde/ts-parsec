import * as fc from "fast-check";
import {Parser} from "../src/parser";
const {pure} = Parser;
const {anyChar} = Parser.char;



// Code under test
function take(n: number): Parser<string> {
	return new Parser(input => input.length >= n ? [[input.substr(0, n), input.substr(n)]] : []);
}
const even = (val: string): Parser<string> => val.charCodeAt(0) % 2 == 0 ? take(1) : take(2);
const odd = (val: string): Parser<string> => val.charCodeAt(0) % 2 == 1 ? take(1) : take(2);



// Properties

// (left identity) return a >>= f == f a
test("(left identity) pure(a).bind(f) == f(a)", () => {
	fc.assert(
		fc.property(fc.integer(), fc.string(), (a, input) => {
			let f = take;
			expect(pure(a).bind(f).run(input)).toEqual(f(a).run(input));
		})
	);
});

// (right identity) m >>= return == m
test("(right identity) m.bind(pure) == m", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let m = anyChar;
			expect(m.bind(pure).run(input)).toEqual(m.run(input));
		})
	);
});

// (associativity) (m >>= f) >>= g == m >>= (\x -> f x >>= g)
test("(associativity) m.bind(f).bind(g) == m.bind(x => f(x).bind(g))", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let m = anyChar, f = even, g = odd;
			expect(m.bind(f).bind(g).run(input)).toEqual(m.bind(x => f(x).bind(g)).run(input));
		})
	);
});