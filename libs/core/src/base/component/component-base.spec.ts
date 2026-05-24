import { TestBed } from '@angular/core/testing';
import { Component, inject, OnInit } from '@angular/core';

import { ComponentBase } from './component-base';
import { MessageHub } from '../../services/message-hub/message-hub';
import { StateHub } from '../../services/state-hub/state-hub';

// ── Concrete test components extending ComponentBase ────────────────────────

@Component({
  selector: 'test-sender',
  template: '',
})
class SenderComponent extends ComponentBase {
  sendMessage(channel: string, data: unknown): void {
    this.publish(channel, data);
  }

  setSharedState<T>(key: string, value: T): void {
    this.setState(key, value);
  }
}

@Component({
  selector: 'test-receiver',
  template: '',
})
class ReceiverComponent extends ComponentBase implements OnInit {
  messages: string[] = [];

  ngOnInit(): void {
    this.subscribe<string>('test-channel', (msg) => this.messages.push(msg));
  }

  readState<T>(key: string) {
    return this.getState<T>(key);
  }

  selectState<T, R>(key: string, selector: (state: T) => R) {
    return this.select<T, R>(key, selector);
  }

  doPatchState<T extends object>(key: string, partial: Partial<T>): void {
    this.patchState<T>(key, partial);
  }

  doUpdateState<T>(key: string, updater: (current: T) => T): void {
    this.updateState<T>(key, updater);
  }

  doRemoveState(key: string): void {
    this.removeState(key);
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('ComponentBase', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SenderComponent, ReceiverComponent],
    });
  });

  // ---------------------------------------------------------------------------
  // Basic instantiation
  // ---------------------------------------------------------------------------
  describe('instantiation', () => {
    it('should create a component extending ComponentBase', () => {
      const fixture = TestBed.createComponent(SenderComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
      expect(fixture.componentInstance).toBeInstanceOf(ComponentBase);
    });
  });

  // ---------------------------------------------------------------------------
  // Event communication between components
  // ---------------------------------------------------------------------------
  describe('event communication', () => {
    it('should deliver messages from sender to receiver via publish/subscribe', () => {
      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges(); // triggers ngOnInit → subscribe

      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      senderFixture.componentInstance.sendMessage('test-channel', 'hello');
      TestBed.tick();

      expect(receiverFixture.componentInstance.messages).toEqual(['hello']);
    });

    it('should deliver multiple messages in order', () => {
      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges();

      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      senderFixture.componentInstance.sendMessage('test-channel', 'first');
      TestBed.tick();

      senderFixture.componentInstance.sendMessage('test-channel', 'second');
      TestBed.tick();

      expect(receiverFixture.componentInstance.messages).toEqual(['first', 'second']);
    });

    it('should stop delivering messages after receiver component is destroyed', () => {
      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges();

      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      senderFixture.componentInstance.sendMessage('test-channel', 'before');
      TestBed.tick();

      expect(receiverFixture.componentInstance.messages).toEqual(['before']);

      // Destroy receiver — subscription should be cleaned up via destroyRef
      receiverFixture.destroy();

      senderFixture.componentInstance.sendMessage('test-channel', 'after');
      TestBed.tick();

      // Should still only have the message from before destruction
      expect(receiverFixture.componentInstance.messages).toEqual(['before']);
    });

    it('should not deliver messages across different channels', () => {
      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges(); // subscribes to 'test-channel'

      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      senderFixture.componentInstance.sendMessage('other-channel', 'wrong');
      TestBed.tick();

      expect(receiverFixture.componentInstance.messages).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // State management from components
  // ---------------------------------------------------------------------------
  describe('state management', () => {
    it('should set and get state from a component', () => {
      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges();

      senderFixture.componentInstance.setSharedState('user', { name: 'Alice' });

      const user = receiverFixture.componentInstance.readState<{ name: string }>('user');
      expect(user()).toEqual({ name: 'Alice' });
    });

    it('should select a slice of state from a component', () => {
      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges();

      senderFixture.componentInstance.setSharedState('user', { name: 'Alice', age: 30 });

      const name = receiverFixture.componentInstance.selectState<{ name: string; age: number }, string>(
        'user',
        u => u.name,
      );
      expect(name()).toBe('Alice');
    });

    it('should patch state from a component', () => {
      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges();

      senderFixture.componentInstance.setSharedState('config', { theme: 'dark', lang: 'en' });
      receiverFixture.componentInstance.doPatchState<{ theme: string; lang: string }>('config', { lang: 'fr' });

      const stateHub = TestBed.inject(StateHub);
      expect(stateHub.snapshotState('config')).toEqual({ theme: 'dark', lang: 'fr' });
    });

    it('should update state from a component', () => {
      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges();

      senderFixture.componentInstance.setSharedState('count', 5);
      receiverFixture.componentInstance.doUpdateState<number>('count', c => c + 10);

      const stateHub = TestBed.inject(StateHub);
      expect(stateHub.snapshotState<number>('count')).toBe(15);
    });

    it('should remove state from a component', () => {
      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      const receiverFixture = TestBed.createComponent(ReceiverComponent);
      receiverFixture.detectChanges();

      senderFixture.componentInstance.setSharedState('temp', 'value');
      receiverFixture.componentInstance.doRemoveState('temp');

      const stateHub = TestBed.inject(StateHub);
      expect(stateHub.hasState('temp')).toBe(false);
    });

    it('should persist state after the component that set it is destroyed', () => {
      const senderFixture = TestBed.createComponent(SenderComponent);
      senderFixture.detectChanges();

      senderFixture.componentInstance.setSharedState('persistent', 'survives');

      // Destroy the sender
      senderFixture.destroy();

      // State should still be available via StateHub
      const stateHub = TestBed.inject(StateHub);
      expect(stateHub.snapshotState<string>('persistent')).toBe('survives');
    });
  });
});
