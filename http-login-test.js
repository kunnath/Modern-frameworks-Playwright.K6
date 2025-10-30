// HTTP-only login test (no browser)
// Uses the practice.expandtesting.com login form which posts to /authenticate
// Node 18+ has global fetch; this repo uses Node v24 in the environment.

(async () => {
  const loginUrl = 'https://practicetestautomation.com/practice-test-login/';
  const form = new URLSearchParams();
  form.append('username', 'student');
  form.append('password', 'Password123!');

  try {
    // send form as application/x-www-form-urlencoded and follow redirects
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      body: form.toString(),
      redirect: 'follow',
    });

    const finalUrl = res.url;
    const text = await res.text();

    console.log('HTTP status:', res.status);
    console.log('Final URL after redirects:', finalUrl);

    // Basic checks: should redirect to /secure and show success message
    if (finalUrl.includes('/secure') || text.includes('You logged into a secure area!')) {
      console.log('✅ HTTP login successful');
      process.exitCode = 0;
    } else {
      console.log('❌ HTTP login failed - unexpected response');
      // print a short snippet for debugging
      console.log('Response snippet:', text.slice(0, 800));
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exitCode = 1;
  }
})();
