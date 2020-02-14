import * as fc from "fast-check";
import {Parsec, Char} from "../src/parsec";
const {pure} = Parsec;
const {anyChar, char} = Char;



// Properties

// (left identity) return a >>= f == f a
test("(left identity) pure(a).bind(f) == f(a)", () => {
	fc.assert(
		fc.property(fc.char(), fc.string(), (c, input) => {
			let f = char;
			expect(
				pure(c).bind(f).runParser(undefined, "monad.spec.ts : left identity", c+input)
			).toEqual(
				f(c).runParser(undefined, "monad.spec.ts : left identity", c+input)
			);
		})
	);
});

// (right identity) m >>= return == m
test("(right identity) m.bind(pure) == m", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let m = anyChar;
			expect(
				m.bind(pure).runParser(undefined, "monad.spec.ts : right identity", input)
			).toEqual(
				m.runParser(undefined, "monad.spec.ts : right identity", input)
			);
		})
	);
});

// (associativity) (m >>= f) >>= g == m >>= (\x -> f x >>= g)
test("(associativity) m.bind(f).bind(g) == m.bind(x => f(x).bind(g))", () => {
	fc.assert(
		fc.property(fc.char(), fc.string(), (c, input) => {
			let m = anyChar, f = char, g = char;
			expect(
				m.bind(f).bind(g).runParser(undefined, "monad.spec.ts : associativity", c+c+c+input)
			).toEqual(
				m.bind((x: string) => f(x).bind(g)).runParser(undefined, "monad.spec.ts : associativity", c+c+c+input)
			);
		})
	);
});