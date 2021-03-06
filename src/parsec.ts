/** Position */

export interface Position {
	name: string
	line: number
	column: number
	updateChar: (char: string) => Position
};

export function Position(name: string, line: number, column: number) {
	this.name = name;
	this.line = line;
	this.column = column;
}

Position.init = function(name: string) {
	return new Position(name, 1, 1);
};

Position.prototype.updateChar = function(char: string): Position {
	switch(char) {
		case "\n": return new Position(this.name, this.line+1, 1);
		case "\t": return new Position(this.name, this.line, this.column + 8 - ((this.column-1) % 8));
		default: return new Position(this.name, this.line, this.column+1);
	}
};



/** ParseError */

export interface ParseError {
	position: Position
	messages: string[]
	merge: (err: ParseError) => ParseError
};

export function ParseError(position: Position, messages?: string[]) {
	this.position = position;
	this.messages = messages;
};

ParseError.prototype.merge = function(err: ParseError) {
	if(err.messages.length === 0 && this.messages.length !== 0)
		return this;
	else if(this.messages.length === 0 && err.messages.length !== 0)
		return err;
	else {
		if(this.position > err.position)
			return this;
		else if(err.position > this.position)
			return err;
		else
			return new ParseError(this.position, this.messages.concat(err.messages));
	}
}



/** State */

export interface State<U> {
	user: U
	position: Position
	input: string
};

export function State<U>(input: string, position: Position, user: U) {
	this.input = input;
	this.position = position;
	this.user = user;
}



/** Reply */

export interface Reply<U, A> {
	success: boolean
	parsed: A
	state: State<U>
	parseError: ParseError
	isOk: () => boolean
	isError: () => boolean
};

export function Reply<U, A>(success: boolean, parsed: A, state: State<U>, parseError: ParseError) {
	this.success = success;
	this.parsed = parsed;
	this.state = state;
	this.parseError = parseError;
};

Reply.Ok = function<U, A>(parsed: A, state: State<U>, parseError: ParseError): Reply<U, A> {
	return new Reply(true, parsed, state, parseError);
};

Reply.Error = function<U, A>(parseError: ParseError): Reply<U, A> {
	return new Reply(false, undefined, undefined, parseError);
};

Reply.prototype.isOk = function(): boolean {
	return this.success;
};

Reply.prototype.isError = function(): boolean {
	return !this.success;
};



/** Consumed */

export interface Consumed<A> {
	consumed: boolean
	value: A
};

export function Consumed<A>(consumed: boolean, value: A) {
	this.consumed = consumed;
	this.value = value;
}

Consumed.Consumed = function<A>(value: A): Consumed<A> {
	return new Consumed(true, value);
};

Consumed.Empty = function<A>(value: A): Consumed<A> {
	return new Consumed(false, value);
};



/** Parsec */

type unParser<U, A> = (
	state: State<U>,
	cok: (val: A, state: State<U>, error: ParseError) => Consumed<Reply<U, A>>,
	cerr: (error: ParseError) => Consumed<Reply<U, A>>,
	eok: (val: A, state: State<U>, error: ParseError) => Consumed<Reply<U, A>>,
	eerr: (error: ParseError) => Consumed<Reply<U, A>>
) => Consumed<Reply<U, A>>;

export interface Parsec<U, A> {
	unParser: unParser<U, A>
	runParsec: (state: State<U>) => Consumed<Reply<U, A>>
	runParser: (state: U, name: string, input: string) => ParseError | A
	// Functor
	map: <B>(fn: (a: A) => B) => Parsec<U, B>
	replace: <B>(val: B) => Parsec<U, B>
	// Applicative
	ap: <A, B>(this: Parsec<U, (a: A) => B>, parser: Parsec<U, A>) => Parsec<U, B>
	// Monad
	bind: <B>(fn: (val: A) => Parsec<U, B>) => Parsec<U, B>
	// Alternative
	or: (parser: Parsec<U, A>) => Parsec<U, A>
};

export function Parsec<U, A>(unParser: unParser<U, A>) {
	this.unParser = unParser;
}

Parsec.prototype.runParsec = function<U, A>(state: State<U>): Consumed<Reply<U, A>> {
	let cok = (a: A, s: State<U>, err: ParseError) => Consumed.Consumed(Reply.Ok(a, s, err));
	let cerr = (err: ParseError) => <Consumed<Reply<U, A>>> Consumed.Consumed(Reply.Error(err));
	let eok = (a: A, s: State<U>, err: ParseError) => Consumed.Empty(Reply.Ok(a, s, err));
	let eerr = (err: ParseError) => <Consumed<Reply<U, A>>> Consumed.Empty(Reply.Error(err));
	return this.unParser(state, cok, cerr, eok, eerr);
};

Parsec.prototype.runParser = function<U, A>(state: U, name: string, input: string): ParseError | A {
	let res: Consumed<Reply<U, A>> = this.runParsec(new State(input, Position.init(name), state));
	let r: Reply<U, A> = res.value;
	return r.isOk() ? r.parsed : r.parseError;
};

// Functor

// Applies a function to any value parsed.
// (fmap)
Parsec.prototype.map = function<U, A, B>(fn: (a: A) => B): Parsec<U, B> {
	return new Parsec((s: State<U>, cok: (val: B, state: State<U>, error: ParseError) => Consumed<Reply<U, B>>, cerr, eok, eerr) =>
		this.unParser(
			s,
			(x: A, s: State<U>, e: ParseError) => cok(fn(x), s, e),
			cerr,
			(x: A, s: State<U>, e: ParseError) => eok(fn(x), s, e),
			eerr
		)
	);
};

// Replaces all locations in any value parsed with the same value.
// ($>)
Parsec.prototype.replace = function<U, A, B>(val: B): Parsec<U, B> {
	return this.map((_a: A) => val);
};

// Alternative

// If the first parser doesn't produce any value, returns the value
// produced by the second.
// (<|>)
Parsec.prototype.or = function<U, A>(parser: Parsec<U, A>): Parsec<U, A> {
	return new Parsec((s: State<U>, cok: (val: A, state: State<U>, error: ParseError) => Consumed<Reply<U, A>>, cerr, eok, eerr) => {
		let meerr = ((err: ParseError) => {
			let neok = (y: A, s: State<U>, err2: ParseError) => eok(y, s, err.merge(err2));
			let neerr = (err2: ParseError) => eerr(err.merge(err2));
			return parser.unParser(s, cok, cerr, neok, neerr);
		});
		return this.unParser(s, cok, cerr, eok, meerr);
	});
};

// Applicative

// Injects a value into the parser.
// (pure, return)
Parsec.pure = function<U, A>(val: A): Parsec<U, A> {
	return new Parsec((s, _cok, _cerr, eok, _eerr) => eok(val, s, new ParseError(s.position, ["unknown error"])));
};

// Sequential application.
// (<*>)
Parsec.prototype.ap = function<U, A, B>(this: Parsec<U, (a: A) => B>, parser: Parsec<U, A>): Parsec<U, B> {
	return this.bind(f => parser.bind(x => Parsec.pure(f(x))));
};

// Monad

// Sequentially composes two parsers, passing any value produced
// by the first as an argument to the second.
// (>>=)
Parsec.prototype.bind = function<U, A, B>(fn: (val: A) => Parsec<U, B>): Parsec<U, B> {
	return new Parsec((s: State<U>, cok: (val: B, state: State<U>, error: ParseError) => Consumed<Reply<U, B>>, cerr, eok, eerr) => {
		let mcok = (x: A, s: State<U>, err: ParseError) => {
			let peok = (x: B, s: State<U>, err2: ParseError) => cok(x, s, err.merge(err2));
			let peerr = (err2: ParseError) => cerr(err.merge(err2));
			return fn(x).unParser(s, cok, cerr, peok, peerr);
		};
		let meok = (x: A, s: State<U>, err: ParseError) => {
			let peok = (x: B, s: State<U>, err2: ParseError) => eok(x, s, err.merge(err2));
			let peerr = (err2: ParseError) => eerr(err.merge(err2));
			return fn(x).unParser(s, cok, cerr, peok, peerr);
		};
		return this.unParser(s, mcok, cerr, meok, eerr);
	});
};



/** Token */

export const Token: any = {};

Token.token = function<U, A>(tokpos: (t: string) => Position, test: (t: string) => A | undefined): Parsec<U, A> {
	let nextpos = (_pos: Position, tok: string, ts: string) => {
		if(ts.length === 0)
			return tokpos(tok);
		return tokpos(ts[0]);
	};
	return Token.tokenPrim(nextpos, test);
};

Token.tokenPrim = function<U, A>(nextpos: (pos: Position, t: string, s: string) => Position, test: (t: string) => A | undefined): Parsec<U, A> {
	return Token.tokenPrimEx(nextpos, undefined, test);
}

Token.tokenPrimEx = function<U, A>(
	nextpos: (pos: Position, t: string, s: string) => Position,
	nextState: ((pos: Position, t: string, s: string, u: U) => U) | undefined,
	test: (t: string) => A | undefined): Parsec<U, A>
{
	if(nextState === undefined) {
		return new Parsec((state: State<U>, cok: (val: A, state: State<U>, error: ParseError) => Consumed<Reply<U, A>>, _cerr, _eok, eerr) => {
			if(state.input.length === 0) {
				return eerr(new ParseError(state.position, ["unexpected error"]));
			} else {
				let c = state.input[0];
				let cs = state.input.substr(1);
				let x = test(state.input[0]);
				if(x !== undefined) {
					let newpos = nextpos(state.position, c, cs);
					let newstate = new State(cs, newpos, state.user);
					return cok(x, newstate, new ParseError(newpos, ["unknown error"]));
				} else {
					return eerr(new ParseError(state.position, [c]));
				}
			}
		});
	} else {
		return new Parsec((state: State<U>, cok: (val: A, state: State<U>, error: ParseError) => Consumed<Reply<U, A>>, _cerr, _eok, eerr) => {
			if(state.input.length === 0) {
				return eerr(new ParseError(state.position, ["unexpected error"]));
			} else {
				let c = state.input[0];
				let cs = state.input.substr(1);
				let x = test(state.input[0]);
				if(x !== undefined) {
					let newpos = nextpos(state.position, c, cs);
					let newUser = nextState(state.position, c, cs, state.user);
					let newstate = new State(cs, newpos, newUser);
					return cok(x, newstate, new ParseError(newpos, ["unknown error"]));
				} else {
					return eerr(new ParseError(state.position, [c]));
				}
			}
		});
	}
};



/** Char */

export const Char: any = {};

// Succeeds for any character for which the supplied function returns true.
// Returns the parsed character.
Char.satisfy = function<U>(predicate: (char: string) => boolean): Parsec<U, string> {
	return Token.tokenPrim(
		(pos: Position, c: string, _cs: string) => pos.updateChar(c),
		(c: string) => predicate(c) ? c : undefined
	);
};

// Parses any character.
// Returns the parsed character.
Char.anyChar = Char.satisfy(_val => true);

// Parses a single character.
// Returns the parsed character.
Char.char = function<U>(c: string): Parsec<U, string> {
	return Char.satisfy((val: string) => val === c);
};