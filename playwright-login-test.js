// Install: npm install playwright
const { chromium, firefox } = require('playwright');

(async () => {
    // 1. Launch browser
    let browser;
    try {
    // add sandbox flags which can prevent chromium crashes in some CI/container environments
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const context = await browser.newContext();
      const page = await context.newPage();

      // 2. Go to login page (practice site)
      await page.goto('https://practice.expandtesting.com/login', { waitUntil: 'domcontentloaded' });

      // 3. Fill form and submit (use the practice credentials shown on the page)
      await page.waitForSelector('#username', { timeout: 10000 });
      await page.fill('#username', 'practice');
      await page.fill('#password', 'SuperSecretPassword!');

      // Submit and wait for navigation/response
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
        page.click('#submit-login'),
      ]);

      // 4. Verify successful login: either redirected to /secure or success message present
      const currentUrl = page.url();
      const successMessage = await page.locator('text=You logged into a secure area!').first().textContent().catch(() => null);
      if (currentUrl.includes('/secure') || (successMessage && successMessage.includes('You logged into a secure area!'))) {
        console.log('✅ Login successful');
      } else {
        console.log('❌ Login failed - post-login checks did not pass');
        console.log('Current URL:', currentUrl);
        const pageContentSnippet = await page.textContent('body').then(t => t && t.slice(0, 500)).catch(() => null);
        if (pageContentSnippet) console.log('Page snippet:', pageContentSnippet);
        process.exitCode = 1;
      }
    } catch (err) {
      console.error('Test failed (chromium):', err && err.message ? err.message : err);
      // If chromium crashed, attempt firefox as a fallback
      if (err && err.message && err.message.includes('Page crashed')) {
        try {
          if (browser) await browser.close();
          console.log('Attempting fallback with Firefox...');
          browser = await firefox.launch({ headless: true });
          const ctx = await browser.newContext();
          const page = await ctx.newPage();
          await page.goto('https://practice.expandtesting.com/login', { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#username', { timeout: 10000 });
          await page.fill('#username', 'practice');
          await page.fill('#password', 'SuperSecretPassword!');
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
            page.click('#submit-login'),
          ]);
          const currentUrl = page.url();
          const successMessage = await page.locator('text=You logged into a secure area!').first().textContent().catch(() => null);
          if (currentUrl.includes('/secure') || (successMessage && successMessage.includes('You logged into a secure area!'))) {
            console.log('✅ Login successful (firefox)');
          } else {
            console.log('❌ Login failed (firefox) - post-login checks did not pass');
            console.log('Current URL:', currentUrl);
            const pageContentSnippet = await page.textContent('body').then(t => t && t.slice(0, 500)).catch(() => null);
            if (pageContentSnippet) console.log('Page snippet:', pageContentSnippet);
            process.exitCode = 1;
          }
        } catch (err2) {
          console.error('Firefox fallback failed:', err2);
          process.exitCode = 1;
        }
      } else {
        process.exitCode = 1;
      }
    } finally {
      if (browser) await browser.close();
    }
})();
