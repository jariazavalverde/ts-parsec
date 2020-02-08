import * as fc from "fast-check";
import {Parser} from "../src/parser";
const {pure} = Parser;



// Code under test
const char: Parser<string> = new Parser(input => input.length > 0 ? [[input[0], input.substr(1)]] : []);



// Properties

// some v = (:) <$> v <*> many v
test("v.some() == v.map(x => xs => [x].concat(xs)).seq(v.many())", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let v = char;
			expect(v.some().run(input)).toEqual(v.map(x => xs => [x].concat(xs)).seq(v.many()).run(input));
		})
	);
});

// many v = some v <|> pure []
test("v.many() == v.some().or(pure([]))", () => {
	fc.assert(
		fc.property(fc.string(), input => {
			let v = char;
			expect(v.many().run(input)).toEqual(v.some().or(pure([])).run(input));
		})
	);
});