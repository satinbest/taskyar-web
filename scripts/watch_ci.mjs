import https from 'https';
import { spawnSync } from 'child_process';

function getGitAuthToken() {
  const res = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8'
  });
  if (res.status !== 0 || !res.stdout) {
    throw new Error('Failed to retrieve GitHub credentials');
  }
  const lines = res.stdout.split('\n');
  for (const line of lines) {
    if (line.startsWith('password=')) {
      return line.slice('password='.length).trim();
    }
  }
  throw new Error('Token not found');
}

const token = getGitAuthToken();

function apiGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'TaskYar-CI-Watcher',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, res => {
      let body = [];
      res.on('data', chunk => body.push(chunk));
      res.on('end', () => {
        const str = Buffer.concat(body).toString('utf8');
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(str) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: str });
        }
      });
    }).on('error', reject);
  });
}

async function watch() {
  console.log('Watching latest CI workflow run for satinbest/taskyar-web...\n');

  // Poll for up to 5 minutes (every 10 seconds)
  for (let i = 0; i < 30; i++) {
    const runsRes = await apiGet('https://api.github.com/repos/satinbest/taskyar-web/actions/runs?per_page=3');
    if (runsRes.status === 200 && runsRes.data.workflow_runs.length > 0) {
      const latest = runsRes.data.workflow_runs[0];
      console.log(`[Attempt ${i + 1}] Run #${latest.run_number} (ID: ${latest.id}) | Commit: ${latest.head_sha.slice(0, 7)} | Status: ${latest.status} | Conclusion: ${latest.conclusion || 'in_progress'}`);

      const jobsRes = await apiGet(`https://api.github.com/repos/satinbest/taskyar-web/actions/runs/${latest.id}/jobs`);
      if (jobsRes.status === 200 && jobsRes.data.jobs) {
        for (const j of jobsRes.data.jobs) {
          console.log(`    -> Job: ${j.name} | Status: ${j.status} | Conclusion: ${j.conclusion || 'running'}`);
        }
      }

      if (latest.status === 'completed') {
        console.log(`\n======================================================`);
        console.log(`WORKFLOW RUN FINISHED WITH CONCLUSION: ${latest.conclusion.toUpperCase()}`);
        console.log(`URL: ${latest.html_url}`);
        console.log(`======================================================\n`);
        if (latest.conclusion === 'success') {
          process.exit(0);
        } else {
          process.exit(1);
        }
      }
    }
    await new Promise(r => setTimeout(r, 10000));
  }

  console.log('Timed out waiting for workflow completion.');
  process.exit(2);
}

watch().catch(err => {
  console.error(err);
  process.exit(1);
});
