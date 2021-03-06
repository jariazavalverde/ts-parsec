export interface Parser<A> {
	label: string
	run: (input: string) => Array<[A, string]>
	set: (parser: Parser<A>) => undefined
	to: (label: string) => Parser<A>
	// functor
	map: <B>(fn: (val: A) => B) => Parser<B>
	replace: <B>(val: B) => Parser<B>
	// applicative
	ap: <A, B>(this: Parser<(a: A) => B>, parser: Parser<A>) => Parser<B>
	then: <B>(parser: Parser<B>) => Parser<B>
	left: <B>(parser: Parser<B>) => Parser<A>
	// monad
	bind: <B>(fn: (val: A) => Parser<B>) => Parser<B>
	// alternative
	or: (parser: Parser<A>) => Parser<A>
	some: () => Parser<A[]>
	many: () => Parser<A[]>
};

export function Parser<A, B>(run: (input: string) => Array<[A, string]>) {
	this.run = run;
	this.label = undefined;
}

Parser.prototype.set = function<A>(parser: Parser<A>) {
	this.run = parser.run;
};

Parser.prototype.to = function<A>(label: string): Parser<A> {
	let parser = new Parser(input => this.run(input));
	parser.label = label;
	return parser;
};

Parser.chain = function(parsers: Array<((val: any) => Parser<any>) | Parser<any>>): Parser<any> {
	return new Parser(input => {
		let args = {};
		let parser: Parser<any> = typeof parsers[0] === "function" ? (<(val: any) => Parser<any>><unknown>parsers[0])(args) : <Parser<any>><unknown>parsers[0];
		let xs: Array<[[any, string], any]> = parser.run(input).map(x => [x, {}]);
		let ys: Array<[[any, string], any]>;
		for(let i = 1; i < parsers.length; i++) {
			ys = [];
			for(let j = 0; j < xs.length; j++) {
				args = xs[j][1];
				args[i-1] = xs[j][0][0];
				if(parser.label !== undefined)
					args[parser.label] = xs[j][0][0];
				parser = typeof parsers[i] === "function" ? (<(val: any) => Parser<any>><unknown>parsers[i])(args) : <Parser<any>><unknown>parsers[i];
				ys = ys.concat(parser.run(xs[j][0][1]).map(x => [x, Object.assign({}, args)]));
			}
			xs = ys;
		}
		return xs.map(x => x[0]);
	});
}



// FUNCTOR

// Apply a function to any value parsed.
// (fmap)
Parser.prototype.map = function<A, B>(fn: (val: A) => B): Parser<B> {
	return new Parser(input => this.run(input).map((val: [A, string]) => [fn(val[0]), val[1]]));
};

// Replace all locations in any value parsed with the same value.
// (<$)
Parser.prototype.replace = function<A, B>(val: B): Parser<B> {
	return this.map((_: A) => val);
};



// APPLICATIVE

// Inject a value into the parser.
// (pure) (return)
Parser.pure = function<A>(val: A): Parser<A> {
	return new Parser(input => [[val, input]]);
};

// Sequential application.
// (<*>)
Parser.prototype.ap = function<A, B>(this: Parser<(a: A) => B>, parser: Parser<A>): Parser<B> {
	return new Parser(input => [].concat.apply([],
		this.run(input).map(
			(val: [(a: A) => B, string]) => parser.map(val[0]).run(val[1]))
	));
};

// Sequence actions, discarding the value of the first argument.
// (*>) (>>)
Parser.prototype.then = function<B>(parser: Parser<B>): Parser<B> {
	return this.replace((x: B) => x).ap(parser);
};

// Sequence actions, discarding the value of the second argument.
// (<*)
Parser.prototype.left = function<A, B>(parser: Parser<B>): Parser<A> {
	return Parser.liftA2((x: A) => (_: B) => x, this, parser);
};

// Lift a binary function to actions.
// (liftA2)
Parser.liftA2 = function<A, B, C>(fn: (a: A) => (b: B) => C, a: Parser<A>, b: Parser<B>): Parser<C> {
	return Parser.pure(fn).ap(a).ap(b);
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
		if(val.length === 0)
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

	// Currying a function (unsafe).
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

	// Currying a function of two parameters.
	// (curry2)
	curry2: function <A, B, C>(fn: (a: A, b: B) => C): (a: A) => (b: B) => C {
		return x => y => fn(x, y);
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
const char_crlf = char_string("\r\n").replace("\n");

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
	spaces: char_space.many().replace(undefined),

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



// COMBINATORS
Parser.combinator = {

	// Parse open, followed by the parser and close.
	// Returns the value returned by the parser.
	between: function <A, B, C>(open: Parser<A>, close: Parser<B>, parser: Parser<C>): Parser<C> {
		return open.then(parser).left(close);
	},

	// Apply the parsers in the array in order, until one of them succeeds.
	// Returns the value of the succeeding parser.
	choice: function <A>(parsers: Array<Parser<A>>): Parser<A> {
		if(parsers.length === 0)
			return Parser.empty();
		return parsers.reduce((acc, parser) => acc.or(parser));
	},

	// Parse n occurrences of a parser. If n is smaller or equal to zero, the parser equals to Parser.pure([]).
	// Returns a list of values returned by the parser.
	count: function <A>(n: number, parser: Parser<A>): Parser<A[]> {
		if(n <= 0)
			return Parser.pure([]);
		return new Parser(input => {
			let val: Array<[A[], string]>,
				 xs: Array<[A[], string]> = parser.run(input).map((x: [A, string]) => [[x[0]], x[1]]);
			while(xs.length > 0 && --n > 0) {
				val = xs;
				xs = [].concat.apply([],
						val.map((x: [A[], string]) => parser.run(x[1]).map((y: [A, string]) => [x[0].concat([y[0]]), y[1]])))
			}
			return xs;
		});
	},

	// This parser only succeeds at the end of the input.
	eof: new Parser(input => input === "" ? [[undefined, ""]] : []),

	// Apply a parser one or more times.
	// Returns a list of the returned values of the parser.
	many: function <A>(parser: Parser<A>): Parser<A[]> {
		return parser.many();
	},

	// Try to apply a parser.
	// If it fails without consuming input, it returns a default value, otherwise the value returned by the parser.
	option: function <A>(val: A, parser: Parser<A>): Parser<A> {
		return parser.or(Parser.pure(val));
	},

	// Try to apply a parser. It will parse the given parser or nothing. It only fails if the parser fails after consuming input. 
	// It discards the result of the parser.
	optional: function <A>(parser: Parser<A>): Parser<undefined> {
		return parser.then(Parser.pure(undefined)).or(Parser.pure(undefined));
	},

	// Parse zero or more occurrences of a parser, separated by a separator.
	// Returns a list of values returned by the parser.
	sepBy: function <A, B>(sep: Parser<A>, parser: Parser<B>): Parser<B[]> {
		return parser.bind(x =>
			sep.then(parser).many().bind(xs =>
				Parser.pure([x].concat(xs))
			)
		).or(Parser.pure([]));
	},

	// Parse one or more occurrences of a parser, separated by a separator.
	// Returns a list of values returned by the parser.
	sepBy1: function <A, B>(sep: Parser<A>, parser: Parser<B>): Parser<B[]> {
		return parser.bind(x =>
			sep.then(parser).many().bind(xs =>
				Parser.pure([x].concat(xs))
			)
		);
	},

	// Apply a parser zero or more times.
	// Returns a list of the returned values of the parser.
	some: function <A>(parser: Parser<A>): Parser<A[]> {
		return parser.some();
	}

};