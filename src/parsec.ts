/** Position */

export interface Position {
	name: string
	line: number
	column: number
};

export function Position(name: string, line: number, column: number) {
	this.name = name;
	this.line = line;
	this.column = column;
}

Position.init = function(name: string) {
	return new Position(name, 1, 1);
};



/** ParseError */

export interface ParseError {
	position: Position
	messages: string[]
};

export function ParseError(position: Position, messages?: string[]) {
	this.position = position;
	this.messages = messages;
};



/** State */

export interface State<U> {
	user: U
	position: Position
	input: string
};

export function State<U>(input: string, position: Position, user: U) {
	this.user = user;
	this.input = input;
	this.position = position;
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

Reply.prototype.isOk = function(): boolean {
	return this.success;
};

Reply.prototype.isError = function(): boolean {
	return !this.success;
};

Reply.Ok = function<U, A>(parsed: A, state: State<U>, parseError: ParseError): Reply<U, A> {
	return new Reply(true, parsed, state, parseError);
};

Reply.Error = function<U, A>(parseError: ParseError): Reply<U, A> {
	return new Reply(false, undefined, undefined, parseError);
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

type Parser<U, A> = <B>(
	state: State<U>,
	cok: (val: A, state: State<U>, error: ParseError) => B,
	cerr: (error: ParseError) => B,
	eok: (val: A, state: State<U>, error: ParseError) => B,
	eerr: (error: ParseError) => B
) => B;

export interface Parsec<U, A> {
	unParser: Parser<U, A>
	runParsec: (state: State<U>) => Consumed<Reply<U, A>>
	runParser: (state: U, name: string, input: string) => ParseError | A
};

export function Parsec<U, A>(unParser: Parser<U, A>) {
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



/** Token */

export const Token: any = {};

Token.token = function<U, A>(showToken: (t: string) => string, tokpos: (t: string) => Position, test: (t: string) => A | undefined): Parsec<U, A> {
	let nextpos = (_, tok, ts) => {
		if(ts.length === 0)
			return tokpos(tok);
		return tokpos(ts[0]);
	};
	return Token.tokenPrim(showToken, nextpos, test);
};

Token.tokenPrim = function<U, A>(showToken: (t: string) => string, nextpos: (pos: Position, t: string, s: string) => Position, test: (t: string) => A | undefined): Parsec<U, A> {
	return Token.tokenPrimEx(showToken, nextpos, undefined, test);
}

Token.tokenPrimEx = function<U, A>(
	showToken: (t: string) => string,
	nextpos: (pos: Position, t: string, s: string) => Position,
	nextState: ((pos: Position, t: string, s: string, u: U) => U) | undefined,
	test: (t: string) => A | undefined): Parsec<U, A>
{
	if(nextState === undefined) {
		return new Parsec((state: State<U>, cok, _cerr, _eok, eerr) => {
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
		return new Parsec((state: State<U>, cok, _cerr, _eok, eerr) => {
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
}