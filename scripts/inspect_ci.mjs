import https from 'https';
import { spawnSync } from 'child_process';
import fs from 'fs';

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
    const req = https.get(url, {
      headers: {
        'User-Agent': 'TaskYar-CI-Inspector',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, res => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return apiGet(res.headers.location).then(resolve).catch(reject);
      }
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
    });
    req.on('error', reject);
  });
}

function getText(url) {
  return new Promise((resolve, reject) => {
    const isGithub = url.includes('github.com');
    const headers = {
      'User-Agent': 'TaskYar-CI-Inspector'
    };
    if (isGithub) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return getText(res.headers.location).then(resolve).catch(reject);
      }
      let body = [];
      res.on('data', chunk => body.push(chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, text: Buffer.concat(body).toString('utf8') });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching GitHub Actions Workflow Runs for satinbest/taskyar-web...');
  const runsRes = await apiGet('https://api.github.com/repos/satinbest/taskyar-web/actions/runs?per_page=15');
  if (runsRes.status !== 200) {
    console.error('Failed to get runs:', runsRes);
    return;
  }

  const runs = runsRes.data.workflow_runs;
  console.log(`Found ${runs.length} runs:\n`);

  for (const r of runs) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Run #${r.run_number} | ID: ${r.id} | Status: ${r.status} | Conclusion: ${r.conclusion}`);
    console.log(`Commit: ${r.head_sha.slice(0, 7)} - ${r.head_commit ? r.head_commit.message.split('\n')[0] : ''}`);
    console.log(`HTML: ${r.html_url}`);

    // Get jobs for run
    const jobsRes = await apiGet(`https://api.github.com/repos/satinbest/taskyar-web/actions/runs/${r.id}/jobs`);
    if (jobsRes.status === 200 && jobsRes.data.jobs) {
      for (const job of jobsRes.data.jobs) {
        console.log(`  Job: ${job.name} (ID: ${job.id}) -> Conclusion: ${job.conclusion}`);
        for (const step of job.steps) {
          console.log(`    Step: [${step.number}] ${step.name} -> Conclusion: ${step.conclusion}`);
        }

        // If job failed, fetch job logs
        if (job.conclusion === 'failure') {
          console.log(`\n  --- Log snippet for failed job ${job.id} (${job.name}) ---`);
          const logRes = await getText(`https://api.github.com/repos/satinbest/taskyar-web/actions/jobs/${job.id}/logs`);
          if (logRes.status === 200) {
            const lines = logRes.text.split('\n');
            const errorLines = lines.filter(l => l.includes('##[error]') || l.includes('Error:') || l.includes('FAIL') || l.includes('fatal:'));
            console.log('  Matching error lines:');
            console.log(errorLines.slice(-25).join('\n'));
            console.log('  --- End of snippet ---\n');

            // Save full log to disk for deeper inspection
            fs.writeFileSync(`ci_log_run_${r.run_number}_job_${job.id}.txt`, logRes.text, 'utf8');
            console.log(`  Full log saved to ci_log_run_${r.run_number}_job_${job.id}.txt`);
          }
        }
      }
    }
  }
}

run().catch(console.error);
