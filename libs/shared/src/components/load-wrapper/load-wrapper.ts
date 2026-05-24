import { CommonModule } from "@angular/common";
import { Component, input, output, contentChild, computed, effect, TemplateRef, Signal, ChangeDetectionStrategy } from "@angular/core";
import { ResourceStatus } from '@angular/core';
import { HttpData } from "@core";

export interface ContentContext<T> {
	$implicit: T;
	data: T;
	reload: () => void;
	status: ResourceStatus;
}

export interface ErrorContext {
	$implicit: unknown;
	error: unknown;
	retry: () => void;
}

export interface ReloadingContext<T> {
	$implicit: T | undefined;
	data: T | undefined;
	status: ResourceStatus;
}

export interface IdleContext {
	load: () => void;
}

@Component({
	selector: 'load-wrapper',
	imports: [CommonModule],
	templateUrl: './load-wrapper.html',
	styleUrl: './load-wrapper.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadWrapper<T> {
	source = input.required<HttpData<T>>();
	emptyWhen = input<((data: T) => boolean) | undefined>(undefined);
	showReloadingState = input<boolean>(true);

	loaded = output<T>();
	errored = output<unknown>();
	statusChange = output<ResourceStatus>();

	idleTemplate = contentChild<TemplateRef<IdleContext>>('idle');
	loadingTemplate = contentChild<TemplateRef<void>>("loading");
	reloadingTemplate = contentChild<TemplateRef<ReloadingContext<T>>>('reloading');
	errorTemplate = contentChild<TemplateRef<ErrorContext>>('error');
	emptyTemplate = contentChild<TemplateRef<void>>('empty');
	contentTemplate = contentChild<TemplateRef<ContentContext<T>>>('content');

	protected currentStatus: Signal<ResourceStatus> = computed(() => this.source().status());
	protected currentData: Signal<T | undefined> = computed(() => this.source().value());
	protected currentError: Signal<unknown> = computed(() => this.source().error());
	protected hasValue: Signal<boolean> = computed(() => this.source().hasValue());

	protected isIdle = computed(() => this.currentStatus() === 'idle');
	protected isLoading = computed(() => this.currentStatus() === 'loading');
	protected isReloading = computed(() => this.currentStatus() === 'reloading');
	protected isError = computed(() => this.currentStatus() === 'error');
	protected isResolved = computed(() => this.currentStatus() === 'resolved' || this.currentStatus() === 'local');
	protected isEmpty = computed(() => {
		const data = this.currentData();
		const emptyCheck = this.emptyWhen();
		if (!this.isResolved() || data === undefined) {
			return false;
		}
		if (emptyCheck) {
			return emptyCheck(data);
		}
		if (Array.isArray(data)) {
			return data.length === 0;
		}

		return false;
	});

	protected showContent = computed(() => this.isResolved() && !this.isEmpty());

	protected contentContext = computed<ContentContext<T> | null>(() => {
		const data = this.currentData();
		if (data === undefined) {
			return null;
		}

		return {
			$implicit: data,
			data: data,
			reload: () => this.reload(),
			status: this.currentStatus(),
		};
	});

	protected errorContext = computed<ErrorContext>(() => ({
		$implicit: this.currentError(),
		error: this.currentError(),
		retry: () => this.reload(),
	}));

	protected reloadingContext = computed<ReloadingContext<T>>(() => ({
		$implicit: this.currentData(),
		data: this.currentData(),
		status: this.currentStatus(),
	}));

	protected idleContext = computed<IdleContext>(() => ({
		load: () => this.load(),
	}));

	constructor() {
		effect(() => {
			const status = this.currentStatus();
			this.statusChange.emit(status);

			if (status === 'resolved') {
				const data = this.currentData();
				if (data !== undefined) {
					this.loaded.emit(data);
				}
			} else if (status === 'error') {
				this.errored.emit(this.currentError());
			}
		});
	}

	protected reload(): void {
		this.source().reload();
	}

	protected load(): void {
		const src = this.source();
		if ('load' in src && typeof src.load === 'function') {
			(src as HttpData<T>).load();
		} else {
			src.reload();
		}
	}
}
