export interface Parser<A> {
	run: (input: string) => Array<[A, string]>
	// functor
	map: <B>(fn: (val: A) => B) => Parser<B>
	cons: <B>(val: B) => Parser<B>
	// applicative
	seq: <B, C>(parser: Parser<B>) => Parser<C>
	lseq: <B>(parser: Parser<B>) => Parser<A>
	rseq: <B>(parser: Parser<B>) => Parser<B>
	// monad
	bind: <B>(fn: (val: A) => Parser<B>) => Parser<B>
	then: <B>(parser: Parser<B>) => Parser<B>
	// alternative
	or: (parser: Parser<A>) => Parser<A>
	some: () => Parser<A[]>
	many: () => Parser<A[]>
};

export function Parser<A, B>(run: (input: string) => Array<[A, string]>) {
	this.run = run;
}

Parser.prototype.set = function<A>(parser: Parser<A>) {
	this.run = parser.run;
};



// FUNCTOR

// Apply a function to any value parsed.
// (fmap)
Parser.prototype.map = function<A, B>(fn: (val: A) => B): Parser<B> {
	return new Parser(input => this.run(input).map((val: [A, string]) => [fn(val[0]), val[1]]));
};

// Replace all locations in any value parsed with the same value.
// (<$)
Parser.prototype.cons = function<A, B>(val: B): Parser<B> {
	return this.map((_: A) => val);
};



// APPLICATIVE

// Inject a value into the parser.
// (return)
Parser.pure = function<A>(val: A): Parser<A> {
	return new Parser(input => [[val, input]]);
};

// Sequential application.
// (<*>)
Parser.prototype.seq = function<A, B, C>(parser: Parser<B>): Parser<C> {
	return new Parser(input => [].concat.apply([],
		this.run(input).map(
			(val: [(b: B) => C, string]) => parser.map(val[0]).run(val[1]))
	));
};

// Sequence actions, discarding the value of the second argument.
// (<*)
Parser.prototype.lseq = function<A, B>(parser: Parser<B>): Parser<A> {
	return Parser.liftA2((x: A, _) => x, this, parser);
};

// Sequence actions, discarding the value of the first argument.
// (*>)
Parser.prototype.rseq = function<B>(parser: Parser<B>): Parser<B> {
	return this.cons((x: B) => x).seq(parser);
};

// Lift a binary function to actions.
// (liftA2)
Parser.liftA2 = function<A, B, C>(fn: (a: A, b: B) => C, a: Parser<A>, b: Parser<B>): Parser<C> {
	return a.map((x: A) => ((y: B) => fn(x, y))).seq(b);
};



// MONAD

// Sequentially compose two parsers, passing any value produced
// by the first as an argument to the second.
// (>>=)
Parser.prototype.bind = function<A, B>(fn: (val: A) => Parser<B>): Parser<B> {
	return new Parser(input => [].concat.apply([],
		this.run(input).map(
			(val: A) => fn(val[0]).run(val[1])
		)
	));
};

// Sequentially compose two parsers, discarding any value produced
// by the first.
// (>>)
Parser.prototype.then = function<A, B>(parser: Parser<B>): Parser<B> {
	return this.bind((_: A) => parser);
};



// ALTERNATIVE

// The identity of Parser.prototype.or.
// (empty)
Parser.empty = function(): Parser<undefined> {
	return new Parser(_ => []);
};

// If the first parser doesn't produce any value, return the value
// produced by the second.
// (<|>)
Parser.prototype.or = function<A>(parser: Parser<A>): Parser<A> {
	return new Parser(input => {
		let val = this.run(input);
		if(val.length == 0)
			return parser.run(input);
		return val;
	});
};

// One or more.
// (some)
Parser.prototype.some = function<A>(): Parser<A[]> {
	return new Parser(input => {
		let val: Array<[A[], string]>,
		     xs: Array<[A[], string]> = this.run(input).map((x: [A, string]) => [[x[0]], x[1]]);
		if(xs.length == 0)
			return [];
		while(xs.length > 0) {
			val = xs;
			xs = [].concat.apply([],
				val.map((x: [A[], string]) => this.run(x[1]).map((y: [A, string]) => [x[0].concat([y[0]]), y[1]])))
		}
		return val;
	});
};

// Zero or more.
// (many)
Parser.prototype.many = function<A>(): Parser<A[]> {
	return new Parser(input => {
		let val: Array<[A[], string]>,
		     xs: Array<[A[], string]> = this.run(input).map((x: [A, string]) => [[x[0]], x[1]]);
		if(xs.length == 0)
			return [[[], input]];
		while(xs.length > 0) {
			val = xs;
			xs = [].concat.apply([],
				val.map((x: [A[], string]) => this.run(x[1]).map((y: [A, string]) => [x[0].concat([y[0]]), y[1]])))
		}
		return val;
	});
};



// UTILS
Parser.utils = {

	// Currying a function.
	// (curry)
	curry: function(fn, ctx?) {
		var args = Array.prototype.slice.call(arguments, 2);
		return function() {
			var args2 = args.concat(Array.prototype.slice.call(arguments, 0));
			if(args2.length >= fn.length) {
				return fn.apply(ctx || null, args2);
			} else {
				args2.unshift(fn, ctx);
				return Parser.utils.curry.apply(null, args2);
			}
		};
	},

	// Identity function.
	// (id)
	id: function <A>(val: A): A {
		return val;
	},

	// Function composition.
	// (.)
	compose: function <A, B, C>(f: (b: B) => C): ((g: (a: A) => B) => ((a: A) => C)) {
		return g => x => f(g(x));
	}

};



// CHARACTERS

const char_satisfy = function(predicate: ((c: string) => boolean)): Parser<string> {
	return new Parser(input => input.length > 0 && predicate(input[0]) ? [[input[0], input.substr(1)]] : []);
};

const char_string = function(val: string): Parser<string> {
	var length = val.length;
	return new Parser(input => input.length >= length && input.substr(0, length) == val ? [[val, input.substr(length)]] : []);
};

const char_space = char_satisfy(c => /\s/.test(c));
const char_newline = char_satisfy(c => c === '\n');
const char_crlf = char_string("\r\n").cons("\n");

Parser.char = {

	// Parse an alphabetic or numeric character.
	// Returns the parsed character.
	alphaNum: char_satisfy(c => c.toLowerCase() !== c.toUpperCase() || c >= '0' && c <= '9'),

	// Parse any character.
	// Returns the parsed character.
	anyChar: new Parser(input => input.length > 0 ? [[input[0], input.substr(1)]] : []),

	// Parse a single character.
	// Returns the parsed character.
	char: function(c: string): Parser<string> {
		return char_satisfy(x => x === c);
	},

	// Parse a carriage return character ('\r') followed by a newline character ('\n').
	// Returns a newline character.
	crlf: char_crlf,

	// Parse a CRLF (see Parser.char.crlf) or LF (see Parser.char.newline) end-of-line.
	// Returns a newline character ('\n').
	endOfLine: char_newline.or(char_crlf),

	// Parse a hexadecimal digit (a digit or a letter between 'a' and 'f' or 'A' and 'F').
	// Returns the parsed character.
	hexDigit: char_satisfy(c => c >= '0' && c <= '9' || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F'),

	// Parse an ASCII digit.
	// Returns the parsed character.
	digit: char_satisfy(c => c >= '0' && c <= '9'),

	// Parse an alphabetic Unicode characters.
	// Returns the parsed character.
	letter: char_satisfy(c => c.toLowerCase() !== c.toUpperCase()),

	// Parse an lower case letter.
	// Returns the parsed character.
	lower: char_satisfy(c => c.toLowerCase() !== c.toUpperCase() && c === c.toLowerCase()),

	// Parse a newline character ('\n').
	// Returns a newline character.
	newline: char_newline,

	// Succeed if the current character is not in the supplied list of characters.
	// Returns the parsed character.
	noneOf: function(cs: string) {
		return char_satisfy(c => cs.indexOf(c) === -1);
	},

	// Parse an octal digit (a character between '0' and '7').
	// Returns the parsed character.
	octDigit: char_satisfy(c => c >= '0' && c <= '7'),

	// Succeed if the current character is in the supplied list of characters.
	// Returns the parsed character.
	oneOf: function(cs: string) {
		return char_satisfy(c => cs.indexOf(c) !== -1);
	},

	// Succeed for any character for which the supplied function returns true.
	// Returns the parsed character.
	satisfy: char_satisfy,

	// Parse a white space character.
	// Returns the parsed character.
	space: char_space,

	// Skip zero or more white space characters.
	spaces: char_space.many().cons(undefined),

	// Parse a sequence of characters.
	// Returns the parsed string.
	string: char_string,

	// Parse a tab character ('\t').
	// Returns a tab character.
	tab: char_satisfy(c => c === '\t'),

	// Parse an upper case letter.
	// Returns the parsed character.
	upper: char_satisfy(c => c.toLowerCase() !== c.toUpperCase() && c === c.toUpperCase())

};