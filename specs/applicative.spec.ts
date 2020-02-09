import * as fc from "fast-check";
import {Parser} from "../src/parser";
const {pure} = Parser;
const {compose, id} = Parser.utils;
const {anyChar} = Parser.char;



// Code under test
const length = (val: string) => val.length;



// Properties

// (identity) pure id <*> v = v
test("(identity) pure(id).ap(v) == v", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let v = anyChar;
			expect(pure(id).ap(v).run(input)).toEqual(v.run(input));
		})
	);
});

// (composition) pure (.) <*> u <*> v <*> w = u <*> (v <*> w)
test("(composition) pure(compose).ap(u).ap(v).ap(w) == u.ap(v.ap(w))", () => {
	fc.assert(
		fc.property(fc.integer(), fc.string(), (n, input) => {
			let u = pure(x => x+1), v = pure(x => x*2), w = pure(n);
			expect(pure(compose).ap(u).ap(v).ap(w).run(input)).toEqual(u.ap(v.ap(w)).run(input));
		})
	);
});

// (homomorphism) pure f <*> pure x = pure (f x)
test("(homomorphism) pure(f).ap(pure(x)) == pure(f(x))", () => {
	fc.assert(
		fc.property(fc.integer(), fc.string(), (x, input) => {
			let f = x => x+1;
			expect(pure(f).ap(pure(x)).run(input)).toEqual(pure(f(x)).run(input));
		})
	);
});

// (interchange) u <*> pure y = pure ($ y) <*> u
test("(interchange) u.ap(pure(y)) == pure(f => f(y)).ap(u)", () => {
	fc.assert(
		fc.property(fc.integer(), fc.string(), (y, input) => {
			let u = pure(x => x+1);
			expect(u.ap(pure(y)).run(input)).toEqual(pure(f => f(y)).ap(u).run(input));
		})
	);
});

// (functor) fmap f x = pure f <*> x
test("(functor) x.map(f) == pure(f).ap(x)", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let f = length, x = anyChar;
			expect(x.map(f).run(input)).toEqual(pure(f).ap(x).run(input));
		})
	);
});