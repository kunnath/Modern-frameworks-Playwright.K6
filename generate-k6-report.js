const fs = require('fs');
const readline = require('readline');
const path = require('path');

const infile = path.resolve(__dirname, 'results.json');
const outfile = path.resolve(__dirname, 'k6-report.html');

if (!fs.existsSync(infile)) {
  console.error('results.json not found — run k6 with --out json=results.json first');
  process.exit(1);
}

async function parse() {
  const rl = readline.createInterface({ input: fs.createReadStream(infile), crlfDelay: Infinity });

  const durations = [];
  let totalHttpReqs = 0;
  let failedHttpReqs = 0;
  const checks = {}; // checkName -> {total, passed}
  let vusMax = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch (e) { continue; }

    if (obj.metric === 'http_reqs' && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
      totalHttpReqs += obj.data.value;
    }

    if (obj.metric === 'http_req_failed' && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
      failedHttpReqs += obj.data.value;
    }

    if (obj.metric === 'http_req_duration' && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
      durations.push(obj.data.value);
    }

    if (obj.metric === 'checks' && obj.type === 'Point' && obj.data && obj.data.tags && obj.data.tags.check) {
      const name = obj.data.tags.check;
      if (!checks[name]) checks[name] = { total: 0, passed: 0 };
      checks[name].total += 1;
      if (obj.data.value) checks[name].passed += obj.data.value;
    }

    if (obj.metric === 'vus_max' && obj.type === 'Point' && obj.data && typeof obj.data.value === 'number') {
      vusMax = Math.max(vusMax, obj.data.value);
    }
  }

  const durStats = {
    count: durations.length,
    min: durations.length ? Math.min(...durations).toFixed(2) : 'n/a',
    max: durations.length ? Math.max(...durations).toFixed(2) : 'n/a',
    avg: durations.length ? (durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(2) : 'n/a',
  };

  const report = buildHtml({ totalHttpReqs, failedHttpReqs, durStats, checks, vusMax });
  fs.writeFileSync(outfile, report, 'utf8');
  console.log('Generated report:', outfile);
}

function buildHtml({ totalHttpReqs, failedHttpReqs, durStats, checks, vusMax }) {
  const checksRows = Object.entries(checks).map(([name, s]) => `
    <tr><td>${escapeHtml(name)}</td><td>${s.total}</td><td>${s.passed}</td><td>${((s.passed/s.total)*100||0).toFixed(2)}%</td></tr>`).join('\n');

  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>k6 Performance Test Report</title>
<style>
:root {
  --primary: #7D4CDB;
  --success: #00C781;
  --warning: #FFAA15;
  --error: #FF4040;
  --background: #F8F8F8;
  --card-bg: #FFFFFF;
  --text: #333333;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--background);
  margin: 0;
  padding: 2rem;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
}
.header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.header h1 {
  color: var(--primary);
  margin: 0;
  font-size: 2.5rem;
}
.card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.card h2 {
  color: var(--primary);
  margin-top: 0;
  border-bottom: 2px solid var(--background);
  padding-bottom: 0.5rem;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.stat-item {
  background: var(--card-bg);
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.stat-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}
.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
}
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1rem 0;
}
th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--background);
}
th {
  background: var(--background);
  font-weight: 600;
  color: var(--text);
}
tr:hover td {
  background: #f5f5f5;
}
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--background);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--success);
  transition: width 0.3s ease;
}
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}
.badge-success { background: var(--success); color: white; }
.badge-error { background: var(--error); color: white; }
.footer {
  text-align: center;
  margin-top: 3rem;
  padding: 1rem;
  color: #666;
  font-size: 0.9rem;
}
@media (max-width: 768px) {
  body { padding: 1rem; }
  .stats-grid { grid-template-columns: 1fr; }
  .card { padding: 1rem; }
  th, td { padding: 0.75rem; }
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>k6 Performance Test Report</h1>
    <p>Test results and performance metrics</p>
  </div>

  <div class="card">
    <h2>Summary</h2>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-label">Total Requests</div>
        <div class="stat-value">${totalHttpReqs}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Failed Requests</div>
        <div class="stat-value">${failedHttpReqs}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${100 - (failedHttpReqs/totalHttpReqs*100)}%; background: ${failedHttpReqs > 0 ? 'var(--error)' : 'var(--success)'}"></div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Virtual Users (Max)</div>
        <div class="stat-value">${vusMax}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Avg Response Time</div>
        <div class="stat-value">${durStats.avg} ms</div>
      </div>
    </div>

    <div class="card">
      <h2>Response Time Details</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Minimum</div>
          <div class="stat-value">${durStats.min} ms</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Maximum</div>
          <div class="stat-value">${durStats.max} ms</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Average</div>
          <div class="stat-value">${durStats.avg} ms</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Sample Count</div>
          <div class="stat-value">${durStats.count}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Checks</h2>
    <table>
      <tr>
        <th>Check Name</th>
        <th>Total</th>
        <th>Passed</th>
        <th>Status</th>
      </tr>
      ${checksRows ? Object.entries(checks).map(([name, s]) => `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${s.total}</td>
          <td>${s.passed}</td>
          <td>
            <span class="badge ${s.passed === s.total ? 'badge-success' : 'badge-error'}">
              ${((s.passed/s.total)*100).toFixed(2)}%
            </span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(s.passed/s.total)*100}%"></div>
            </div>
          </td>
        </tr>`).join('\n')
        : '<tr><td colspan="4">No checks recorded</td></tr>'}
    </table>
  </div>

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>k6 Performance Testing Report - For detailed analysis, consider using Grafana integration</p>
  </div>
</div>
</body></html>`;
}

function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

parse().catch(err => { console.error(err); process.exit(1); });
