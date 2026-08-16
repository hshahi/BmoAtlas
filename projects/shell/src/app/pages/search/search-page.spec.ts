import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SearchPage } from './search-page';
import { PageCatalogEntry } from './search.models';

const MOCK_CATALOG: PageCatalogEntry[] = [
  {
    id: 'dashboard-overview',
    app: 'Dashboard',
    appRoute: '/front-office/dashboard',
    page: 'Overview',
    pageRoute: '/front-office/dashboard/overview',
    description: 'High-level summary of key metrics and KPIs.',
    keywords: ['metrics', 'KPI', 'portfolio'],
    docPath: 'assets/pages/dashboard/overview.md',
    imagePath: 'assets/pages/dashboard/overview.png',
  },
  {
    id: 'settings-general',
    app: 'Settings',
    appRoute: '/front-office/settings',
    page: 'General',
    pageRoute: '/front-office/settings/general',
    description: 'Application-wide settings including language and timezone.',
    keywords: ['settings', 'preferences', 'language'],
    docPath: 'assets/pages/settings/general.md',
    imagePath: 'assets/pages/settings/general.png',
  },
  {
    id: 'stocks-summary',
    app: 'Stocks',
    appRoute: '/front-office/stocks',
    page: 'Summary',
    pageRoute: '/front-office/stocks/summary',
    description: 'Real-time stock price summary with live streaming data.',
    keywords: ['stocks', 'prices', 'real-time', 'streaming'],
    docPath: 'assets/pages/stocks/summary.md',
    imagePath: 'assets/pages/stocks/summary.png',
  },
];

describe('SearchPage', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  /** Stabilize: flush pending effects and microtasks so the async httpResource
   *  value propagates into the component's signals before we assert. */
  async function stabilize(): Promise<void> {
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
  }

  /** Create the component (triggers ngOnInit → catalog load). */
  function createComponent(): SearchPage {
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** Create, flush the catalog fetch, and stabilize so `catalog()` is populated. */
  async function createLoaded(): Promise<SearchPage> {
    const comp = createComponent();
    httpTesting.expectOne('page-catalog.json').flush(MOCK_CATALOG);
    await stabilize();
    return comp;
  }

  // ── Construction ──────────────────────────────────────────

  describe('construction', () => {
    it('should create the component', () => {
      const comp = createComponent();
      httpTesting.expectOne('page-catalog.json').flush(MOCK_CATALOG);
      expect(comp).toBeTruthy();
    });

    it('should have empty search term initially', () => {
      const comp = createComponent();
      expect(comp.searchTerm()).toBe('');
      httpTesting.expectOne('page-catalog.json').flush(MOCK_CATALOG);
    });

    it('should have empty catalog before load completes', () => {
      const comp = createComponent();
      // defaultValue is [] so catalog is never undefined
      expect(comp.catalog().length).toBe(0);
      httpTesting.expectOne('page-catalog.json').flush(MOCK_CATALOG);
    });
  });

  // ── Catalog loading ───────────────────────────────────────

  describe('catalog loading', () => {
    it('should fetch page-catalog.json on init', () => {
      createComponent();
      const req = httpTesting.expectOne('page-catalog.json');
      expect(req.request.method).toBe('GET');
      req.flush(MOCK_CATALOG);
    });

    it('should populate catalog after successful fetch', async () => {
      const comp = await createLoaded();
      expect(comp.catalog().length).toBe(3);
      expect(comp.catalogData.isSuccess()).toBe(true);
    });

    it('should set error on fetch failure', async () => {
      const comp = createComponent();
      httpTesting.expectOne('page-catalog.json').error(new ProgressEvent('error'));
      await stabilize();
      expect(comp.catalogData.isError()).toBe(true);
    });
  });

  // ── Filtering ─────────────────────────────────────────────

  describe('filtering', () => {
    it('should return all entries when search term is empty', async () => {
      const comp = await createLoaded();
      expect(comp.filteredEntries().length).toBe(3);
    });

    it('should filter by app name', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('dashboard');
      expect(comp.filteredEntries().length).toBe(1);
      expect(comp.filteredEntries()[0].id).toBe('dashboard-overview');
    });

    it('should filter by page name', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('general');
      expect(comp.filteredEntries().length).toBe(1);
      expect(comp.filteredEntries()[0].id).toBe('settings-general');
    });

    it('should filter by description text', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('streaming');
      expect(comp.filteredEntries().length).toBe(1);
      expect(comp.filteredEntries()[0].id).toBe('stocks-summary');
    });

    it('should filter by keyword', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('KPI');
      expect(comp.filteredEntries().length).toBe(1);
      expect(comp.filteredEntries()[0].id).toBe('dashboard-overview');
    });

    it('should be case-insensitive', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('STOCKS');
      expect(comp.filteredEntries().length).toBe(1);
      expect(comp.filteredEntries()[0].id).toBe('stocks-summary');
    });

    it('should support partial matches', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('set');
      expect(comp.filteredEntries().length).toBe(1);
      expect(comp.filteredEntries()[0].id).toBe('settings-general');
    });

    it('should return empty array when no matches', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('nonexistent');
      expect(comp.filteredEntries().length).toBe(0);
    });

    it('should trim whitespace from search term', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('  stocks  ');
      expect(comp.filteredEntries().length).toBe(1);
    });

    it('should return all entries when search term is only whitespace', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('   ');
      expect(comp.filteredEntries().length).toBe(3);
    });
  });

  // ── Search input methods ──────────────────────────────────

  describe('search input methods', () => {
    it('should clear search term via clearSearch()', async () => {
      const comp = await createLoaded();
      comp.searchTerm.set('test');
      comp.clearSearch();
      expect(comp.searchTerm()).toBe('');
    });
  });

  // ── Cleanup ───────────────────────────────────────────────

  describe('cleanup', () => {
    it('should not throw on destroy', () => {
      const fixture = TestBed.createComponent(SearchPage);
      fixture.detectChanges();
      httpTesting.expectOne('page-catalog.json').flush(MOCK_CATALOG);
      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
