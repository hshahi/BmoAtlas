import { Component, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule, JsonPipe } from '@angular/common';

import { LoadWrapperClientData, ContentContext, ErrorContext, ReloadingContext, IdleContext } from './load-wrapper-client-data';
import { HttpClientData, HttpClientDataStatus } from '@core';

// ---------------------------------------------------------------------------
// Mock HttpClientData
// ---------------------------------------------------------------------------

interface MockHttpClientData<T> {
	status: WritableSignal<HttpClientDataStatus>;
	value: WritableSignal<T | undefined>;
	error: WritableSignal<unknown>;
	hasValue: WritableSignal<boolean>;
	reload: ReturnType<typeof vi.fn>;
	load: ReturnType<typeof vi.fn>;
}

function createMockHttpClientData<T>(initial?: {
	status?: HttpClientDataStatus;
	value?: T;
	error?: unknown;
	hasValue?: boolean;
}): MockHttpClientData<T> {
	return {
		status: signal<HttpClientDataStatus>(initial?.status ?? 'idle'),
		value: signal<T | undefined>(initial?.value ?? undefined),
		error: signal<unknown>(initial?.error ?? undefined),
		hasValue: signal<boolean>(initial?.hasValue ?? false),
		reload: vi.fn(),
		load: vi.fn(),
	};
}

// ---------------------------------------------------------------------------
// Test host components
// ---------------------------------------------------------------------------

@Component({
	selector: 'test-host-default',
	imports: [LoadWrapperClientData, JsonPipe],
	template: `
		<load-wrapper-client-data [source]="$any(source())">
			<ng-template #content let-data>
				<div class="test-content">{{ data | json }}</div>
			</ng-template>
		</load-wrapper-client-data>
	`,
})
class TestHostDefaultComponent {
	source = signal<any>(null);
}

@Component({
	selector: 'test-host-all-templates',
	imports: [LoadWrapperClientData, CommonModule, JsonPipe],
	template: `
		<load-wrapper-client-data
			[source]="$any(source())"
			[emptyWhen]="emptyWhen()"
			[showReloadingState]="showReloadingState()"
			(loaded)="onLoaded($event)"
			(errored)="onErrored($event)"
			(statusChange)="onStatusChange($event)"
		>
			<ng-template #idle let-load="load">
				<div class="test-idle">
					<button class="test-idle-load" (click)="load()">Load</button>
				</div>
			</ng-template>

			<ng-template #loading>
				<div class="test-loading">Custom Loading...</div>
			</ng-template>

			<ng-template #reloading let-data="data" let-status="status">
				<div class="test-reloading">Reloading... Previous: {{ data | json }}</div>
			</ng-template>

			<ng-template #error let-error="error" let-retry="retry">
				<div class="test-error">
					<span class="test-error-msg">Error: {{ error }}</span>
					<button class="test-error-retry" (click)="retry()">Retry</button>
				</div>
			</ng-template>

			<ng-template #empty>
				<div class="test-empty">Nothing here</div>
			</ng-template>

			<ng-template #content let-data let-reload="reload" let-status="status">
				<div class="test-content">
					<span class="test-content-data">{{ data | json }}</span>
					<span class="test-content-status">{{ status }}</span>
					<button class="test-content-reload" (click)="reload()">Reload</button>
				</div>
			</ng-template>
		</load-wrapper-client-data>
	`,
})
class TestHostAllTemplatesComponent {
	source = signal<any>(null);
	emptyWhen = signal<((data: any) => boolean) | undefined>(undefined);
	showReloadingState = signal<boolean>(true);

	loadedValues: unknown[] = [];
	erroredValues: unknown[] = [];
	statusChanges: HttpClientDataStatus[] = [];

	onLoaded(data: unknown) { this.loadedValues.push(data); }
	onErrored(error: unknown) { this.erroredValues.push(error); }
	onStatusChange(status: HttpClientDataStatus) { this.statusChanges.push(status); }
}

@Component({
	selector: 'test-host-no-content',
	imports: [LoadWrapperClientData],
	template: `
		<load-wrapper-client-data [source]="$any(source())">
		</load-wrapper-client-data>
	`,
})
class TestHostNoContentComponent {
	source = signal<any>(null);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function stabilize(fixture: ComponentFixture<unknown>): Promise<void> {
	TestBed.tick();
	fixture.detectChanges();
	await fixture.whenStable();
	TestBed.tick();
	fixture.detectChanges();
	await fixture.whenStable();
}

function queryEl(fixture: ComponentFixture<unknown>, selector: string): HTMLElement | null {
	return fixture.nativeElement.querySelector(selector);
}

function textOf(fixture: ComponentFixture<unknown>, selector: string): string {
	return queryEl(fixture, selector)?.textContent?.trim() ?? '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoadWrapperClientData', () => {

	// =========================================================================
	// Default templates (no custom slots except #content)
	// =========================================================================
	describe('with default templates', () => {
		let fixture: ComponentFixture<TestHostDefaultComponent>;
		let host: TestHostDefaultComponent;
		let mock: MockHttpClientData<string[]>;

		beforeEach(async () => {
			mock = createMockHttpClientData<string[]>();

			await TestBed.configureTestingModule({
				imports: [TestHostDefaultComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(TestHostDefaultComponent);
			host = fixture.componentInstance;
			host.source.set(mock as unknown as HttpClientData<string[]>);
			await stabilize(fixture);
		});

		it('should create the component', () => {
			const wrapper = queryEl(fixture, 'load-wrapper-client-data');
			expect(wrapper).toBeTruthy();
		});

		// --- Loading state ---
		it('should show default loading spinner when status is loading', async () => {
			mock.status.set('loading');
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__loading')).toBeTruthy();
			expect(queryEl(fixture, '.data-status__spinner')).toBeTruthy();
			expect(textOf(fixture, '.data-status__loading')).toContain('Loading...');
		});

		it('should render SVG-based spinner in default loading state', async () => {
			mock.status.set('loading');
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__spinner svg')).toBeTruthy();
			expect(queryEl(fixture, '.data-status__arc--outer')).toBeTruthy();
			expect(queryEl(fixture, '.data-status__arc--inner')).toBeTruthy();
		});

		it('should not show content when loading', async () => {
			mock.status.set('loading');
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-content')).toBeNull();
		});

		// --- Error state ---
		it('should show default error UI when status is error', async () => {
			mock.status.set('error');
			mock.error.set('Server error');
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__error')).toBeTruthy();
			expect(textOf(fixture, '.data-status__error p')).toContain('Something went wrong');
			expect(queryEl(fixture, '.data-status__retry-btn')).toBeTruthy();
		});

		it('should call reload when default retry button is clicked', async () => {
			mock.status.set('error');
			mock.error.set('fail');
			await stabilize(fixture);

			const retryBtn = queryEl(fixture, '.data-status__retry-btn') as HTMLButtonElement;
			retryBtn.click();
			await stabilize(fixture);

			expect(mock.reload).toHaveBeenCalled();
		});

		// --- Empty state ---
		it('should show default empty UI when resolved with empty array', async () => {
			mock.status.set('resolved');
			mock.value.set([]);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__empty')).toBeTruthy();
			expect(textOf(fixture, '.data-status__empty p')).toContain('No data available');
		});

		// --- Content state ---
		it('should show content template when resolved with data', async () => {
			mock.status.set('resolved');
			mock.value.set(['item1', 'item2']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-content')).toBeTruthy();
			expect(textOf(fixture, '.test-content')).toContain('item1');
			expect(textOf(fixture, '.test-content')).toContain('item2');
		});

		it('should show content template when status is local', async () => {
			mock.status.set('local');
			mock.value.set(['local-data']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-content')).toBeTruthy();
			expect(textOf(fixture, '.test-content')).toContain('local-data');
		});

		// --- Reloading state (default overlay) ---
		it('should show default reloading overlay when reloading with showReloadingState=true', async () => {
			mock.status.set('resolved');
			mock.value.set(['data']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			mock.status.set('reloading');
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__reloading-wrapper')).toBeTruthy();
			expect(queryEl(fixture, '.data-status__reloading-overlay')).toBeTruthy();
			expect(queryEl(fixture, '.data-status__spinner--small')).toBeTruthy();
		});

		it('should render SVG spinner in reloading overlay', async () => {
			mock.status.set('resolved');
			mock.value.set(['data']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			mock.status.set('reloading');
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__spinner--small svg')).toBeTruthy();
		});

		// --- Idle state ---
		it('should render nothing visible in idle state with no idle template', async () => {
			mock.status.set('idle');
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__loading')).toBeNull();
			expect(queryEl(fixture, '.data-status__error')).toBeNull();
			expect(queryEl(fixture, '.data-status__empty')).toBeNull();
			expect(queryEl(fixture, '.test-content')).toBeNull();
		});
	});

	// =========================================================================
	// Custom templates for all states
	// =========================================================================
	describe('with custom templates', () => {
		let fixture: ComponentFixture<TestHostAllTemplatesComponent>;
		let host: TestHostAllTemplatesComponent;
		let mock: MockHttpClientData<string[]>;

		beforeEach(async () => {
			mock = createMockHttpClientData<string[]>();

			await TestBed.configureTestingModule({
				imports: [TestHostAllTemplatesComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(TestHostAllTemplatesComponent);
			host = fixture.componentInstance;
			host.source.set(mock as unknown as HttpClientData<string[]>);
			await stabilize(fixture);
		});

		// --- Idle state with custom template ---
		it('should render custom idle template', async () => {
			mock.status.set('idle');
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-idle')).toBeTruthy();
			expect(queryEl(fixture, '.test-idle-load')).toBeTruthy();
		});

		it('should call load() when idle template load button is clicked', async () => {
			mock.status.set('idle');
			await stabilize(fixture);

			const loadBtn = queryEl(fixture, '.test-idle-load') as HTMLButtonElement;
			loadBtn.click();
			await stabilize(fixture);

			expect(mock.load).toHaveBeenCalled();
		});

		// --- Loading state with custom template ---
		it('should render custom loading template', async () => {
			mock.status.set('loading');
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-loading')).toBeTruthy();
			expect(textOf(fixture, '.test-loading')).toBe('Custom Loading...');
			// Default spinner should NOT be shown
			expect(queryEl(fixture, '.data-status__loading')).toBeNull();
		});

		// --- Error state with custom template ---
		it('should render custom error template with error context', async () => {
			mock.status.set('error');
			mock.error.set('Network timeout');
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-error')).toBeTruthy();
			expect(textOf(fixture, '.test-error-msg')).toContain('Network timeout');
		});

		it('should call reload via error context retry()', async () => {
			mock.status.set('error');
			mock.error.set('fail');
			await stabilize(fixture);

			const retryBtn = queryEl(fixture, '.test-error-retry') as HTMLButtonElement;
			retryBtn.click();
			await stabilize(fixture);

			expect(mock.reload).toHaveBeenCalled();
		});

		// --- Empty state with custom template ---
		it('should render custom empty template', async () => {
			mock.status.set('resolved');
			mock.value.set([]);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-empty')).toBeTruthy();
			expect(textOf(fixture, '.test-empty')).toBe('Nothing here');
		});

		// --- Content state with custom template ---
		it('should render custom content template with context', async () => {
			mock.status.set('resolved');
			mock.value.set(['alpha', 'beta']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-content')).toBeTruthy();
			expect(textOf(fixture, '.test-content-data')).toContain('alpha');
			expect(textOf(fixture, '.test-content-status')).toBe('resolved');
		});

		it('should call reload via content context reload()', async () => {
			mock.status.set('resolved');
			mock.value.set(['data']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			const reloadBtn = queryEl(fixture, '.test-content-reload') as HTMLButtonElement;
			reloadBtn.click();
			await stabilize(fixture);

			expect(mock.reload).toHaveBeenCalled();
		});

		// --- Reloading state with custom template ---
		it('should render custom reloading template when showReloadingState is true', async () => {
			mock.status.set('resolved');
			mock.value.set(['previous-data']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			mock.status.set('reloading');
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-reloading')).toBeTruthy();
			expect(textOf(fixture, '.test-reloading')).toContain('previous-data');
		});
	});

	// =========================================================================
	// showReloadingState = false
	// =========================================================================
	describe('showReloadingState = false', () => {
		let fixture: ComponentFixture<TestHostAllTemplatesComponent>;
		let host: TestHostAllTemplatesComponent;
		let mock: MockHttpClientData<string[]>;

		beforeEach(async () => {
			mock = createMockHttpClientData<string[]>();

			await TestBed.configureTestingModule({
				imports: [TestHostAllTemplatesComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(TestHostAllTemplatesComponent);
			host = fixture.componentInstance;
			host.source.set(mock as unknown as HttpClientData<string[]>);
			host.showReloadingState.set(false);
			await stabilize(fixture);
		});

		it('should show content (not reloading template) during reload when showReloadingState is false', async () => {
			mock.status.set('resolved');
			mock.value.set(['data']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			mock.status.set('reloading');
			await stabilize(fixture);

			// Should NOT show the reloading template
			expect(queryEl(fixture, '.test-reloading')).toBeNull();
			expect(queryEl(fixture, '.data-status__reloading-wrapper')).toBeNull();

			// Should show content via the fallback @if block
			expect(queryEl(fixture, '.test-content')).toBeTruthy();
		});
	});

	// =========================================================================
	// emptyWhen custom predicate
	// =========================================================================
	describe('emptyWhen', () => {
		let fixture: ComponentFixture<TestHostAllTemplatesComponent>;
		let host: TestHostAllTemplatesComponent;
		let mock: MockHttpClientData<{ items: string[] }>;

		beforeEach(async () => {
			mock = createMockHttpClientData<{ items: string[] }>();

			await TestBed.configureTestingModule({
				imports: [TestHostAllTemplatesComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(TestHostAllTemplatesComponent);
			host = fixture.componentInstance;
			host.source.set(mock as unknown as HttpClientData<{ items: string[] }>);
			await stabilize(fixture);
		});

		it('should use custom emptyWhen predicate to determine empty state', async () => {
			host.emptyWhen.set((data: any) => data.items.length === 0);

			mock.status.set('resolved');
			mock.value.set({ items: [] });
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-empty')).toBeTruthy();
		});

		it('should show content when emptyWhen returns false', async () => {
			host.emptyWhen.set((data: any) => data.items.length === 0);

			mock.status.set('resolved');
			mock.value.set({ items: ['something'] });
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.test-content')).toBeTruthy();
			expect(queryEl(fixture, '.test-empty')).toBeNull();
		});

		it('should not treat non-array resolved data as empty without emptyWhen', async () => {
			mock.status.set('resolved');
			mock.value.set({ items: [] } as any);
			mock.hasValue.set(true);
			await stabilize(fixture);

			// Without emptyWhen, objects are not considered empty
			expect(queryEl(fixture, '.test-content')).toBeTruthy();
			expect(queryEl(fixture, '.test-empty')).toBeNull();
		});
	});

	// =========================================================================
	// Default empty detection for arrays
	// =========================================================================
	describe('default empty detection', () => {
		let fixture: ComponentFixture<TestHostDefaultComponent>;
		let host: TestHostDefaultComponent;
		let mock: MockHttpClientData<string[]>;

		beforeEach(async () => {
			mock = createMockHttpClientData<string[]>();

			await TestBed.configureTestingModule({
				imports: [TestHostDefaultComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(TestHostDefaultComponent);
			host = fixture.componentInstance;
			host.source.set(mock as unknown as HttpClientData<string[]>);
			await stabilize(fixture);
		});

		it('should detect empty arrays as empty', async () => {
			mock.status.set('resolved');
			mock.value.set([]);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__empty')).toBeTruthy();
		});

		it('should not detect non-empty arrays as empty', async () => {
			mock.status.set('resolved');
			mock.value.set(['item']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__empty')).toBeNull();
			expect(queryEl(fixture, '.test-content')).toBeTruthy();
		});
	});

	// =========================================================================
	// Output events
	// =========================================================================
	describe('output events', () => {
		let fixture: ComponentFixture<TestHostAllTemplatesComponent>;
		let host: TestHostAllTemplatesComponent;
		let mock: MockHttpClientData<string[]>;

		beforeEach(async () => {
			mock = createMockHttpClientData<string[]>();

			await TestBed.configureTestingModule({
				imports: [TestHostAllTemplatesComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(TestHostAllTemplatesComponent);
			host = fixture.componentInstance;
			host.source.set(mock as unknown as HttpClientData<string[]>);
			await stabilize(fixture);
		});

		it('should emit statusChange on status transitions', async () => {
			host.statusChanges = [];

			mock.status.set('loading');
			await stabilize(fixture);

			mock.status.set('resolved');
			mock.value.set(['data']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(host.statusChanges).toContain('loading');
			expect(host.statusChanges).toContain('resolved');
		});

		it('should emit loaded when status becomes resolved with data', async () => {
			mock.status.set('resolved');
			mock.value.set(['result']);
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(host.loadedValues.length).toBeGreaterThan(0);
			expect(host.loadedValues.some(v => Array.isArray(v) && v.includes('result'))).toBe(true);
		});

		it('should emit errored when status becomes error', async () => {
			const testError = new Error('test error');
			mock.status.set('error');
			mock.error.set(testError);
			await stabilize(fixture);

			expect(host.erroredValues.length).toBeGreaterThan(0);
			expect(host.erroredValues).toContain(testError);
		});

		it('should not emit loaded when resolved with undefined data', async () => {
			host.loadedValues = [];
			mock.status.set('resolved');
			mock.value.set(undefined);
			await stabilize(fixture);

			expect(host.loadedValues.length).toBe(0);
		});
	});

	// =========================================================================
	// State transitions
	// =========================================================================
	describe('state transitions', () => {
		let fixture: ComponentFixture<TestHostDefaultComponent>;
		let host: TestHostDefaultComponent;
		let mock: MockHttpClientData<string[]>;

		beforeEach(async () => {
			mock = createMockHttpClientData<string[]>();

			await TestBed.configureTestingModule({
				imports: [TestHostDefaultComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(TestHostDefaultComponent);
			host = fixture.componentInstance;
			host.source.set(mock as unknown as HttpClientData<string[]>);
			await stabilize(fixture);
		});

		it('should transition from idle → loading → resolved', async () => {
			// Idle
			expect(queryEl(fixture, '.data-status__loading')).toBeNull();
			expect(queryEl(fixture, '.test-content')).toBeNull();

			// Loading
			mock.status.set('loading');
			await stabilize(fixture);
			expect(queryEl(fixture, '.data-status__loading')).toBeTruthy();

			// Resolved
			mock.status.set('resolved');
			mock.value.set(['loaded']);
			mock.hasValue.set(true);
			await stabilize(fixture);
			expect(queryEl(fixture, '.data-status__loading')).toBeNull();
			expect(queryEl(fixture, '.test-content')).toBeTruthy();
		});

		it('should transition from loading → error → loading → resolved', async () => {
			// Loading
			mock.status.set('loading');
			await stabilize(fixture);
			expect(queryEl(fixture, '.data-status__loading')).toBeTruthy();

			// Error
			mock.status.set('error');
			mock.error.set('fail');
			await stabilize(fixture);
			expect(queryEl(fixture, '.data-status__error')).toBeTruthy();
			expect(queryEl(fixture, '.data-status__loading')).toBeNull();

			// Loading again (retry)
			mock.status.set('loading');
			await stabilize(fixture);
			expect(queryEl(fixture, '.data-status__loading')).toBeTruthy();
			expect(queryEl(fixture, '.data-status__error')).toBeNull();

			// Resolved
			mock.status.set('resolved');
			mock.value.set(['success']);
			mock.hasValue.set(true);
			await stabilize(fixture);
			expect(queryEl(fixture, '.test-content')).toBeTruthy();
		});

		it('should transition from resolved → reloading → resolved', async () => {
			// Resolved
			mock.status.set('resolved');
			mock.value.set(['first']);
			mock.hasValue.set(true);
			await stabilize(fixture);
			expect(queryEl(fixture, '.test-content')).toBeTruthy();

			// Reloading
			mock.status.set('reloading');
			await stabilize(fixture);
			expect(queryEl(fixture, '.data-status__reloading-wrapper')).toBeTruthy();

			// Resolved again
			mock.status.set('resolved');
			mock.value.set(['second']);
			await stabilize(fixture);
			expect(queryEl(fixture, '.test-content')).toBeTruthy();
			expect(textOf(fixture, '.test-content')).toContain('second');
		});
	});

	// =========================================================================
	// No content template provided
	// =========================================================================
	describe('without content template', () => {
		let fixture: ComponentFixture<TestHostNoContentComponent>;
		let host: TestHostNoContentComponent;
		let mock: MockHttpClientData<string>;

		beforeEach(async () => {
			mock = createMockHttpClientData<string>();

			await TestBed.configureTestingModule({
				imports: [TestHostNoContentComponent],
			}).compileComponents();

			fixture = TestBed.createComponent(TestHostNoContentComponent);
			host = fixture.componentInstance;
			host.source.set(mock as unknown as HttpClientData<string>);
			await stabilize(fixture);
		});

		it('should still show default loading state', async () => {
			mock.status.set('loading');
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__loading')).toBeTruthy();
		});

		it('should still show default error state', async () => {
			mock.status.set('error');
			mock.error.set('err');
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__error')).toBeTruthy();
		});

		it('should render nothing for resolved state without content template', async () => {
			mock.status.set('resolved');
			mock.value.set('data');
			mock.hasValue.set(true);
			await stabilize(fixture);

			expect(queryEl(fixture, '.data-status__loading')).toBeNull();
			expect(queryEl(fixture, '.data-status__error')).toBeNull();
		});
	});
});
