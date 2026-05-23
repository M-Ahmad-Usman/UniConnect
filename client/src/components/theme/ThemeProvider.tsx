import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import {
  THEME_COOKIE_NAME,
  ThemeContext,
  type ResolvedTheme,
  type ThemePreference,
} from './theme-context';
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getThemeCookie() {
  const cookie = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${THEME_COOKIE_NAME}=`));
  const value = cookie ? decodeURIComponent(cookie.split('=')[1] ?? '') : undefined;
  return isThemePreference(value) ? value : 'system';
}

function setThemeCookie(preference: ThemePreference) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(
    preference,
  )}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function subscribeToSystemTheme(callback: () => void) {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', callback);

  return () => query.removeEventListener('change', callback);
}

function resolveTheme(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  return preference === 'system' ? systemTheme : preference;
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    (): ResolvedTheme => 'light',
  );
  const preference = useSyncExternalStore(
    (callback) => {
      window.addEventListener('uniconnect:theme-change', callback);
      return () => window.removeEventListener('uniconnect:theme-change', callback);
    },
    getThemeCookie,
    (): ThemePreference => 'system',
  );
  const resolvedTheme = resolveTheme(preference, systemTheme);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setThemeCookie(nextPreference);
    window.dispatchEvent(new Event('uniconnect:theme-change'));
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
