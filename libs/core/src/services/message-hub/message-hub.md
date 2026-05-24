# MessageHub

A lightweight, signal-based publish/subscribe message bus for Angular. Provides ephemeral, fire-and-forget pub/sub identified by a string key. Subscribers are automatically cleaned up when their `DestroyRef` fires.

## Installation

`MessageHub` is provided in root — simply inject it:

```ts
private messageHub = inject(MessageHub);
```

Or use the base classes which expose the event API as protected methods:

```ts
export class MyComponent extends ComponentBase { ... }
export class MyService extends ServiceBase { ... }
```

## Event API

### `publish<T>(messageId: string, data: T): void`

Publishes a message to all current subscribers of the given channel. If no subscribers exist, the call is silently ignored (fire-and-forget).

### `subscribe<T>(messageId: string, callback: ReceiveCallback<T>, destroyRef: DestroyRef): void`

Subscribes to messages on the given channel. The callback is invoked every time a new message is published **after** this subscription is created. Cleanup is automatic when the provided `destroyRef` fires.

## Event Usage

### Publishing messages

```ts
@Component({ ... })
export class SenderComponent {
  private messageHub = inject(MessageHub);

  sendGreeting(): void {
    this.messageHub.publish('greeting', { text: 'Hello!' });
  }
}
```

### Subscribing to messages

```ts
@Component({ ... })
export class ReceiverComponent implements OnInit {
  private messageHub = inject(MessageHub);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.messageHub.subscribe<{ text: string }>('greeting', (msg) => {
      console.log(msg.text); // "Hello!"
    }, this.destroyRef);
  }
}
```

### Multiple subscribers on the same channel

Multiple components can subscribe to the same `messageId`. Each subscriber receives every message published after its subscription.

```ts
// Component A
this.messageHub.subscribe<string>('notifications', (msg) => {
  this.toastService.show(msg);
}, this.destroyRef);

// Component B
this.messageHub.subscribe<string>('notifications', (msg) => {
  this.logService.log(msg);
}, this.destroyRef);
```

### Multiple channels

Channels are independent — publishing to one channel does not affect subscribers on another.

```ts
this.messageHub.publish('user-events', { action: 'login' });
this.messageHub.publish('analytics', { page: '/home' });
```

## Key behaviours

| Behaviour | Detail |
|---|---|
| **Fire-and-forget** | Publishing when no subscribers exist is a silent no-op. |
| **No replay** | Late subscribers do **not** receive messages published before they subscribed. |
| **Automatic cleanup** | Subscribers are removed when their `DestroyRef` fires. When the last subscriber is removed, the channel and its reactive effect are destroyed. |
| **Error isolation** | If a callback throws, the error is caught and logged via `console.error`. Other subscribers on the same channel still receive the message. A failing subscriber is **not** auto-unsubscribed — it will be called again on subsequent publishes. |
| **Duplicate prevention** | Registering the same callback reference twice on the same channel throws an error. The same callback can be used on different channels. |
| **Empty messageId guard** | Calling `publish` or `subscribe` with a falsy `messageId` (`''`, `null`, `undefined`) logs a warning and returns immediately. |

## ⚠️ Patterns to avoid

The following patterns involve re-entrant operations during message delivery and are **not supported**. Behaviour in these scenarios is undefined and may lead to missed messages, duplicate deliveries, or subtle ordering bugs.

### 1. Do NOT subscribe inside a callback

Subscribing to a channel from within a callback that is being triggered by that same channel leads to unpredictable behaviour. The new subscriber may or may not receive the current message, and the timing depends on internal signal scheduling.

```ts
// ❌ AVOID — re-entrant subscribe
this.messageHub.subscribe<string>('events', (msg) => {
  // This creates a new subscription during delivery — undefined behaviour
  this.messageHub.subscribe<string>('events', (innerMsg) => {
    console.log(innerMsg);
  }, this.destroyRef);
}, this.destroyRef);
```

**Instead**, subscribe to all channels upfront during initialisation:

```ts
// ✅ CORRECT — subscribe during init, not inside callbacks
ngOnInit(): void {
  this.messageHub.subscribe<string>('events', (msg) => {
    this.handleEvent(msg);
  }, this.destroyRef);

  this.messageHub.subscribe<string>('derived-events', (msg) => {
    this.handleDerived(msg);
  }, this.destroyRef);
}
```

### 2. Do NOT publish inside a callback

Publishing a message from within a subscriber callback (to the same or a different channel) creates re-entrant signal updates. This can cause effects to fire in unexpected order, messages to be delivered out of sequence, or — in the worst case — infinite loops.

```ts
// ❌ AVOID — re-entrant publish (same channel = potential infinite loop)
this.messageHub.subscribe<string>('commands', (msg) => {
  if (msg === 'retry') {
    this.messageHub.publish('commands', 'execute'); // infinite loop risk!
  }
}, this.destroyRef);

// ❌ AVOID — re-entrant publish (different channel = unpredictable ordering)
this.messageHub.subscribe<string>('step-1', () => {
  this.messageHub.publish('step-2', 'go'); // delivery order is undefined
}, this.destroyRef);
```

**Instead**, decouple the publish from the callback using `setTimeout`, `Promise.resolve()`, or Angular's scheduling primitives:

```ts
// ✅ CORRECT — defer the publish to the next microtask
this.messageHub.subscribe<string>('step-1', () => {
  Promise.resolve().then(() => {
    this.messageHub.publish('step-2', 'go');
  });
}, this.destroyRef);
```

### 3. Do NOT destroy a subscriber inside a callback

Calling `destroy()` on a `DestroyRef` (or triggering component destruction) from within a message callback mutates the subscriber list while it is being iterated. This can cause other subscribers to be skipped or the channel to be torn down mid-delivery.

```ts
// ❌ AVOID — self-destruction during delivery
this.messageHub.subscribe<string>('one-shot', (msg) => {
  this.handleOnce(msg);
  this.someComponentRef.destroy(); // triggers DestroyRef, mutates callback map
}, this.destroyRef);

// ❌ AVOID — destroying another subscriber during delivery
this.messageHub.subscribe<string>('control', () => {
  this.otherDestroyRef.destroy(); // removes another subscriber mid-iteration
}, this.destroyRef);
```

**Instead**, defer the destruction:

```ts
// ✅ CORRECT — defer destruction to after delivery completes
this.messageHub.subscribe<string>('one-shot', (msg) => {
  this.handleOnce(msg);
  Promise.resolve().then(() => {
    this.someComponentRef.destroy();
  });
}, this.destroyRef);
```

## Summary of safe usage

| ✅ Safe | ❌ Unsafe |
|---|---|
| Subscribe during `ngOnInit` / constructor | Subscribe inside a callback |
| Publish from user actions, lifecycle hooks | Publish inside a subscriber callback |
| Let `DestroyRef` clean up automatically | Manually destroy subscribers during delivery |
| Use `Promise.resolve().then(...)` to defer | Perform side-effects synchronously in callbacks |
