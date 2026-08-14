import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const python = process.env.PYTHON_EXECUTABLE || 'C:\\Users\\XPS\\AppData\\Local\\Python\\bin\\python.exe';
const script = fileURLToPath(new URL('../ai/research_engine.py', import.meta.url));
export function runAiReview(input) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [script], { stdio: ['pipe', 'pipe', 'pipe'] }); let out='', err='';
    child.stdout.on('data', chunk => { out += chunk; }); child.stderr.on('data', chunk => { err += chunk; }); child.on('error', reject);
    child.on('close', code => { if (code !== 0) return reject(new Error(`AI review failed: ${err || `Python exited ${code}`}`)); try { resolve(JSON.parse(out)); } catch { reject(new Error('AI review returned invalid data.')); } });
    child.stdin.end(JSON.stringify(input));
  });
}
