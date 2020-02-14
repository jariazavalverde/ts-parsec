import * as fc from "fast-check";
import {Char} from "../src/parsec";
const {anyChar} = Char;



// Code under test
const compose = f => g => x => f(g(x));
const id = x => x;
const length = (val: string) => val.length;
const succ = (val: number) => val+1;



// Properties

// (identity) fmap id == id
test("f.map(id) == id(f)", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let f = anyChar;
			expect(
				f.map(id).runParser(undefined, "functor.spec.ts : identity", input)
			).toEqual(
				id(f).runParser(undefined, "functor.spec.ts : identity", input)
			);
		})
	);
});

// (composition) fmap (f . g) == fmap f . fmap g
test("h.map(compose(f)(g)) == compose(p => p.map(f))(p => p.map(g))(h)", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let h = anyChar, f = succ, g = length;
			expect(
				h.map(compose(f)(g)).runParser(undefined, "functor.spec.ts : composition", input)
			).toEqual(
				compose(p => p.map(f))(p => p.map(g))(h).runParser(undefined, "functor.spec.ts : composition", input)
			);
		})
	);
});