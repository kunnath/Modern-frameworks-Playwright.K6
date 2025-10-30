import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to the login page
    await page.goto('https://practicetestautomation.com/practice-test-login/');
    
    // Fill in the login form
    await page.fill('#username', 'student');
    await page.fill('#password', 'Password123');
    await page.click('#submit');

    // Wait for success message
    const successMessage = await page.waitForSelector('.post-title', { timeout: 5000 });
    const text = await successMessage.textContent();

    if (text?.includes('Logged In Successfully')) {
      console.log('✅ Login successful');
    } else {
      console.log('❌ Login failed');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();