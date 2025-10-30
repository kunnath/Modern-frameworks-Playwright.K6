// Install: brew install k6 (macOS) or download binary
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 50, // 50 virtual users
  duration: '30s', // run for 30 seconds
};

export default function () {
  const res = http.post('https://practice.expandtesting.com/login', {
    username: 'practice',
    password: 'SuperSecretPassword!',
  });

  // Check if response was successful
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has token': (r) => r.json('token') !== undefined,
  });

  sleep(1); // simulate user think time
}
