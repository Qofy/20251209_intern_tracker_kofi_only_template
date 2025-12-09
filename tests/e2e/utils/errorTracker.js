import { expect } from '@playwright/test';

const DEFAULT_IGNORABLE_PATTERNS = [
  /favicon\.ico/i,
  /Failed to load resource/i,
  /webkit/,
  /Blocked by client/i,
  /Source map error/i,
  /Cross-Origin Request Blocked/i,
  /CORS request did not succeed/i,
];

export function startErrorTracker(page, { ignorable = DEFAULT_IGNORABLE_PATTERNS } = {}) {
  const consoleErrors = [];
  const pageErrors = [];

  const consoleListener = (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  };

  const pageErrorListener = (error) => {
    pageErrors.push(error?.message || String(error));
  };

  page.on('console', consoleListener);
  page.on('pageerror', pageErrorListener);

  const isIgnorable = (message) => ignorable.some((rx) => rx.test(message));

  return {
    getConsoleErrors: () => consoleErrors.slice(),
    getPageErrors: () => pageErrors.slice(),
    async assertNoCriticalErrors() {
      const all = [...consoleErrors, ...pageErrors];
      const critical = all.filter((e) => !isIgnorable(e));
      expect(critical, `No critical JS errors should occur. Got:\n${critical.join('\n')}`).toHaveLength(0);
    },
    stop() {
      page.off('console', consoleListener);
      page.off('pageerror', pageErrorListener);
    }
  };
}
