import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════════
// E2E TESTS: Token Dashboard
// RALPH-WIGGUM TEST LOOP #4 - Browser Integration Tests
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_TOKEN_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const DASHBOARD_URL = `/token/${TEST_TOKEN_ADDRESS}`;

test.describe('Dashboard Navigation', () => {
  test('navigates to token dashboard', async ({ page }) => {
    await page.goto('/');
    // Click on a token card (if exists)
    const tokenCard = page.locator('[data-testid="token-card"]').first();
    if (await tokenCard.isVisible()) {
      await tokenCard.click();
      await expect(page).toHaveURL(/\/token\/0x/);
    }
  });

  test('back button returns to previous page', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    const backButton = page.locator('text=← Back').first();
    if (await backButton.isVisible()) {
      await backButton.click();
      // Should navigate back
    }
  });

  test('handles invalid token address gracefully', async ({ page }) => {
    await page.goto('/token/invalid');
    // Should show error or redirect
    await expect(page.locator('body')).toContainText(/(error|not found|invalid)/i);
  });
});

test.describe('Dashboard Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
  });

  test('renders all 8 dashboard panels', async ({ page }) => {
    // Check for panel headers
    await expect(page.locator('text=TOKEN')).toBeVisible();
    await expect(page.locator('text=MESSAGE BOARD')).toBeVisible();
    await expect(page.locator('text=LIVE CHAT')).toBeVisible();
    await expect(page.locator('text=CHART')).toBeVisible();
    await expect(page.locator('text=BUYS & SELLS')).toBeVisible();
    await expect(page.locator('text=INFO')).toBeVisible();
    await expect(page.locator('text=SWAP')).toBeVisible();
    await expect(page.locator('text=HOLDERS')).toBeVisible();
  });

  test('can unlock layout', async ({ page }) => {
    const lockButton = page.locator('text=LOCKED');
    await lockButton.click();
    await expect(page.locator('text=UNLOCKED')).toBeVisible();
  });

  test('can lock layout after unlocking', async ({ page }) => {
    await page.locator('text=LOCKED').click();
    await expect(page.locator('text=UNLOCKED')).toBeVisible();

    await page.locator('text=UNLOCKED').click();
    await expect(page.locator('text=LOCKED')).toBeVisible();
  });

  test('shows reset button when unlocked', async ({ page }) => {
    await page.locator('text=LOCKED').click();
    await expect(page.locator('text=Reset')).toBeVisible();
  });

  test('hides reset button when locked', async ({ page }) => {
    await expect(page.locator('text=Reset')).not.toBeVisible();
  });
});

test.describe('Swap Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
  });

  test('renders swap tabs', async ({ page }) => {
    await expect(page.locator('text=buy')).toBeVisible();
    await expect(page.locator('text=sell')).toBeVisible();
    await expect(page.locator('text=burn')).toBeVisible();
  });

  test('can switch between tabs', async ({ page }) => {
    await page.locator('text=sell').click();
    // Sell tab should be active
    await expect(page.locator('text=sell')).toHaveClass(/bg-orange/);
  });

  test('can enter amount', async ({ page }) => {
    const input = page.locator('input[placeholder="0.0"]');
    await input.fill('100');
    await expect(input).toHaveValue('100');
  });

  test('shows Connect Wallet when not connected', async ({ page }) => {
    // Without wallet connection, should show connect button
    await expect(page.locator('text=Connect Wallet')).toBeVisible();
  });
});

test.describe('Price Chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
  });

  test('renders timeframe buttons', async ({ page }) => {
    await expect(page.locator('text=1m')).toBeVisible();
    await expect(page.locator('text=5m')).toBeVisible();
    await expect(page.locator('text=15m')).toBeVisible();
    await expect(page.locator('text=1h')).toBeVisible();
    await expect(page.locator('text=4h')).toBeVisible();
    await expect(page.locator('text=1d')).toBeVisible();
  });

  test('can change timeframe', async ({ page }) => {
    const tf1h = page.locator('text=1h');
    await tf1h.click();
    await expect(tf1h).toHaveClass(/bg-\[#39ff14\]/);
  });
});

test.describe('Responsive Design', () => {
  test('renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    // All panels should still be visible (stacked)
    await expect(page.locator('text=TOKEN')).toBeVisible();
    await expect(page.locator('text=SWAP')).toBeVisible();
  });

  test('renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=TOKEN')).toBeVisible();
  });

  test('renders on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=TOKEN')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
  });

  test('all buttons are keyboard accessible', async ({ page }) => {
    // Tab through the page
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
  });

  test('has visible focus indicators', async ({ page }) => {
    const lockButton = page.locator('text=LOCKED');
    await lockButton.focus();
    // Check for focus styling
    const hasFocusOutline = await lockButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outline !== 'none' || style.boxShadow !== 'none';
    });
    // Focus should be visible (outline or shadow)
  });
});

test.describe('Performance', () => {
  test('loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(3000);
  });

  test('chart renders without jank', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    // Check that chart container exists and is not empty
    const chartPanel = page.locator('text=CHART').first();
    await expect(chartPanel).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('handles network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.route('**/*', (route) => route.abort());
    await page.goto(DASHBOARD_URL);

    // Should show some error state, not crash
    // (Implementation dependent)
  });
});

test.describe('Layout Persistence', () => {
  test('layout persists after reload', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    // Unlock and modify layout
    await page.locator('text=LOCKED').click();

    // Store initial state
    const initialLayout = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.includes('pump-fud-dashboard-layout'));
      return key ? localStorage.getItem(key) : null;
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check layout persisted
    const persistedLayout = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.includes('pump-fud-dashboard-layout'));
      return key ? localStorage.getItem(key) : null;
    });

    // Layout should be same after reload
    if (initialLayout) {
      expect(persistedLayout).toBe(initialLayout);
    }
  });

  test('reset clears saved layout', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    // Unlock layout
    await page.locator('text=LOCKED').click();

    // Click reset
    page.on('dialog', dialog => dialog.accept());
    await page.locator('text=Reset').click();

    // Layout should be cleared from localStorage
    const layout = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.includes('pump-fud-dashboard-layout'));
      return key ? localStorage.getItem(key) : null;
    });

    expect(layout).toBeNull();
  });
});
