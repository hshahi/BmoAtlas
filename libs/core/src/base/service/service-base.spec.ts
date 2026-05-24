import { TestBed } from '@angular/core/testing';
import { Component, DestroyRef, inject, Injectable, OnDestroy } from '@angular/core';

import { ServiceBase } from './service-base';
import { MessageHub } from '../../services/message-hub/message-hub';
import { StateHub } from '../../services/state-hub/state-hub';

// ── Concrete singleton service ──────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
class SingletonService extends ServiceBase {
  doPublish<T>(messageId: string, data: T): void {
    this.publish(messageId, data);
  }

  doSubscribe<T>(messageId: string, callback: (msg: T) => void): void {
    this.subscribe(messageId, callback);
  }

  doSetState<T>(key: string, value: T): void {
    this.setState(key, value);
  }

  doGetState<T>(key: string) {
    return this.getState<T>(key);
  }
}

// ── Concrete component-scoped service ───────────────────────────────────────
@Injectable()
class ScopedService extends ServiceBase implements OnDestroy {
  destroyed = false;

  doPublish<T>(messageId: string, data: T): void {
    this.publish(messageId, data);
  }

  doSubscribe<T>(messageId: string, callback: (msg: T) => void): void {
    this.subscribe(messageId, callback);
  }

  doSetState<T>(key: string, value: T): void {
    this.setState(key, value);
  }

  doGetState<T>(key: string) {
    return this.getState<T>(key);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }
}

// ── Host components ─────────────────────────────────────────────────────────
@Component({
  selector: 'test-singleton-host',
  template: '',
})
class SingletonHostComponent {
  service = inject(SingletonService);
}

@Component({
  selector: 'test-scoped-host',
  template: '',
  providers: [ScopedService],
})
class ScopedHostComponent {
  service = inject(ScopedService);
}

// =============================================================================
// Tests
// =============================================================================

describe('ServiceBase', () => {

  // ---------------------------------------------------------------------------
  // Singleton service (providedIn: 'root')
  // ---------------------------------------------------------------------------
  describe('singleton service (providedIn: root)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [SingletonHostComponent],
      });
    });

    it('should be injectable as a singleton', () => {
      const service = TestBed.inject(SingletonService);
      expect(service).toBeTruthy();
      expect(service).toBeInstanceOf(ServiceBase);
    });

    it('should return the same instance when injected multiple times', () => {
      const a = TestBed.inject(SingletonService);
      const b = TestBed.inject(SingletonService);
      expect(a).toBe(b);
    });

    it('should support publish/subscribe via inherited Hub methods', () => {
      const fixture = TestBed.createComponent(SingletonHostComponent);
      fixture.detectChanges();
      const service = fixture.componentInstance.service;

      const received: string[] = [];
      service.doSubscribe<string>('svc-topic', (msg) => received.push(msg));
      service.doPublish('svc-topic', 'hello from service');
      TestBed.tick();

      expect(received).toEqual(['hello from service']);
    });

    it('should support setState/getState via inherited Hub methods', () => {
      const fixture = TestBed.createComponent(SingletonHostComponent);
      fixture.detectChanges();
      const service = fixture.componentInstance.service;

      service.doSetState('svc-key', { value: 42 });
      const state = service.doGetState<{ value: number }>('svc-key');
      expect(state()).toEqual({ value: 42 });
    });
  });

  // ---------------------------------------------------------------------------
  // Component-scoped service (bare @Injectable())
  // ---------------------------------------------------------------------------
  describe('component-scoped service (bare @Injectable())', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [ScopedHostComponent],
      });
    });

    it('should be created when the host component is created', () => {
      const fixture = TestBed.createComponent(ScopedHostComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.service).toBeTruthy();
      expect(fixture.componentInstance.service).toBeInstanceOf(ServiceBase);
    });

    it('should create a new instance for each host component', () => {
      const fixture1 = TestBed.createComponent(ScopedHostComponent);
      const fixture2 = TestBed.createComponent(ScopedHostComponent);
      fixture1.detectChanges();
      fixture2.detectChanges();

      expect(fixture1.componentInstance.service).not.toBe(fixture2.componentInstance.service);
    });

    it('should call ngOnDestroy when the host component is destroyed', () => {
      const fixture = TestBed.createComponent(ScopedHostComponent);
      fixture.detectChanges();
      const service = fixture.componentInstance.service;

      expect(service.destroyed).toBe(false);

      fixture.destroy();

      expect(service.destroyed).toBe(true);
    });

    it('should support publish/subscribe from a component-scoped service', () => {
      const fixture = TestBed.createComponent(ScopedHostComponent);
      fixture.detectChanges();
      const service = fixture.componentInstance.service;

      const received: number[] = [];
      service.doSubscribe<number>('scoped-topic', (msg) => received.push(msg));
      service.doPublish('scoped-topic', 99);
      TestBed.tick();

      expect(received).toEqual([99]);
    });

    it('should clean up subscriptions when the host component is destroyed', () => {
      const fixture = TestBed.createComponent(ScopedHostComponent);
      fixture.detectChanges();
      const service = fixture.componentInstance.service;

      const received: string[] = [];
      service.doSubscribe<string>('cleanup-topic', (msg) => received.push(msg));
      service.doPublish('cleanup-topic', 'before');
      TestBed.tick();

      expect(received).toEqual(['before']);

      // Destroy the component (and its scoped service)
      fixture.destroy();

      // Publishing after destruction should not deliver to the destroyed subscriber
      const messageHub = TestBed.inject(MessageHub);
      messageHub.publish('cleanup-topic', 'after');
      TestBed.tick();

      expect(received).toEqual(['before']);
    });
  });
});
