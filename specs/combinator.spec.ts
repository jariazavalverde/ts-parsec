import * as fc from "fast-check";
import {Parser} from "../src/parser";
const {anyChar, char, digit, noneOf, string} = Parser.char;
const {between, choice, count, eof, sepBy} = Parser.combinator;



// Properties
test("Basic tests", () => {
	fc.assert(
		fc.property(fc.integer(0, 10000), fc.string(), (nat, input_string) => {
			// between
			expect(between(string("("), string(")"), noneOf(")").many()).run("(" + input_string.replace(/\)/g, "") + ")")).toEqual([[input_string.replace(/\)/g, "").split(""), ""]]);
			// choice
			expect(choice([char('a'), char('b'), char('c')]).run("abcd")).toEqual([["a", "bcd"]]);
			expect(choice([char('a'), char('b'), char('c')]).some().run("abcd")).toEqual([[['a','b','c'], "d"]]);
			expect(choice([char('a'), char('b'), char('c')]).some().run("dcba")).toEqual([]);
			// count
			expect(count(3, char('a')).run("aaabcd")).toEqual([[['a', 'a', 'a'], "bcd"]]);
			expect(count(4, char('a')).run("aaabcd")).toEqual([]);
			expect(count(0, char('a')).run("aaabcd")).toEqual([[[], "aaabcd"]]);
			// eof
			expect(eof.run("")).toEqual([[undefined, ""]]);
			expect(eof.run("some input")).toEqual([]);
			// sepBy
			expect(sepBy(char(','), digit).run("1,2,3,4,5")).toEqual([[['1','2','3','4','5'], ""]]);
			expect(sepBy(char(','), digit).run(",1,2,3,4,5")).toEqual([[[], ",1,2,3,4,5"]]);
			expect(sepBy(char(','), anyChar).run("a,b,c:d,e")).toEqual([[['a','b','c'], ":d,e"]]);
			expect(sepBy(char(','), anyChar).run(",a,b,c,d,e")).toEqual([[[','], "a,b,c,d,e"]]);
		})
	);
});