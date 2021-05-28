/* eslint-disable @typescript-eslint/no-empty-function */
import {expectType, expectError, expectNotAssignable, expectAssignable} from 'tsd';
import pEvent = require('p-event');
import Emittery = require('.');

type AnyListener = (eventData?: unknown) => void | Promise<void>;

// Emit
{
	const ee = new Emittery();
	ee.emit('anEvent');
	ee.emit('anEvent', 'some data');
}

// On
{
	const ee = new Emittery();
	ee.on('anEvent', () => undefined);
	ee.on('anEvent', async () => Promise.resolve());
	ee.on('anEvent', data => undefined);
	ee.on('anEvent', async data => Promise.resolve());
	ee.on(Emittery.listenerAdded, ({eventName, listener}) => {
		expectType<string | symbol | undefined>(eventName);
		expectType<AnyListener>(listener);
	});
	ee.on(Emittery.listenerRemoved, ({eventName, listener}) => {
		expectType<string | symbol | undefined>(eventName);
		expectType<AnyListener>(listener);
	});
}

// Off
{
	const ee = new Emittery();
	ee.off('anEvent', () => undefined);
	ee.off('anEvent', async () => Promise.resolve());
	ee.off('anEvent', data => undefined);
	ee.off('anEvent', async data => Promise.resolve());
	ee.off(Emittery.listenerAdded, ({eventName, listener}) => {});
	ee.off(Emittery.listenerRemoved, ({eventName, listener}) => {});
}

// Once
{
	const ee = new Emittery();
	const test = async () => {
		await ee.once('anEvent');
		await ee.once(Emittery.listenerAdded).then(({eventName, listener}) => {
			expectType<string | symbol | undefined>(eventName);
			expectType<AnyListener>(listener);
		});
		await ee.once(Emittery.listenerRemoved).then(({eventName, listener}) => {
			expectType<string | symbol | undefined>(eventName);
			expectType<AnyListener>(listener);
		});
	};
}

{
	const ee = new Emittery();
	expectError(ee.emit('anEvent', 'some data', 'and more'));
}

{
	const ee = new Emittery();
	expectError(ee.on('anEvent', (data: any, more: any) => undefined));
}

// IsDebug
{
	type MyEventData = {
		value: string;
		open: undefined;
		close: boolean;
	};

	const ee = new Emittery<MyEventData>();

	const myLogger = (type: string, debugName: string, eventName?: keyof MyEventData, eventData?: MyEventData[keyof MyEventData]): void => {
		expectAssignable<string>(type);
		expectAssignable<string>(debugName);
		expectAssignable<string | undefined>(eventName);
		expectAssignable<MyEventData[keyof MyEventData]>(eventData);
	};

	const debugOptions = {name: 'test', enabled: true, logger: myLogger};

	// Global debug flag
	expectAssignable<boolean>(Emittery.isDebugEnabled);

	// General debug options
	expectAssignable<typeof ee.debug>(debugOptions);
	expectAssignable<string>(ee.debug.name);
	expectAssignable<boolean | undefined>(ee.debug.enabled);

	// Debug logger
	expectNotAssignable<() => undefined>(ee.debug.logger);
	expectNotAssignable<(data: unknown) => undefined>(ee.debug.logger);
	expectNotAssignable<(type: string, debugName: string) => undefined>(ee.debug.logger);
	expectNotAssignable<((type: string, debugName: string, eventName?: string, eventData?: Record<string, any>) => void) | undefined>(ee.debug.logger);
	expectAssignable<typeof ee.debug.logger>(myLogger);
}

// Userland can't emit the meta events
{
	const ee = new Emittery();
	expectError(ee.emit(Emittery.listenerRemoved));
	expectError(ee.emit(Emittery.listenerAdded));
}

// Strict typing for emission
{
	const ee = new Emittery<{
		value: string;
		open: undefined;
		close: undefined;
	}>();
	ee.emit('open');
	ee.emit('close');
	ee.emit('value', 'test');
	expectError(ee.emit('value'));
	expectError(ee.emit('open', 'test'));
}

// Strict typing for listeners
{
	const ee = new Emittery<{
		value: string;
		open: undefined;
		close: undefined;
	}>();
	ee.on('open', () => {});
	ee.on('open', argument => {
		expectType<undefined>(argument);
	});

	ee.on('value', () => {});
	ee.on('value', argument => {
		expectType<string>(argument);
	});

	const listener = (value: string) => undefined;
	ee.on('value', listener);
	ee.off('value', listener);
	const test = async () => {
		const event = await ee.once('value');
		expectType<string>(event);
	};

	expectError(ee.on('value', (value: number) => {}));
}

// Async listeners
{
	const ee = new Emittery<{
		open: undefined;
		close: string;
	}>();
	ee.on('open', () => {});
	ee.on('open', async () => {});
	ee.on('open', async () => Promise.resolve());
	ee.on('close', async value => {
		expectType<string>(value);
	});
}

// Strict typing for onAny, offAny listeners
{
	const ee = new Emittery<{
		value: string;
		open: undefined;
		close: undefined;
		other: number;
	}>();

	ee.onAny((name, data) => {
		expectType<'value' | 'open' | 'close' | 'other'>(name);
		expectType<string | number | undefined>(data);
	});

	const listener = (name: string) => {};
	ee.onAny(listener);
	ee.offAny(listener);
}

// Strict typing for onAny, offAny listeners for an Emittery that only has listeners with arguments
{
	const ee = new Emittery<{
		value: string;
		other: number;
	}>();

	ee.onAny((name, data) => {
		expectType<'value' | 'other'>(name);
		expectType<string | number>(data);
	});
}

// Strict typing for anyEvent iterator
{
	const testAnyEvent = async () => {
		const ee = new Emittery<{
			value: string;
			open: undefined;
			close: undefined;
		}>();

		for await (const event of ee.anyEvent()) {
			expectType<'value' | 'open' | 'close'>(event[0]);

			expectType<string | undefined>(event[1]);
		}

		const ee2 = new Emittery<{
			value: string;
			other: number;
		}>();

		for await (const event of ee2.anyEvent()) {
			expectType<'value' | 'other'>(event[0]);
			expectType<string | number>(event[1]);
		}
	};
}

// Strict typing for `.events` iterator
{
	const testEventsIterator = async () => {
		const ee = new Emittery<{
			value: string;
			open: undefined;
			close: undefined;
		}>();

		for await (const event of ee.events('value')) {
			expectType<string>(event);
		}

		for await (const event of ee.events(['value', 'open'])) {
			expectType<string | undefined>(event);
		}

		const ee2 = new Emittery();
		for await (const event of ee2.events('unknown')) {
			expectType<any>(event);
		}
	};
}

// Compatibility with p-event, without explicit types
{
	const ee = new Emittery();
	pEvent.iterator(ee, 'data', {
		resolutionEvents: ['finish']
	});
}

// Compatibility with p-event, with explicit types
{
	const ee = new Emittery<{
		data: unknown;
		error: unknown;
		finish: undefined;
	}>();
	pEvent.iterator(ee, 'data', {
		resolutionEvents: ['finish']
	});
}

// Mixin type
Emittery.mixin('emittery')(class {
	test() {}
});
