export interface Parser<A> {
	run: (input: string) => Array<[A, string]>
	// functor
	map: <B>(fn: (val: A) => B) => Parser<B>
	cons: <B>(val: B) => Parser<B>
	// monad
	bind: <B>(fn: (val: A) => Parser<B>) => Parser<B>
	then: <B>(parser: Parser<B>) => Parser<B>
	// alternative
	or: (parser: Parser<A>) => Parser<A>
	some: () => Parser<A[]>
	many: () => Parser<A[]>
};

export function Parser<A>(run: (input: string) => Array<[A, string]>) {
	this.run = run;
}

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

// MONAD

// Inject a value into the parser.
// (return)
export const pure = function<A>(val: A): Parser<A> {
	return new Parser(input => [[val, input]]);
};

// Sequentially compose two parsers, passing any value produced
// by the first as an argument to the second.
// (>>=)
Parser.prototype.bind = function<A, B>(fn: (val: A) => Parser<B>): Parser<B> {
	return new Parser(input => [].concat.apply([],
		this.runParser(input).map(
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
export const empty = function(): Parser<[]> {
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