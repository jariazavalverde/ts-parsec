import * as fc from "fast-check";
import {Parser} from "../src/parser";
const {compose, id} = Parser.utils;



// Code under test
const char: Parser<string> = new Parser(input => input.length > 0 ? [[input[0], input.substr(1)]] : []);
const length = (val: string) => val.length;
const succ = (val: number) => val+1;



// Properties

// fmap id == id
test("parser.map(id) == id(parser)", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let char1 = char.map(id);
			let char2 = id(char);
			expect(char1.run(input)).toEqual(char2.run(input));
		})
	);
});

// fmap (f . g) == fmap f . fmap g
test("parser.map(compose(f, g)) == compose(p => p.map(f), p => p.map(g))(parser)", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let char1 = char.map(compose(succ)(length));
			let char2 = compose
				((p: Parser<number>) => p.map(succ))
				((p: Parser<string>) => p.map(length))
				(char);
			expect(char1.run(input)).toEqual(char2.run(input));
		})
	);
});