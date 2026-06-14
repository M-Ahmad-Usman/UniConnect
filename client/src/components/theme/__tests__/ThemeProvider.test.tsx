import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../ThemeProvider';
import { THEME_COOKIE_NAME, useAppTheme } from '../theme-context';

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function ThemeProbe() {
  const { preference, resolvedTheme, setPreference } = useAppTheme();

  return (
    <div>
      <p>Preference: {preference}</p>
      <p>Resolved: {resolvedTheme}</p>
      <button type="button" onClick={() => setPreference('dark')}>
        Set dark
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockMatchMedia(true);
    document.cookie = `${THEME_COOKIE_NAME}=; Path=/; Max-Age=0`;
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('uses system preference by default and applies the resolved class', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText('Preference: system')).toBeInTheDocument();
    expect(screen.getByText('Resolved: dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('persists explicit preferences in a cookie', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Set dark' }));

    expect(document.cookie).toContain(`${THEME_COOKIE_NAME}=dark`);
    expect(screen.getByText('Preference: dark')).toBeInTheDocument();
  });
});
