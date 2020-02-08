interface Parser<A> {
	run: (input: string) => Array<[A, string]>
	bind: <B>(fn: (val: A) => Parser<B>) => Parser<B>
	then: <B>(parser: Parser<B>) => Parser<B>
	or: (parser: Parser<A>) => Parser<A>
	some: () => Parser<A[]>
	many: () => Parser<A[]>
}

function Parser<A>(run: (input: string) => Array<[A, string]>) {
	this.run = run;
}

// Inject a value into the parser.
// (return)
Parser.pure = function<A>(val: A): Parser<A> {
	return new Parser(input => [[val, input]]);
};

// The identity of Parser.prototype.or.
// (empty)
Parser.empty = function(): Parser<[]> {
	return new Parser(_ => []);
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