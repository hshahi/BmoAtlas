# Date filter — usage scenarios

One component (`DateFilter`); the **`filterParams`** object selects the behavior.
Copy a column below and adjust.

```ts
import { DateFilter, DateFloatingFilter, DateCellEditor, formatDate, compareDatesByDay } from '@shared';
```

Three ways to use it:

1. **Editing** — the cell is inline-editable with the Material datepicker (plus a filter).
2. **Floating filter** — a compact date input under the header (`floatingFilter: true`).
3. **Funnel only** — no floating row; the filter opens from the header funnel (`floatingFilter: false`).

---

## Index

- [1. Editing (inline Material datepicker)](#1-editing-inline-material-datepicker)
  - [1.1 Live editing](#11-live-editing)
  - [1.2 Buffered editing with Apply and Cancel](#12-buffered-editing-with-apply-and-cancel)
  - [1.3 Editing with a custom format](#13-editing-with-a-custom-format)
  - [1.4 Editing with range, bounds and comparator](#14-editing-with-range-bounds-and-comparator)
- [2. Floating filter](#2-floating-filter)
  - [2.1 Live single date](#21-live-single-date)
  - [2.2 Buffered with Apply and Cancel](#22-buffered-with-apply-and-cancel)
  - [2.3 Typed entry](#23-typed-entry)
  - [2.4 Before, after, equals conditions](#24-before-after-equals-conditions)
  - [2.5 Range with bounds](#25-range-with-bounds)
  - [2.6 Two conditions with AND or OR](#26-two-conditions-with-and-or-or)
  - [2.7 Custom format](#27-custom-format)
  - [2.8 Button combinations](#28-button-combinations)
  - [2.9 Derived date via valueGetter](#29-derived-date-via-valuegetter)
- [3. Funnel only (no floating row)](#3-funnel-only-no-floating-row)
  - [3.1 Live single date](#31-live-single-date)
  - [3.2 Buffered with Apply and Cancel](#32-buffered-with-apply-and-cancel)
  - [3.3 Before, after, equals conditions](#33-before-after-equals-conditions)
  - [3.4 Range with bounds and comparator](#34-range-with-bounds-and-comparator)
  - [3.5 Two conditions with AND or OR](#35-two-conditions-with-and-or-or)
  - [3.6 Custom format](#36-custom-format)

---

## 1. Editing (inline Material datepicker)

The cell is editable via `DateCellEditor` and also filterable. Requires these grid options:

```html
[singleClickEdit]="true"
[stopEditingWhenCellsLoseFocus]="false"
```

### 1.1 Live editing
Edit inline; filter applies on pick, Cancel clears.
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  editable: (p) => !p.node?.rowPinned,
  cellEditor: DateCellEditor,
  cellEditorParams: { dateFormat: 'dd-MMM-yyyy' },
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', closeOnSelect: true, buttons: ['cancel'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

### 1.2 Buffered editing with Apply and Cancel
Edit inline; filter waits for Apply.
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  editable: (p) => !p.node?.rowPinned,
  cellEditor: DateCellEditor,
  cellEditorParams: { dateFormat: 'dd-MMM-yyyy' },
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', buttons: ['cancel', 'apply'] },
  floatingFilter: false,
}
```

### 1.3 Editing with a custom format
Display, parse and edit in `dd/MM/yyyy`.
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value, 'dd/MM/yyyy'),
  comparator: compareDatesByDay,
  editable: (p) => !p.node?.rowPinned,
  cellEditor: DateCellEditor,
  cellEditorParams: { dateFormat: 'dd/MM/yyyy' },
  filter: DateFilter,
  filterParams: { dateFormat: 'dd/MM/yyyy', closeOnSelect: true },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd/MM/yyyy' },
}
```

### 1.4 Editing with range, bounds and comparator
Inline edit + a bounded From/To range filter with a custom comparator.
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  editable: (p) => !p.node?.rowPinned,
  cellEditor: DateCellEditor,
  cellEditorParams: { dateFormat: 'dd-MMM-yyyy' },
  filter: DateFilter,
  filterParams: {
    dateFormat: 'dd-MMM-yyyy',
    defaultCondition: 'inRange',
    min: new Date(2015, 0, 1),
    max: new Date(2030, 11, 31),
    comparator: (filterDate, cellDate) => compareDatesByDay(cellDate, filterDate),
    buttons: ['cancel', 'apply'],
  },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

---

## 2. Floating filter

A compact date input under the header. All columns here set
`floatingFilter: true` + `DateFloatingFilter`.

### 2.1 Live single date
Applies on pick; Cancel clears.
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', closeOnSelect: true, buttons: ['cancel'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

### 2.2 Buffered with Apply and Cancel
Nothing filters until Apply; both buttons close the popup.
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', buttons: ['cancel', 'apply'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

### 2.3 Typed entry
Type the date instead of only picking it.

Live (no buttons):
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', allowTyping: true },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```
Typed + buffered:
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', allowTyping: true, buttons: ['cancel', 'apply'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

### 2.4 Before, after, equals conditions
Set `defaultCondition` to the one you want.

Equals:
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', defaultCondition: 'equals', closeOnSelect: true },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```
Before:
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', defaultCondition: 'before', closeOnSelect: true },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```
After:
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', defaultCondition: 'after', closeOnSelect: true },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

### 2.5 Range with bounds
From/To range restricted to a min/max window.
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: {
    dateFormat: 'dd-MMM-yyyy',
    defaultCondition: 'inRange',
    min: new Date(2015, 0, 1),
    max: new Date(2030, 11, 31),
    buttons: ['cancel', 'apply'],
  },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

### 2.6 Two conditions with AND or OR
Second condition row + a Material AND/OR toggle.

AND (default):
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', maxConditions: 2, buttons: ['cancel', 'apply'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```
OR (default join):
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', maxConditions: 2, defaultJoinOperator: 'OR', buttons: ['cancel', 'apply'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

### 2.7 Custom format
Any Luxon format for display/parse (match the floating param).
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value, 'yyyy/MM/dd'),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'yyyy/MM/dd', closeOnSelect: true },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'yyyy/MM/dd' },
}
```

### 2.8 Button combinations
Pick any subset of `'apply' | 'cancel' | 'clear' | 'reset'`.

Clear only (live):
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', closeOnSelect: true, buttons: ['clear'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```
Apply + Clear:
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', buttons: ['clear', 'apply'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```
Reset + Cancel + Apply:
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', buttons: ['reset', 'cancel', 'apply'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

### 2.9 Derived date via valueGetter
Column value computed from another field (read-only), still fully filterable.
```ts
{
  colId: 'settlement',
  valueGetter: (p) => p.data ? new Date(p.data.date.getFullYear(), p.data.date.getMonth(), p.data.date.getDate() + 2) : null,
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', closeOnSelect: true, buttons: ['cancel'] },
  floatingFilter: true,
  floatingFilterComponent: DateFloatingFilter,
  floatingFilterComponentParams: { dateFormat: 'dd-MMM-yyyy' },
}
```

---

## 3. Funnel only (no floating row)

No floating input; the filter opens from the header funnel. All columns here set
`floatingFilter: false` and omit the `floatingFilter*` component keys.

### 3.1 Live single date
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', closeOnSelect: true, buttons: ['cancel'] },
  floatingFilter: false,
}
```

### 3.2 Buffered with Apply and Cancel
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', buttons: ['cancel', 'apply'] },
  floatingFilter: false,
}
```

### 3.3 Before, after, equals conditions
Equals:
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', defaultCondition: 'equals', closeOnSelect: true },
  floatingFilter: false,
}
```
Before:
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', defaultCondition: 'before', closeOnSelect: true },
  floatingFilter: false,
}
```
After (bounded to on/after today):
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', defaultCondition: 'after', min: new Date(), closeOnSelect: true },
  floatingFilter: false,
}
```

### 3.4 Range with bounds and comparator
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: {
    dateFormat: 'dd-MMM-yyyy',
    defaultCondition: 'inRange',
    min: new Date(2015, 0, 1),
    max: new Date(2030, 11, 31),
    comparator: (filterDate, cellDate) => compareDatesByDay(cellDate, filterDate),
    buttons: ['cancel', 'apply'],
  },
  floatingFilter: false,
}
```

### 3.5 Two conditions with AND or OR
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'dd-MMM-yyyy', maxConditions: 2, defaultJoinOperator: 'OR', buttons: ['cancel', 'apply'] },
  floatingFilter: false,
}
```

### 3.6 Custom format
```ts
{
  field: 'date',
  valueFormatter: (p) => formatDate(p.value, 'yyyy-MM-dd'),
  comparator: compareDatesByDay,
  filter: DateFilter,
  filterParams: { dateFormat: 'yyyy-MM-dd', allowTyping: true, buttons: ['cancel', 'apply'] },
  floatingFilter: false,
}
```
