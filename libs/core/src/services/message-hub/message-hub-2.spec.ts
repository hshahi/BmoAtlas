import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageHub } from './message-hub';

// =============================================================================
// Test components
// =============================================================================

/** Payload type shared between sender and receivers */
interface Notification {
  title: string;
  body: string;
}

/**
 * A publisher component that sends messages via the StateHub.
 */
@Component({
  selector: 'app-sender',
  template: `<button (click)="send()">Send</button>`,
})
class SenderComponent {
  private messageHub = inject(MessageHub);

  lastSentNotification: Notification | null = null;

  send(notification?: Notification): void {
    const msg = notification ?? { title: 'Hello', body: 'World' };
    this.lastSentNotification = msg;
    this.messageHub.publish<Notification>('notifications', msg);
  }

  sendOnChannel(channel: string, data: unknown): void {
    this.messageHub.publish(channel, data);
  }
}

/**
 * First receiver component — subscribes on init, collects messages.
 */
@Component({
  selector: 'app-receiver-1',
  template: `<p>Receiver 1</p>`,
})
class ReceiverComponent1 implements OnInit {
  private messageHub = inject(MessageHub);
  private destroyRef = inject(DestroyRef);

  messages: Notification[] = [];

  ngOnInit(): void {
    this.messageHub.subscribe<Notification>(
      'notifications',
      (msg) => this.messages.push(msg),
      this.destroyRef,
    );
  }
}

/**
 * Second receiver component — subscribes on init, collects messages.
 */
@Component({
  selector: 'app-receiver-2',
  template: `<p>Receiver 2</p>`,
})
class ReceiverComponent2 implements OnInit {
  private messageHub = inject(MessageHub);
  private destroyRef = inject(DestroyRef);

  messages: Notification[] = [];

  ngOnInit(): void {
    this.messageHub.subscribe<Notification>(
      'notifications',
      (msg) => this.messages.push(msg),
      this.destroyRef,
    );
  }
}

/**
 * A receiver that subscribes to a different channel ('alerts').
 */
@Component({
  selector: 'app-alert-receiver',
  template: `<p>Alert Receiver</p>`,
})
class AlertReceiverComponent implements OnInit {
  private messageHub = inject(MessageHub);
  private destroyRef = inject(DestroyRef);

  alerts: string[] = [];

  ngOnInit(): void {
    this.messageHub.subscribe<string>(
      'alerts',
      (msg) => this.alerts.push(msg),
      this.destroyRef,
    );
  }
}

/**
 * A receiver that subscribes to multiple channels.
 */
@Component({
  selector: 'app-multi-channel-receiver',
  template: `<p>Multi-Channel Receiver</p>`,
})
class MultiChannelReceiverComponent implements OnInit {
  private messageHub = inject(MessageHub);
  private destroyRef = inject(DestroyRef);

  notifications: Notification[] = [];
  alerts: string[] = [];

  ngOnInit(): void {
    this.messageHub.subscribe<Notification>(
      'notifications',
      (msg) => this.notifications.push(msg),
      this.destroyRef,
    );
    this.messageHub.subscribe<string>(
      'alerts',
      (msg) => this.alerts.push(msg),
      this.destroyRef,
    );
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('StateHub — Component Integration', () => {
  let messageHub: MessageHub;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    messageHub = TestBed.inject(MessageHub);
  });

  // ---------------------------------------------------------------------------
  // Helper to create and initialise a component
  // ---------------------------------------------------------------------------
  function createComponent<T>(component: new (...args: any[]) => T): ComponentFixture<T> {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges(); // triggers ngOnInit
    return fixture;
  }

  // ---------------------------------------------------------------------------
  // Basic sender → receiver
  // ---------------------------------------------------------------------------
  describe('single sender, single receiver', () => {
    it('should deliver a message from SenderComponent to ReceiverComponent1', () => {
      const receiverFixture = createComponent(ReceiverComponent1);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.send({ title: 'Test', body: 'Message' });
      TestBed.tick();

      expect(receiverFixture.componentInstance.messages).toEqual([
        { title: 'Test', body: 'Message' },
      ]);
    });

    it('should deliver multiple messages in order', () => {
      const receiverFixture = createComponent(ReceiverComponent1);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.send({ title: 'First', body: '1' });
      TestBed.tick();

      senderFixture.componentInstance.send({ title: 'Second', body: '2' });
      TestBed.tick();

      senderFixture.componentInstance.send({ title: 'Third', body: '3' });
      TestBed.tick();

      expect(receiverFixture.componentInstance.messages).toEqual([
        { title: 'First', body: '1' },
        { title: 'Second', body: '2' },
        { title: 'Third', body: '3' },
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Single sender → multiple receivers
  // ---------------------------------------------------------------------------
  describe('single sender, multiple receivers', () => {
    it('should deliver the same message to ReceiverComponent1 and ReceiverComponent2', () => {
      const receiver1Fixture = createComponent(ReceiverComponent1);
      const receiver2Fixture = createComponent(ReceiverComponent2);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.send({ title: 'Broadcast', body: 'To all' });
      TestBed.tick();

      expect(receiver1Fixture.componentInstance.messages).toEqual([
        { title: 'Broadcast', body: 'To all' },
      ]);
      expect(receiver2Fixture.componentInstance.messages).toEqual([
        { title: 'Broadcast', body: 'To all' },
      ]);
    });

    it('should deliver multiple messages to all receivers', () => {
      const receiver1Fixture = createComponent(ReceiverComponent1);
      const receiver2Fixture = createComponent(ReceiverComponent2);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.send({ title: 'Msg', body: 'A' });
      TestBed.tick();

      senderFixture.componentInstance.send({ title: 'Msg', body: 'B' });
      TestBed.tick();

      expect(receiver1Fixture.componentInstance.messages).toHaveLength(2);
      expect(receiver2Fixture.componentInstance.messages).toHaveLength(2);
      expect(receiver1Fixture.componentInstance.messages).toEqual(
        receiver2Fixture.componentInstance.messages,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Receiver destroyed (component lifecycle)
  // ---------------------------------------------------------------------------
  describe('receiver component destroyed', () => {
    it('should stop delivering messages after a receiver component is destroyed', () => {
      const receiver1Fixture = createComponent(ReceiverComponent1);
      const receiver2Fixture = createComponent(ReceiverComponent2);
      const senderFixture = createComponent(SenderComponent);

      // Both receive the first message
      senderFixture.componentInstance.send({ title: 'Before', body: 'destroy' });
      TestBed.tick();

      expect(receiver1Fixture.componentInstance.messages).toHaveLength(1);
      expect(receiver2Fixture.componentInstance.messages).toHaveLength(1);

      // Destroy receiver 1
      receiver1Fixture.destroy();

      // Only receiver 2 should get the second message
      senderFixture.componentInstance.send({ title: 'After', body: 'destroy' });
      TestBed.tick();

      expect(receiver1Fixture.componentInstance.messages).toHaveLength(1);
      expect(receiver2Fixture.componentInstance.messages).toHaveLength(2);
      expect(receiver2Fixture.componentInstance.messages[1]).toEqual({
        title: 'After',
        body: 'destroy',
      });
    });

    it('should clean up the channel when all receiver components are destroyed', () => {
      const receiver1Fixture = createComponent(ReceiverComponent1);
      const receiver2Fixture = createComponent(ReceiverComponent2);

      const channels = (messageHub as any)['channels'] as Map<string, unknown>;
      expect(channels.has('notifications')).toBe(true);

      receiver1Fixture.destroy();
      expect(channels.has('notifications')).toBe(true); // still one subscriber

      receiver2Fixture.destroy();
      expect(channels.has('notifications')).toBe(false); // all gone
    });

    it('should handle publishing after all receivers are destroyed', () => {
      const receiverFixture = createComponent(ReceiverComponent1);
      const senderFixture = createComponent(SenderComponent);

      receiverFixture.destroy();

      // Should not throw — publish is a no-op when no subscribers exist
      expect(() => {
        senderFixture.componentInstance.send({ title: 'Ghost', body: 'message' });
        TestBed.tick();
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Late subscriber (component created after messages were sent)
  // ---------------------------------------------------------------------------
  describe('late subscriber', () => {
    it('should not receive messages published before the receiver was created', () => {
      const senderFixture = createComponent(SenderComponent);

      // Publish before any receiver exists
      senderFixture.componentInstance.send({ title: 'Early', body: 'bird' });
      TestBed.tick();

      // Now create the receiver
      const receiverFixture = createComponent(ReceiverComponent1);
      TestBed.tick();

      // The late receiver should NOT have the early message
      expect(receiverFixture.componentInstance.messages).toEqual([]);

      // But should receive future messages
      senderFixture.componentInstance.send({ title: 'Late', body: 'delivery' });
      TestBed.tick();

      expect(receiverFixture.componentInstance.messages).toEqual([
        { title: 'Late', body: 'delivery' },
      ]);
    });

    it('should only deliver new messages to a late-joining receiver while early receiver gets all', () => {
      const earlyReceiverFixture = createComponent(ReceiverComponent1);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.send({ title: 'First', body: '1' });
      TestBed.tick();

      // Late receiver joins
      const lateReceiverFixture = createComponent(ReceiverComponent2);

      senderFixture.componentInstance.send({ title: 'Second', body: '2' });
      TestBed.tick();

      expect(earlyReceiverFixture.componentInstance.messages).toEqual([
        { title: 'First', body: '1' },
        { title: 'Second', body: '2' },
      ]);
      expect(lateReceiverFixture.componentInstance.messages).toEqual([
        { title: 'Second', body: '2' },
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Channel isolation
  // ---------------------------------------------------------------------------
  describe('channel isolation', () => {
    it('should not deliver notification messages to an alert receiver', () => {
      const alertReceiverFixture = createComponent(AlertReceiverComponent);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.send({ title: 'Notification', body: 'only' });
      TestBed.tick();

      expect(alertReceiverFixture.componentInstance.alerts).toEqual([]);
    });

    it('should not deliver alert messages to a notification receiver', () => {
      const notificationReceiverFixture = createComponent(ReceiverComponent1);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.sendOnChannel('alerts', 'Alert!');
      TestBed.tick();

      expect(notificationReceiverFixture.componentInstance.messages).toEqual([]);
    });

    it('should deliver messages to the correct channel receivers independently', () => {
      const notificationReceiverFixture = createComponent(ReceiverComponent1);
      const alertReceiverFixture = createComponent(AlertReceiverComponent);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.send({ title: 'Notif', body: 'data' });
      senderFixture.componentInstance.sendOnChannel('alerts', 'Alert!');
      TestBed.tick();

      expect(notificationReceiverFixture.componentInstance.messages).toEqual([
        { title: 'Notif', body: 'data' },
      ]);
      expect(alertReceiverFixture.componentInstance.alerts).toEqual(['Alert!']);
    });
  });

  // ---------------------------------------------------------------------------
  // Multi-channel receiver
  // ---------------------------------------------------------------------------
  describe('multi-channel receiver', () => {
    it('should receive messages from multiple channels in a single component', () => {
      const multiReceiverFixture = createComponent(MultiChannelReceiverComponent);
      const senderFixture = createComponent(SenderComponent);

      senderFixture.componentInstance.send({ title: 'Notif', body: '1' });
      senderFixture.componentInstance.sendOnChannel('alerts', 'Alert 1');
      TestBed.tick();

      expect(multiReceiverFixture.componentInstance.notifications).toEqual([
        { title: 'Notif', body: '1' },
      ]);
      expect(multiReceiverFixture.componentInstance.alerts).toEqual(['Alert 1']);
    });

    it('should clean up all subscriptions when the multi-channel component is destroyed', () => {
      const multiReceiverFixture = createComponent(MultiChannelReceiverComponent);
      const channels = (messageHub as any)['channels'] as Map<string, unknown>;

      expect(channels.has('notifications')).toBe(true);
      expect(channels.has('alerts')).toBe(true);

      multiReceiverFixture.destroy();

      expect(channels.has('notifications')).toBe(false);
      expect(channels.has('alerts')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple senders
  // ---------------------------------------------------------------------------
  describe('multiple senders', () => {
    it('should deliver messages from multiple sender instances to the same receiver', () => {
      const receiverFixture = createComponent(ReceiverComponent1);
      const sender1Fixture = createComponent(SenderComponent);
      const sender2Fixture = createComponent(SenderComponent);

      sender1Fixture.componentInstance.send({ title: 'From Sender 1', body: 'A' });
      TestBed.tick();

      sender2Fixture.componentInstance.send({ title: 'From Sender 2', body: 'B' });
      TestBed.tick();

      expect(receiverFixture.componentInstance.messages).toEqual([
        { title: 'From Sender 1', body: 'A' },
        { title: 'From Sender 2', body: 'B' },
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Component recreation
  // ---------------------------------------------------------------------------
  describe('component recreation', () => {
    it('should allow a new receiver to subscribe after the previous one was destroyed', () => {
      const senderFixture = createComponent(SenderComponent);

      // First receiver
      const receiver1Fixture = createComponent(ReceiverComponent1);

      senderFixture.componentInstance.send({ title: 'To first', body: '1' });
      TestBed.tick();

      expect(receiver1Fixture.componentInstance.messages).toHaveLength(1);

      // Destroy first receiver
      receiver1Fixture.destroy();

      // Create a new receiver (simulating route navigation or dynamic component)
      const receiver2Fixture = createComponent(ReceiverComponent1);

      senderFixture.componentInstance.send({ title: 'To second', body: '2' });
      TestBed.tick();

      // New receiver should only have the new message
      expect(receiver2Fixture.componentInstance.messages).toEqual([
        { title: 'To second', body: '2' },
      ]);
    });
  });
});
