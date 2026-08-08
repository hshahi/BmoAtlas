# Material date components for AG Grid

Reusable, theme-adaptive **date** building blocks for AG Grid Community, backed by
the **Angular Material datepicker** (Luxon adapter). They cover the three AG Grid
extension points plus shared helpers:

| File | Export(s) | Purpose |
|---|---|---|
| `date-support.ts` | helpers + types | format/convert/compare + AG-Grid filter-model (de)serialization |
| `date-cell-editor.ts` | `DateCellEditor` | inline **cell editor** (Material datepicker) |
| `date-filter.ts` | `DateFilter` | column **filter** (menu popup), fully config-driven |
| `date-floating-filter.ts` | `DateFloatingFilter` | compact **floating filter** row control |

All are exported from `@shared`.

## Design principles

- **Canonical value = JS `Date`.** The grid's cell value / `valueGetter` returns a
  `Date`. Components convert `Date ↔ Luxon DateTime` only at the Material boundary
  (`toDateTime` / `toJsDate`). This keeps the row model adapter-agnostic.
- **Always Material, never AG Grid's native controls.** Every input, calendar,
  dropdown, radio and button is Angular Material.
- **Format is dictatable per column.** A `dateFormat` (Luxon tokens, e.g.
  `dd-MMM-yyyy`) drives **display and typed parsing**. Default is
  `DEFAULT_DATE_FORMAT = 'dd-MMM-yyyy'`.
- **Self-contained.** Each component provides its own `provideLuxonDateAdapter()` +
  a fresh `MAT_DATE_FORMATS`, so a per-column `dateFormat` doesn't leak between
  columns.
- **Theme-adaptive.** The datepicker/overlay inherit the app's `--mat-sys-*` token
  bridge, so they follow all themes automatically.

## Global setup (once)

`app.config.ts` provides the Luxon adapter app-wide with the default format:

```ts
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';
import { buildLuxonFormats } from '@shared';

providers: [
  provideAnimationsAsync(),
  provideLuxonDateAdapter(buildLuxonFormats()), // default dd-MMM-yyyy
];
```

Packages: `@angular/material-luxon-adapter`, `luxon`, `@types/luxon`.

---

## `date-support.ts`

Pure helpers — no Angular dependency beyond the `MatDateFormats` type.

| Symbol | Signature | Notes |
|---|---|---|
| `DEFAULT_DATE_FORMAT` | `'dd-MMM-yyyy'` | shared default |
| `buildLuxonFormats(fmt?)` | `→ MatDateFormats` | drives display **and** parse (parse accepts `[fmt, 'yyyy-MM-dd', 'D', 'DD']`) |
| `applyDateFormat(formats, fmt)` | mutates in place | lets a component switch its per-instance format in `agInit` |
| `toDateTime(value)` | `Date \| DateTime \| string → DateTime \| null` | validity-checked |
| `toJsDate(value)` | `DateTime \| Date → Date \| null` | |
| `formatDate(value, fmt?)` | `→ string` | `''` when invalid — ideal for `valueFormatter` |
| `compareDatesByDay(a, b)` | `→ -1 \| 0 \| 1` | day-granularity; use as `colDef.comparator` |
| `toModelString` / `fromModelString` | `Date ↔ 'yyyy-MM-dd HH:mm:ss'` | AG Grid's canonical date-model string |
| `DateFilterModel` | `{ filterType:'date', type, dateFrom, dateTo }` | single condition |
| `CombinedDateFilterModel` | `{ filterType:'date', operator, conditions[] }` | AND/OR two-condition |
| `AnyDateFilterModel`, `isCombinedModel()` | union + guard | |

The filter models intentionally mirror AG Grid's built-in date-filter shapes, so
they persist and restore through the grid's filter-model API.

---

## `DateCellEditor` — inline cell editor

Material datepicker used for **inline editing**. `getValue()` returns a JS `Date`.

**Column config:**
```ts
{
  field: 'date',
  editable: (p) => !p.node?.rowPinned,
  cellEditor: DateCellEditor,
  cellEditorParams: { dateFormat: 'dd-MMM-yyyy' }, // DateCellEditorParams
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
}
```
**Grid options it relies on:**
```html
[singleClickEdit]="true"                <!-- one click enters edit -->
[stopEditingWhenCellsLoseFocus]="false" <!-- calendar overlay doesn't kill the editor -->
```

**Behavior**
- **One-click open** — on edit start (`afterGuiAttached`) it focuses the input and
  opens the calendar, so a single click both edits and opens (no click-twice).
- **Commit on pick** — selecting a date (or a valid typed value) commits and closes
  via `params.stopEditing()`.
- **Revert on close-without-pick** — closing the calendar with no selection cancels.
- **Invalid-date guard** — `isCancelAfterEnd()` rejects unparseable typed text (AG
  Grid has no built-in date validation).
- **Inline, not popup** — use it inline (do **not** set `cellEditorPopup: true`); a
  popup editor floats over the cell while the cell's formatted value still renders
  underneath (two dates). The calendar still opens in its own body-level overlay.

> Note: AG Grid draws its own border/shadow on the editing cell, which would double
> up with the field's outline. `_material.css` suppresses it for date-editor cells:
> `.ag-cell-inline-editing:has(app-date-cell-editor) { border-color: transparent !important; box-shadow: none !important; }`

---

## `DateFilter` — column filter (menu popup)

One component; behavior is entirely driven by `filterParams` (`DateFilterParams`).
Reads the cell value via the value getter (`params.getValue(node)`), so it works
with `field` or `valueGetter` columns.

### `filterParams`

| Param | Type | Default | Effect |
|---|---|---|---|
| `dateFormat` | `string` | `'dd-MMM-yyyy'` | display + typed parsing for this column's filter |
| `defaultCondition` | `'equals'\|'before'\|'after'\|'inRange'` | `'equals'` | condition selected when opened |
| `comparator` | `(filterDate, cellDate) => number` | day-granularity | override matching (`<0` cell before filter, `0` equal, `>0` after) |
| `buttons` | `('apply'\|'clear'\|'cancel'\|'reset')[]` | `[]` | which action buttons to show (see below) |
| `allowTyping` | `boolean` | `false` | `true` = don't auto-open the calendar on click, so the field can be typed |
| `min` / `max` | `Date` | — | bound the selectable dates in the calendars |
| `maxConditions` | `1 \| 2` | `1` | `2` shows a second condition + AND/OR toggle |
| `defaultJoinOperator` | `'AND' \| 'OR'` | `'AND'` | initial join when `maxConditions: 2` |
| `closeOnSelect` | `boolean` | `false` | live mode: apply + close the popup as soon as a date is picked |

### Live vs. Apply

- **Live** (no `'apply'` in `buttons`): the filter applies on every change.
- **Apply mode** (`buttons` includes `'apply'`): edits are **buffered**; nothing
  filters until **Apply** is pressed.

### Buttons

- **Apply** — commit the pending edits and close the popup.
- **Cancel** — **clear the dates + the active filter** and close the popup (same as
  Clear; provided because "Cancel" reads better next to Apply).
- **Clear** — clear the dates + the active filter and close.
- **Reset** — alias of Clear.

### Two conditions (AND/OR)

With `maxConditions: 2` a Material **`mat-radio-group` (AND / OR)** and a second
condition row appear. `doesFilterPass` evaluates both and combines with the
operator. This is **our** Material implementation — AG Grid's native AND/OR only
works with its own provided filters, not custom ones. The emitted model is
AG-compatible:
```ts
{ filterType:'date', operator:'OR', conditions: [
  { filterType:'date', type:'before', dateFrom:'…' },
  { filterType:'date', type:'after',  dateFrom:'…' },
]}
```

### Popup open/close mechanics (important)

- `afterGuiAttached(params)` captures `params.hidePopup`, which Apply/Cancel/Clear
  call to **close the popup immediately**.
- The Material calendar and select render in a **CDK overlay outside** the AG popup.
  Without help, clicking them would make AG Grid think you clicked "outside" and
  close the filter popup prematurely. Each datepicker/`mat-select` therefore carries
  `panelClass="ag-custom-component-popup"` — a class AG Grid treats as part of the
  grid, so the popup **stays open** until Apply/Cancel.

---

## `DateFloatingFilter` — floating-filter row control

Compact Material date input shown under the header (params: `DateFloatingFilterParams`,
just `{ dateFormat }`).

- `onParentModelChanged` reflects the parent `DateFilter` model (shows the first
  date); picking pushes a single (`equals`) date to the parent via
  `params.parentFilterInstance(inst => inst.onFloatingFilterChanged(date))`.
- **One-click** opens the calendar (`(click)="picker.open()"`).
- **Depends on `DateFilter`** as its parent (AG Grid's floating-filter contract).
- Sized to vertically-center and shrink to the cell (Material fields have a ~180px
  min-width that must be defeated in a narrow grid cell).

To use a column **without** the floating filter, set `floatingFilter: false`; AG
Grid then shows a **filter funnel in the header** that opens the same `DateFilter`.

---

## Worked examples (the summary grid's 5 date columns)

Each column demonstrates a different configuration of the **same** components.

```ts
// ① Date — live; pick applies + closes; Cancel clears + closes.
filter: DateFilter,
filterParams: { dateFormat, buttons: ['cancel'], closeOnSelect: true },
floatingFilter: true, floatingFilterComponent: DateFloatingFilter,
cellEditor: DateCellEditor,            // + inline editing

// ② Settlement — typed entry + Apply/Cancel; popup stays open until a button.
filterParams: { dateFormat, allowTyping: true, buttons: ['cancel', 'apply'] },

// ③ Value Date — In-range default, bounded by min/max, custom comparator, Apply/Cancel.
filterParams: {
  dateFormat, defaultCondition: 'inRange',
  min: new Date(2015,0,1), max: new Date(2030,11,31),
  comparator: (f, c) => compareDatesByDay(c, f),
  buttons: ['cancel', 'apply'],
},

// ④ Reported — two conditions with a Material AND/OR toggle + Apply/Cancel.
filterParams: { dateFormat, maxConditions: 2, defaultJoinOperator: 'OR', buttons: ['cancel', 'apply'] },

// ⑤ Ex-Div — per-column format + no floating filter (header funnel); pick applies + closes.
filterParams: { dateFormat: 'yyyy/MM/dd', closeOnSelect: true },
floatingFilter: false,
```

| Column | Demonstrates |
|---|---|
| **Date** | baseline live filter; pick → apply + close; Cancel → clear + close; inline Material editor |
| **Settlement** | typed entry, buffered Apply/Cancel, popup stays open while editing |
| **Value Date** | `inRange` range, `min`/`max` bounds, custom `comparator`, Apply/Cancel |
| **Reported** | two-condition **AND/OR** (Material), Apply/Cancel |
| **Ex-Div** | per-column format `yyyy/MM/dd`; no floating filter → header funnel |

---

## Gotchas / rationale

- **Unitless `0` corner tokens break Material calc()** — the `--mat-sys-corner-*`
  overrides in `_material.css` use `0px` (not `0`), otherwise the outlined field's
  `max(16px, … + 4px)` padding collapses and text hugs the border.
- **`stopEditingWhenCellsLoseFocus: false`** is required on grids using the cell
  editor, so the calendar overlay doesn't end the edit.
- **`panelClass="ag-custom-component-popup"`** is what keeps the *filter* popup open
  while using the calendar/select.
- **Value type must be `Date`** (or a `valueGetter` returning `Date`); `getRowId`
  should use a stable string key, not the `Date`.
