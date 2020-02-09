import * as fc from "fast-check";
import {Parser} from "../src/parser";
const {anyChar, char, digit, noneOf, oneOf, satisfy, space, spaces, string} = Parser.char;



// Code under test
const repeat = function(val: string, n: number): string {
	let str = "";
	while(n > 0) {
		str += val;
		n--;
	}
	return str;
};



// Properties
test("Basic tests", () => {
	fc.assert(
		fc.property(fc.integer(0, 10000), fc.string(), fc.char(), (nat, input_string, input_char) => {
			let input_spaces = repeat(" ", nat);
			let input_digits = nat.toString();
			expect(char(input_char).run(input_char)).toEqual([[input_char, ""]]);
			expect(char(input_char).run(input_char + input_string)).toEqual([[input_char, input_string]]);
			expect(anyChar.many().run(input_string)).toEqual([[input_string.split(""), ""]]);
			expect(digit.many().run(input_digits)).toEqual([[input_digits.split(""), ""]]);
			expect(digit.some().run(input_digits)).toEqual([[input_digits.split(""), ""]]);
			expect(noneOf(input_string).run(input_string)).toEqual([]);
			expect(oneOf(input_char + input_string).run(input_char + input_string)).toEqual([[input_char, input_string]]);
			expect(oneOf(input_string).many().run(input_string)).toEqual([[input_string.split(""), ""]]);
			expect(satisfy(_ => true).run(input_char)).toEqual([[input_char, ""]]);
			expect(satisfy(_ => false).run(input_char)).toEqual([]);
			expect(satisfy(_ => true).many().run(input_string)).toEqual([[input_string.split(""), ""]]);
			expect(satisfy(_ => false).many().run(input_string)).toEqual([[[], input_string]]);
			expect(satisfy(_ => false).some().run(input_string)).toEqual([]);
			expect(space.run(" " + input_string)).toEqual([[" ", input_string]]);
			expect(spaces.run(input_spaces)).toEqual([[undefined, ""]]);
			expect(string(input_string).run(input_string)).toEqual([[input_string, ""]]);
			expect(string(input_string).run(input_string + input_string)).toEqual([[input_string, input_string]]);
		})
	);
});