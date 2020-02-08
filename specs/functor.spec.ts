import * as fc from "fast-check";
import {Parser} from "../src/parser";
const {compose, id} = Parser.utils;
const {anyChar} = Parser.char;



// Code under test
const length = (val: string) => val.length;
const succ = (val: number) => val+1;



// Properties

// fmap id == id
test("parser.map(id) == id(parser)", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let char1 = anyChar.map(id);
			let char2 = id(anyChar);
			expect(char1.run(input)).toEqual(char2.run(input));
		})
	);
});

// fmap (f . g) == fmap f . fmap g
test("parser.map(compose(f, g)) == compose(p => p.map(f), p => p.map(g))(parser)", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let char1 = anyChar.map(compose(succ)(length));
			let char2 = compose
				((p: Parser<number>) => p.map(succ))
				((p: Parser<string>) => p.map(length))
				(anyChar);
			expect(char1.run(input)).toEqual(char2.run(input));
		})
	);
});