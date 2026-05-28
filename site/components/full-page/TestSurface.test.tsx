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

// PRD-005: Mock useUpstreamDrift so existing tests are unaffected
const recheckMock = vi.fn();
const mockDrift = {
  state: 'idle' as string,
  errorReason: null as string | null,
  retryAfterSeconds: null as number | null,
  lastChecked: null as string | null,
};

vi.mock('@/hooks/use-upstream-drift', () => ({
  useUpstreamDrift: () => ({
    state: mockDrift.state,
    lastChecked: mockDrift.lastChecked,
    errorReason: mockDrift.errorReason,
    retryAfterSeconds: mockDrift.retryAfterSeconds,
    recheck: recheckMock,
  }),
}));

// PRD-005: Mock snapshot-reader (static import used by hook — needed even through mock)
vi.mock('@/lib/upstream-drift/snapshot-reader', () => ({
  getSnapshot: vi.fn(),
  getWatchedFiles: vi.fn(),
  validateSchema: vi.fn(() => true),
}));

// PRD-005: Mock github-client
vi.mock('@/lib/upstream-drift/github-client', () => ({
  getLatestCommitSha: vi.fn(),
}));

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

// ---------------------------------------------------------------------------
// PRD-005: Click-targets + inline status + banner (CT-1 through CT-6)
// ---------------------------------------------------------------------------

describe('TestSurface — PRD-005 upstream drift (T023–T026)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recheckMock.mockResolvedValue(undefined);
    simulateMock.mockResolvedValue(MOCK_TRACE);
    mockDrift.state = 'idle';
    mockDrift.errorReason = null;
    mockDrift.retryAfterSeconds = null;
    mockDrift.lastChecked = null;
  });

  it('CT-1: renders "Check upstream" button', () => {
    render(<TestSurface {...BASE_PROPS} />);
    expect(screen.getByRole('button', { name: /re-check upstream/i })).toBeInTheDocument();
  });

  it('CT-2: button is disabled + aria-busy when state is checking', () => {
    mockDrift.state = 'checking';
    render(<TestSurface {...BASE_PROPS} />);
    const btn = screen.getByRole('button', { name: /re-check upstream/i });
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('CT-1 interaction: clicking Check upstream calls recheck()', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} />);
    await user.click(screen.getByRole('button', { name: /re-check upstream/i }));
    expect(recheckMock).toHaveBeenCalledOnce();
  });

  it('CT-3: banner is not rendered when state is idle', () => {
    mockDrift.state = 'idle';
    render(<TestSurface {...BASE_PROPS} />);
    // No status role from drift banner (there may be one from URL error element, but not a banner)
    const statusEls = screen.queryAllByRole('status');
    // None should be a drift-banner
    const hasDriftBanner = statusEls.some((el) => el.classList.contains('drift-banner'));
    expect(hasDriftBanner).toBe(false);
  });

  it('CT-4: inline status renders in-sync text when state is in-sync', () => {
    mockDrift.state = 'in-sync';
    render(<TestSurface {...BASE_PROPS} />);
    expect(screen.getByText(/in sync with upstream/i)).toBeInTheDocument();
  });

  it('CT-5: inline status renders error copy when state is error (network)', () => {
    mockDrift.state = 'error';
    mockDrift.errorReason = 'network';
    render(<TestSurface {...BASE_PROPS} />);
    expect(screen.getByText(/couldn't reach github/i)).toBeInTheDocument();
  });

  it('inline status block renders nothing when state is idle', () => {
    mockDrift.state = 'idle';
    render(<TestSurface {...BASE_PROPS} />);
    // Tightened 2026-05-28 after toolbar split: section helper text contains "in sync"
    // as a phrase; match the actual inline-status copy "In sync with upstream <branch>"
    // instead of any "in sync" substring.
    expect(screen.queryByText(/In sync with upstream/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/couldn't reach/i)).not.toBeInTheDocument();
  });

  it('existing Test button still works while drift button is present', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} maps={[MOCK_MAP]} />);
    await user.type(screen.getByRole('textbox', { name: /url/i }), '/old-path');
    const testBtn = screen.getByRole('button', { name: /^test$/i });
    expect(testBtn).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// PRD-005 click-target coverage — CT-3, CT-4, CT-5, CT-6
// (Added at /test phase 2026-05-27 to close code-review carry-over items)
// ---------------------------------------------------------------------------

describe('TestSurface — CT-3: banner dismiss writes sessionStorage + hides banner', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recheckMock.mockResolvedValue(undefined);
    simulateMock.mockResolvedValue(MOCK_TRACE);
    // Start with drifted state so banner renders
    mockDrift.state = 'drifted';
    mockDrift.errorReason = null;
    mockDrift.retryAfterSeconds = null;
    mockDrift.lastChecked = '2026-05-27T10:00:00Z';
    // Clear sessionStorage before each test
    sessionStorage.removeItem('rm-drift-banner-dismissed');
  });

  afterEach(() => {
    sessionStorage.removeItem('rm-drift-banner-dismissed');
  });

  it('CT-3a: drift banner renders when state is drifted and not dismissed', () => {
    render(<TestSurface {...BASE_PROPS} />);
    // Banner renders — look for the drift-banner class or role="status" with drift-banner class
    const statusEls = document.querySelectorAll('[role="status"]');
    const hasDriftBanner = Array.from(statusEls).some((el) => el.classList.contains('drift-banner'));
    expect(hasDriftBanner).toBe(true);
  });

  it('CT-3b: clicking dismiss button sets sessionStorage key to "1"', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} />);

    // Find and click dismiss button (from UpstreamDriftBanner)
    const dismissBtn = screen.getByRole('button', { name: /dismiss upstream drift banner/i });
    await user.click(dismissBtn);

    expect(sessionStorage.getItem('rm-drift-banner-dismissed')).toBe('1');
  });

  it('CT-3c: after dismiss click, the drift banner is hidden (dismissed=true passed)', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} />);

    const dismissBtn = screen.getByRole('button', { name: /dismiss upstream drift banner/i });
    await user.click(dismissBtn);

    // After dismiss, banner should not be in DOM
    const statusEls = document.querySelectorAll('[role="status"]');
    const hasDriftBanner = Array.from(statusEls).some((el) => el.classList.contains('drift-banner'));
    expect(hasDriftBanner).toBe(false);
  });

  it('CT-3d: AC-1.6 — Test tab URL input is still accessible while banner is visible', () => {
    render(<TestSurface {...BASE_PROPS} />);
    // Banner renders but does not steal focus or use inert
    const urlInput = screen.getByRole('textbox', { name: /url/i });
    expect(urlInput).toBeInTheDocument();
    expect(urlInput.getAttribute('inert')).toBeNull();
    // Banner itself should not be inert
    const statusEls = document.querySelectorAll('[role="status"]');
    const driftBanner = Array.from(statusEls).find((el) => el.classList.contains('drift-banner'));
    expect(driftBanner?.getAttribute('inert')).toBeNull();
  });
});

describe('TestSurface — CT-4: network error has enabled retry button', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recheckMock.mockResolvedValue(undefined);
    simulateMock.mockResolvedValue(MOCK_TRACE);
    mockDrift.state = 'error';
    mockDrift.errorReason = 'network';
    mockDrift.retryAfterSeconds = null;
    mockDrift.lastChecked = null;
  });

  it('CT-4a: network error renders "Retry" button', () => {
    render(<TestSurface {...BASE_PROPS} />);
    const retryBtn = screen.queryByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it('CT-4b: network error retry button is ENABLED (not disabled)', () => {
    render(<TestSurface {...BASE_PROPS} />);
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).not.toBeDisabled();
    expect(retryBtn.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('CT-4c: clicking retry button calls recheck()', async () => {
    const user = userEvent.setup();
    render(<TestSurface {...BASE_PROPS} />);
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await user.click(retryBtn);
    expect(recheckMock).toHaveBeenCalledOnce();
  });
});

describe('TestSurface — CT-5: rate-limit error has disabled retry button', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recheckMock.mockResolvedValue(undefined);
    simulateMock.mockResolvedValue(MOCK_TRACE);
    mockDrift.state = 'error';
    mockDrift.errorReason = 'rate-limit';
    mockDrift.retryAfterSeconds = 300; // 5 minutes
    mockDrift.lastChecked = null;
  });

  it('CT-5a: rate-limit error renders a retry-style button', () => {
    render(<TestSurface {...BASE_PROPS} />);
    // Rate-limit renders "Retry in N min" button (disabled)
    expect(screen.getByText(/retry in/i)).toBeInTheDocument();
  });

  it('CT-5b: rate-limit retry button is DISABLED', () => {
    render(<TestSurface {...BASE_PROPS} />);
    const retryBtn = screen.getByText(/retry in/i).closest('button');
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn).toBeDisabled();
  });

  it('CT-5c: rate-limit error shows reset time (minutes)', () => {
    render(<TestSurface {...BASE_PROPS} />);
    // retryAfterSeconds=300 → 5 minutes
    expect(screen.getByText(/retry in 5 min/i)).toBeInTheDocument();
  });
});

describe('TestSurface — CT-6: not-found error has NO retry button', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recheckMock.mockResolvedValue(undefined);
    simulateMock.mockResolvedValue(MOCK_TRACE);
    mockDrift.state = 'error';
    mockDrift.errorReason = 'not-found';
    mockDrift.retryAfterSeconds = null;
    mockDrift.lastChecked = null;
  });

  it('CT-6a: not-found error renders engineer-review copy', () => {
    render(<TestSurface {...BASE_PROPS} />);
    expect(screen.getByText(/upstream file not found/i)).toBeInTheDocument();
  });

  it('CT-6b: not-found error has NO retry button', () => {
    render(<TestSurface {...BASE_PROPS} />);
    // The error copy for not-found has retry: 'none' — no retry button
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/retry in/i)).not.toBeInTheDocument();
  });
});
