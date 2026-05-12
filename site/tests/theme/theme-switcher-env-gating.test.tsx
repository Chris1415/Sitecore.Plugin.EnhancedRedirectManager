import { render, screen } from '@testing-library/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Structural test: the theme switcher must be hidden unless
 * NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER === "true".
 *
 * Operator default (OOTB) is "no switcher visible, theme follows system" —
 * see ADR-not-yet-written + .env.example. This guard locks that default in.
 *
 * We re-import the component module inside each test so the
 * env-flag read picks up the freshly-set process.env value.
 * (NEXT_PUBLIC_* is inlined by Next at build, but in vitest we just read
 * process.env at module load.)
 */
describe('ThemeSwitcher — env gating', () => {
  const originalEnv = process.env.NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER;
    } else {
      process.env.NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER = originalEnv;
    }
  });

  it('renders nothing when env var is unset', async () => {
    delete process.env.NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER;
    const { ThemeSwitcher } = await import('@/components/theme-switcher');
    const { container } = render(
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeSwitcher />
      </NextThemesProvider>,
    );
    expect(container.querySelector('[data-slot="theme-switcher"]')).toBeNull();
  });

  it('renders nothing when env var is "false"', async () => {
    process.env.NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER = 'false';
    const { ThemeSwitcher } = await import('@/components/theme-switcher');
    const { container } = render(
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeSwitcher />
      </NextThemesProvider>,
    );
    expect(container.querySelector('[data-slot="theme-switcher"]')).toBeNull();
  });

  it('renders the dropdown trigger when env var is "true"', async () => {
    process.env.NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER = 'true';
    const { ThemeSwitcher } = await import('@/components/theme-switcher');
    render(
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeSwitcher />
      </NextThemesProvider>,
    );
    // Use findBy* — the component gates render on mount via useEffect.
    const trigger = await screen.findByRole('button', { name: /theme/i });
    expect(trigger).toBeInTheDocument();
  });
});
