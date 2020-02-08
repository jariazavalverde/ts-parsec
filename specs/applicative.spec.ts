import * as fc from "fast-check";
import {Parser, pure, curry} from "../src/parser";



// Code under test

function id<A>(val: A): A {
	return val;
}

function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B, x: A): C {
	return f(g(x));
}

const char: Parser<string> = new Parser(input => input.length > 0 ? [[input[0], input.substr(1)]] : []);
const length = (val: string) => val.length;



// Properties

// (identity) pure id <*> v = v
test("(identity) pure(id).seq(v) == v", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let v = char;
			expect(pure(id).seq(v).run(input)).toEqual(v.run(input));
		})
	);
});

// (composition) pure (.) <*> u <*> v <*> w = u <*> (v <*> w)
test("(composition) pure(compose).seq(u).seq(v).seq(w) == u.seq(v.seq(w))", () => {
	fc.assert(
		fc.property(fc.integer(), fc.string(), (n, input) => {
			let u = pure(x => x+1), v = pure(x => x*2), w = pure(n);
			expect(pure(curry(compose)).seq(u).seq(v).seq(w).run(input)).toEqual(u.seq(v.seq(w)).run(input));
		})
	);
});

// (homomorphism) pure f <*> pure x = pure (f x)
test("(homomorphism) pure(f).seq(pure(x)) == pure(f(x))", () => {
	fc.assert(
		fc.property(fc.integer(), fc.string(), (x, input) => {
			let f = x => x+1;
			expect(pure(f).seq(pure(x)).run(input)).toEqual(pure(f(x)).run(input));
		})
	);
});

// (interchange) u <*> pure y = pure ($ y) <*> u
test("(interchange) u.seq(pure(y)) == pure(f => f(y)).seq(u)", () => {
	fc.assert(
		fc.property(fc.integer(), fc.string(), (y, input) => {
			let u = pure(x => x+1);
			expect(u.seq(pure(y)).run(input)).toEqual(pure(f => f(y)).seq(u).run(input));
		})
	);
});

// (functor) fmap f x = pure f <*> x
test("(functor) x.map(f) == pure(f).seq(x)", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let f = length, x = char;
			expect(x.map(f).run(input)).toEqual(pure(f).seq(x).run(input));
		})
	);
});