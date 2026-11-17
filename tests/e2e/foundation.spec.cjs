const { test, expect } = require('@playwright/test');

test('welcome, registration, login, password visibility, and recovery navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('pitad', { exact: true })).toBeVisible();
  await expect(page.getByText('Your run.')).toBeVisible();
  await page.getByRole('button', { name: 'Create an account' }).click();
  await expect(page.getByText('Start your story.')).toBeVisible();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await page.getByRole('link', { name: 'Already a member? Sign in' }).click();
  await expect(page.getByText('Welcome back.')).toBeVisible();
  const password = page.getByLabel('Password', { exact: true }).filter({ visible: true });
  await password.fill('my passphrase');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveJSProperty('type', 'text');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByText('Reset your password.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('signed-out deep links cannot reach any protected tab', async ({ page }) => {
  for (const route of ['/home', '/profile', '/record', '/progress', '/explore', '/run/private-run']) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: 'Create an account' })).toBeVisible();
  }
});

test('missing configuration is visible and authentication is disabled', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText(/Setup needed:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'test-results/login-light.png', fullPage: true });
});

test('dark mode and narrow screens remain usable', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/register');
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  await page.screenshot({ path: 'test-results/register-dark.png', fullPage: true });
});
