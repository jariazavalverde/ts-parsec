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
	messages: [string]
};



/** State */

export interface State<S, U> {
	input: S
	position: Position
	user: U
};

export function State<S, U>(input: S, position: Position, user: U) {
	this.input = input;
	this.position = position;
	this.user = user;
}



/** Reply */

export interface Reply<S, U, A> {
	success: boolean
	parsed: A
	state: State<S, U>
	parseError: ParseError
	isOk: () => boolean
	isError: () => boolean
};

export function Reply<S, U, A>(success: boolean, parsed: A, state: State<S, U>, parseError: ParseError) {
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

Reply.Ok = function<S, U, A>(parsed: A, state: State<S, U>, parseError: ParseError): Reply<S, U, A> {
	return new Reply(true, parsed, state, parseError);
};

Reply.Error = function<S, U, A>(parseError: ParseError): Reply<S, U, A> {
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

type Parser<S, U, A> = <B>(
	state: State<S, U>,
	cok: (val: A, state: State<S, U>, error: ParseError) => B,
	cerr: (error: ParseError) => B,
	eok: (val: A, state: State<S, U>, error: ParseError) => B,
	eerr: (error: ParseError) => B
) => B;

export interface Parsec<S, U, A> {
	unParser: Parser<S, U, A>
	runParsec: (state: State<S, U>) => Consumed<Reply<S, U, A>>
	runParser: (state: U, filePath: string, input: S) => ParseError | A
};

export function Parsec<S, U, A>(unParser: Parser<S, U, A>) {
	this.unParser = unParser;
}

Parsec.prototype.runParsec = function<S, U, A>(state: State<S, U>): Consumed<Reply<S, U, A>> {
	let cok = (a: A, s: State<S, U>, err: ParseError) => Consumed.Consumed(Reply.Ok(a, s, err));
	let cerr = (err: ParseError) => <Consumed<Reply<S, U, A>>> Consumed.Consumed(Reply.Error(err));
	let eok = (a: A, s: State<S, U>, err: ParseError) => Consumed.Empty(Reply.Ok(a, s, err));
	let eerr = (err: ParseError) => <Consumed<Reply<S, U, A>>> Consumed.Empty(Reply.Error(err));
	return this.unParser(state, cok, cerr, eok, eerr);
};

Parsec.prototype.runParser = function<S, U, A>(state: U, name: string, input: S): ParseError | A {
	let res: Consumed<Reply<S, U, A>> = this.runParsec(new State(state, Position.init(name), input));
	let r: Reply<S, U, A> = res.value;
	return r.isOk() ? r.parsed : r.parseError;
};