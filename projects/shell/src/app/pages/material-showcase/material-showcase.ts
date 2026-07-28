import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule, MatCheckboxChange } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule, TooltipPosition } from '@angular/material/tooltip';

import { ThemeService, THEMES, THEME_LABELS, Theme } from '@shared';

import { CounterField } from './counter-field';
import {
  ShowcaseDialog,
  ShowcaseDialogData,
  ShowcaseDialogResult,
} from './showcase-dialog';

interface Option {
  value: string;
  label: string;
}

@Component({
  selector: 'app-material-showcase',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatTabsModule,
    MatDialogModule,
    MatExpansionModule,
    MatAutocompleteModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    CounterField,
  ],
  // Native date adapter scoped to this page (keeps the datepicker self-contained).
  providers: [provideNativeDateAdapter()],
  templateUrl: './material-showcase.html',
  styleUrl: './material-showcase.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialShowcase {
  private readonly dialog = inject(MatDialog);
  private readonly themeService = inject(ThemeService);

  // ── Theme switcher ──────────────────────────────────────────────
  protected readonly themes = THEMES;
  protected readonly themeLabels = THEME_LABELS;
  protected readonly activeTheme = this.themeService.resolved;

  protected selectTheme(theme: Theme): void {
    this.themeService.setPreference(theme);
  }

  // ── Button ──────────────────────────────────────────────────────
  protected readonly clicks = signal(0);
  protected readonly disableButtons = signal(false);
  protected readonly buttonLabel = computed(() =>
    this.clicks() === 0 ? 'Not clicked yet' : `Clicked ${this.clicks()} time(s)`,
  );
  protected readonly lastRef = signal('');

  // ── Text box ────────────────────────────────────────────────────
  protected readonly textValue = signal('two-way');
  protected readonly propValue = signal('property + event');
  protected readonly nameControl = new FormControl('reactive', { nonNullable: true });

  // ── Dropdown ────────────────────────────────────────────────────
  protected readonly options: readonly Option[] = [
    { value: 'aapl', label: 'Apple' },
    { value: 'msft', label: 'Microsoft' },
    { value: 'googl', label: 'Alphabet' },
    { value: 'amzn', label: 'Amazon' },
  ];
  protected readonly selectValue = signal('msft');
  protected readonly multiValue = signal<string[]>(['aapl', 'googl']);

  // ── Checkbox ────────────────────────────────────────────────────
  protected readonly checkA = signal(true);
  protected readonly checkB = signal(false);
  protected readonly indeterminate = signal(true);

  // ── Datepicker ──────────────────────────────────────────────────
  protected readonly dateValue = signal<Date | null>(new Date());
  protected readonly dateControl = new FormControl<Date | null>(null);
  protected readonly minDate = new Date(2020, 0, 1);
  protected readonly maxDate = new Date(2030, 11, 31);

  // ── Timepicker ──────────────────────────────────────────────────
  protected readonly timeValue = signal<Date | null>(new Date());

  // ── Radio ───────────────────────────────────────────────────────
  protected readonly radioValue = signal('market');

  // ── Tabs ────────────────────────────────────────────────────────
  protected readonly selectedTab = signal(0);
  protected readonly dynamicTabs = signal(['Summary', 'Positions', 'Orders']);

  // ── Dialog ──────────────────────────────────────────────────────
  protected readonly dialogResult = signal<string>('—');

  // ── Extension (custom control) ──────────────────────────────────
  protected readonly counterValue = signal(10);
  protected readonly counterControl = new FormControl(5, { nonNullable: true });

  // ── Accordion / expansion panel ─────────────────────────────────
  protected readonly accordionMulti = signal(false);
  protected readonly openedPanel = signal('—');
  protected readonly panelExpanded = signal(true);

  // ── Autocomplete ────────────────────────────────────────────────
  protected readonly autoQuery = signal('');
  protected readonly autoSelected = signal('—');
  protected readonly filteredOptions = computed(() => {
    const q = this.autoQuery().toLowerCase();
    return this.options.filter(o => o.label.toLowerCase().includes(q));
  });

  // ── Button toggle ───────────────────────────────────────────────
  protected readonly alignValue = signal('left');
  protected readonly formatValues = signal<string[]>(['bold']);

  // ── Chips ───────────────────────────────────────────────────────
  protected readonly chips = signal<string[]>(['AAPL', 'MSFT', 'GOOGL']);

  // ── Slide toggle ────────────────────────────────────────────────
  protected readonly slideA = signal(true);
  protected readonly slideB = signal(false);

  // ── Tooltip ─────────────────────────────────────────────────────
  protected readonly tooltipPositions: readonly TooltipPosition[] =
    ['above', 'below', 'left', 'right', 'before', 'after'];
  protected readonly tooltipPosition = signal<TooltipPosition>('above');

  // ── Handlers ────────────────────────────────────────────────────
  protected onCheckboxChange(e: MatCheckboxChange): void {
    this.checkB.set(e.checked);
  }

  protected onTabChange(e: MatTabChangeEvent): void {
    this.selectedTab.set(e.index);
  }

  protected recordRef(text: string | null): void {
    this.lastRef.set(text?.trim() ?? '');
  }

  protected addChip(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.chips.update(list => [...list, value]);
    }
    event.chipInput?.clear();
  }

  protected removeChip(chip: string): void {
    this.chips.update(list => list.filter(c => c !== chip));
  }

  protected openDialog(): void {
    const ref = this.dialog.open<ShowcaseDialog, ShowcaseDialogData, ShowcaseDialogResult>(
      ShowcaseDialog,
      {
        width: '420px',
        data: { title: 'Edit note', initialNote: 'Hello from the opener' },
      },
    );

    ref.afterClosed().subscribe(result => {
      this.dialogResult.set(result ? result.note : 'Cancelled');
    });
  }
}
