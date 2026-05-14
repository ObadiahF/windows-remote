import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const COMMAND_TIMEOUT_MS = 8_000;

const SETUP_SCRIPT = `
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Windows.Forms | Out-Null

$sig = @'
[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
[DllImport("user32.dll")] public static extern int LockWorkStation();
'@
Add-Type -MemberDefinition $sig -Name 'Win32' -Namespace 'LR' | Out-Null

function Send-Vk { param([byte]$vk)
  [LR.Win32]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 30
  [LR.Win32]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
}
`;

let session = null;

export function execPowerShell(script) {
  return ensureSession().exec(script);
}

export function closeSession() {
  if (session) {
    session.proc.kill();
    session = null;
  }
}

function ensureSession() {
  if (session && !session.dead) return session;
  session = createSession();
  return session;
}

function createSession() {
  const proc = spawn(
    'powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '-'],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  );

  const pending = new Map();
  let stdoutBuf = '';

  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  proc.stdout.on('data', (chunk) => {
    stdoutBuf += chunk;
    let match;
    const pattern = /__(DONE|ERR)_([a-f0-9]{32})__([^\n]*)\n/;
    while ((match = pattern.exec(stdoutBuf))) {
      const [full, kind, id, tail] = match;
      stdoutBuf = stdoutBuf.slice(match.index + full.length);
      const entry = pending.get(id);
      if (!entry) continue;
      pending.delete(id);
      clearTimeout(entry.timer);
      if (kind === 'DONE') entry.resolve();
      else entry.reject(new Error(`PowerShell error: ${tail.trim() || 'unknown'}`));
    }
  });

  proc.stderr.on('data', (chunk) => {
    console.error('[ps:stderr]', chunk.trim());
  });

  proc.on('exit', (code, signal) => {
    console.error(`[ps] session exited (code=${code} signal=${signal})`);
    if (session) session.dead = true;
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(new Error('PowerShell session terminated'));
    }
    pending.clear();
  });

  proc.stdin.write(SETUP_SCRIPT + '\n');

  return {
    proc,
    dead: false,
    exec(script) {
      const id = randomUUID().replace(/-/g, '');
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            reject(new Error('PowerShell command timeout'));
          }
        }, COMMAND_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer });
        const wrapped = `try {\n${script}\n} catch { Write-Host ("__ERR_${id}__" + $_.Exception.Message) }\nWrite-Host "__DONE_${id}__"\n`;
        proc.stdin.write(wrapped);
      });
    },
  };
}

export function psSingleQuote(text) {
  return "'" + String(text).replace(/'/g, "''") + "'";
}

export function escapeSendKeys(text) {
  return String(text).replace(/[+^%~(){}\[\]]/g, (c) => `{${c}}`);
}
