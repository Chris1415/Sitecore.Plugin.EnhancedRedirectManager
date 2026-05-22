/**
 * TestSurface component tests — shared-rail restructure (operator UX feedback)
 *
 * TestSurface is now the right-panel only: URL input + Test button + trace area.
 * The left rail (CollectionPicker + SitePicker + RedirectMapList) is rendered by
 * FullPage and shared across both Manage and Test tabs.
 *
 * T030 — Layout: URL input, Test button, trace area (maps list removed from component)
 * T033 — URL input validation
 * T034 — simulate() call + onTraceComplete propagation (BUG FIX regression)
 * T036 — Test button enabled/disabled state (URL validity only)
 * NEW  — Locale derivation from URL prefix
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestSurface, type TestSurfaceProps, deriveLocaleFromUrl } from './TestSurface';
import type { SimulationTrace } from '@/lib/redirects/proxy-simulator';
import type { RedirectMapItem } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock TraceCardStack to avoid its internal complexity
vi.mock('@/components/full-page/TraceCardStack', () => ({
  TraceCardStack: ({ trace }: { trace: SimulationTrace }) => (
    <div data-testid="trace-card-stack" data-duration={trace.durationMs} />
  ),
}));

// Mock simulate()
const simulateMock = vi.fn();
vi.mock('@/lib/redirects/proxy-simulator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/redirects/proxy-simulator')>();
  return {
    ...actual,
    simulate: (...args: unknown[]) => simulateMock(...args),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_MAP: RedirectMapItem = {
  id: 'map-1',
  name: 'Black Friday',
  sitePath: '/sitecore/content/solo/solo-website/Settings/Redirects',
  redirectType: 'Redirect301',
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: '20260509T183802Z',
  mappings: [
    { source: '/old-path', target: '/new-path' },
  ],
};

const MOCK_TRACE: SimulationTrace = {
  startedAt: new Date().toISOString(),
  durationMs: 8,
  stages: [],
  result: { matched: false, candidatesTried: [], rowsConsidered: [], rowsConsideredTotal: 0 },
};

const BASE_PROPS: TestSurfaceProps = {
  siteLanguage: 'en',
  maps: [],
  lastTrace: null,
  onTraceComplete: vi.fn(),
  onRequestEditRow: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  simulateMock.mockResolvedValue(MOCK_TRACE);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// T030 — Layout scaffold
// ---------------------------------------------------------------------------

describe('TestSurface — layout (T030)', () => {
  it('renders the URL input field', () => {
    render(<TestSurface {...BASE_PROPS} />);
    expect(screen.getByRole('textbox', { name: /url/i })).toBeInTheDocument();
  });

  it('renders the Test button', () => {
    render(<TestSurface {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: /^test$/i })).toBeInTheDocument();
  });

  it('renders EmptyState when lastTrace is null and no maps', () => {
    render(<TestSurface {...BASE_PROPS} />);
    expect(screen.getByText(/pick a scope/i)).toBeInTheDocument();
  });

  it('renders EmptyState "Ready to test" when maps are loaded but no trace yet', () => {
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} />);
    expect(screen.getByText(/ready to test/i)).toBeInTheDocument();
  });

  it('renders TraceCardStack when lastTrace is provided', () => {
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} lastTrace={MOCK_TRACE} />);
    expect(screen.getByTestId('trace-card-stack')).toBeInTheDocument();
  });

  // Maps list is no longer rendered inside TestSurface — it lives in the shared
  // left rail (FullPage) and is shown as readOnly={true} RedirectMapList.
  it('does NOT render an inline maps list (moved to shared rail)', () => {
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} />);
    expect(screen.queryByText(/maps in scope/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// T033 — URL input validation
// ---------------------------------------------------------------------------

describe('TestSurface — URL input (T033)', () => {
  it('shows URL error when value does not start with http or /', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} />);
    await user.type(screen.getByRole('textbox', { name: /url/i }), 'invalid-url');
    expect(screen.getByText(/url must start with http or \//i)).toBeInTheDocument();
  });

  it('clears URL error when valid URL is typed', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} />);
    const input = screen.getByRole('textbox', { name: /url/i });
    await user.type(input, 'invalid');
    expect(screen.getByText(/url must start/i)).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, '/valid-path');
    expect(screen.queryByText(/url must start/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// T036 — Test button enabled state
// ---------------------------------------------------------------------------

describe('TestSurface — Test button enabled state (T036)', () => {
  it('Test button is disabled when URL is empty', () => {
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} />);
    expect(screen.getByRole('button', { name: /^test$/i })).toBeDisabled();
  });

  it('Test button is enabled when valid URL is entered', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} />);
    await user.type(screen.getByRole('textbox', { name: /url/i }), '/test-path');
    expect(screen.getByRole('button', { name: /^test$/i })).not.toBeDisabled();
  });

  it('Test button is disabled when URL is invalid', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} />);
    await user.type(screen.getByRole('textbox', { name: /url/i }), 'bad-url');
    expect(screen.getByRole('button', { name: /^test$/i })).toBeDisabled();
  });

  it('Test button is disabled when URL is empty (no maps)', () => {
    render(<TestSurface {...BASE_PROPS} maps={[]} />);
    expect(screen.getByRole('button', { name: /^test$/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// T034 — simulate() call + BUG FIX regression
//
// Regression: With maps passed as props and a valid URL entered, clicking Test
// must call onTraceComplete with the trace (right pane shows trace, not EmptyState).
// This was broken in the original ScopePicker-based TestSurface because pickedMaps
// could be empty while mapIds was non-empty, causing empty-rules simulate() with
// no visible state change. The simplified TestSurface fixes this by design.
// ---------------------------------------------------------------------------

describe('TestSurface — simulate call (T034 + bug fix regression)', () => {
  it('calls simulate() with flattened rules from maps prop when Test is clicked', async () => {
    const user = userEvent.setup();
    const onTraceComplete = vi.fn();
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} onTraceComplete={onTraceComplete} />);

    await user.type(screen.getByRole('textbox', { name: /url/i }), '/old-path');
    await user.click(screen.getByRole('button', { name: /^test$/i }));

    await waitFor(() => {
      expect(simulateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/old-path',
          rules: expect.arrayContaining([
            expect.objectContaining({ source: '/old-path', target: '/new-path' }),
          ]),
        }),
      );
    });
  });

  it('calls onTraceComplete with the simulation result (regression: right pane must show trace)', async () => {
    const user = userEvent.setup();
    const onTraceComplete = vi.fn();
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} onTraceComplete={onTraceComplete} />);

    await user.type(screen.getByRole('textbox', { name: /url/i }), '/old-path');
    await user.click(screen.getByRole('button', { name: /^test$/i }));

    await waitFor(() => {
      expect(onTraceComplete).toHaveBeenCalledWith(MOCK_TRACE);
    }, { timeout: 200 });
  });

  it('simulate() is called with locale derived from URL prefix', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} />);

    await user.type(screen.getByRole('textbox', { name: /url/i }), '/de-DE/old-page');
    await user.click(screen.getByRole('button', { name: /^test$/i }));

    await waitFor(() => {
      expect(simulateMock).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'de-DE' }),
      );
    });
  });

  it('simulate() uses locale "en" when URL has no locale prefix', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} />);

    await user.type(screen.getByRole('textbox', { name: /url/i }), '/old-path');
    await user.click(screen.getByRole('button', { name: /^test$/i }));

    await waitFor(() => {
      expect(simulateMock).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'en' }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Locale derivation unit tests (NEW — Step 4 regression test)
// ---------------------------------------------------------------------------

describe('deriveLocaleFromUrl', () => {
  it('/de-DE/old-page -> de-DE', () => {
    expect(deriveLocaleFromUrl('/de-DE/old-page')).toBe('de-DE');
  });

  it('/en/old-page -> en', () => {
    expect(deriveLocaleFromUrl('/en/old-page')).toBe('en');
  });

  it('/old-page -> en (default)', () => {
    expect(deriveLocaleFromUrl('/old-page')).toBe('en');
  });

  it('https://host/de-DE/page -> de-DE', () => {
    expect(deriveLocaleFromUrl('https://example.com/de-DE/page')).toBe('de-DE');
  });

  it('empty string -> en (default)', () => {
    expect(deriveLocaleFromUrl('')).toBe('en');
  });

  it('/fr-FR/about -> fr-FR', () => {
    expect(deriveLocaleFromUrl('/fr-FR/about')).toBe('fr-FR');
  });
});
