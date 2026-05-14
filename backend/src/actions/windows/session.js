import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DEBUG = process.env.PS_DEBUG === '1';
const COMMAND_TIMEOUT_MS = 10_000;
const READY_TIMEOUT_MS = 45_000;
const READY_MARKER = '__SESSION_READY__';
const SCRIPT_PATH = join(tmpdir(), 'lr-session.ps1');

function log(tag, ...args) {
  console.log(`[ps:${tag}]`, ...args);
}
function dbg(tag, ...args) {
  if (DEBUG) console.log(`[ps:${tag}]`, ...args);
}

// PowerShell script: setup, then a read-execute loop on stdin.
// Uses string concatenation (not "${var}") to avoid JS template conflicts.
const PS_SCRIPT = `
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Windows.Forms | Out-Null

$sig = @'
[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
[DllImport("user32.dll")] public static extern short VkKeyScanW(char ch);
[DllImport("user32.dll")] public static extern int LockWorkStation();
'@
Add-Type -MemberDefinition $sig -Name 'Win32' -Namespace 'LR' | Out-Null

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace LRAudio {
  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IAudioEndpointVolume {
    int _0(); int _1(); int _2(); int _3(); int _4();
    int _5(); int _6(); int _7(); int _8(); int _9(); int _10(); int _11();
    int GetMute(out bool pbMute);
  }
  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IMMDevice {
    int Activate(ref Guid iid, int clsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
  }
  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IMMDeviceEnumerator {
    int _0();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
  }
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  public class MMDeviceEnumeratorComObject { }
  public static class Audio {
    public static bool IsMuted() {
      var de = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
      IMMDevice dev; de.GetDefaultAudioEndpoint(0, 1, out dev);
      Guid iid = typeof(IAudioEndpointVolume).GUID;
      object o; dev.Activate(ref iid, 23, IntPtr.Zero, out o);
      var vol = (IAudioEndpointVolume)o;
      bool m; vol.GetMute(out m);
      return m;
    }
  }
}
'@ | Out-Null

function Send-Vk { param([byte]$vk)
  [LR.Win32]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 30
  [LR.Win32]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
}

function Send-Chord { param([byte[]]$modifiers, [byte]$vk)
  foreach ($m in $modifiers) { [LR.Win32]::keybd_event($m, 0, 0, [UIntPtr]::Zero) }
  [LR.Win32]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 30
  [LR.Win32]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
  foreach ($m in $modifiers) { [LR.Win32]::keybd_event($m, 0, 2, [UIntPtr]::Zero) }
}

function Type-Text { param([string]$text)
  foreach ($c in $text.ToCharArray()) {
    $vks = [LR.Win32]::VkKeyScanW($c)
    $vk = [byte]($vks -band 0xFF)
    $shift = ($vks -shr 8) -band 0xFF
    if ($shift -band 1) { [LR.Win32]::keybd_event(0x10, 0, 0, [UIntPtr]::Zero) }
    if ($shift -band 2) { [LR.Win32]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero) }
    if ($shift -band 4) { [LR.Win32]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero) }
    [LR.Win32]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 10
    [LR.Win32]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
    if ($shift -band 4) { [LR.Win32]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero) }
    if ($shift -band 2) { [LR.Win32]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero) }
    if ($shift -band 1) { [LR.Win32]::keybd_event(0x10, 0, 2, [UIntPtr]::Zero) }
  }
}

function Get-AudioState {
  $muted = [LRAudio.Audio]::IsMuted()
  @{ muted = $muted } | ConvertTo-Json -Compress
}

# Signal ready
[Console]::Out.WriteLine('${READY_MARKER}')
[Console]::Out.Flush()

# Command loop: read two lines (id, command), execute, respond
while ($true) {
  $cmdId = [Console]::In.ReadLine()
  if ($cmdId -eq $null) { break }
  $cmdText = [Console]::In.ReadLine()
  if ($cmdText -eq $null) { break }
  try {
    $r = @(Invoke-Expression $cmdText) -join [char]10
    if ($r) { [Console]::Out.WriteLine('__OUT_' + $cmdId + '__' + $r) }
    [Console]::Out.WriteLine('__DONE_' + $cmdId + '__')
  } catch {
    [Console]::Out.WriteLine('__ERR_' + $cmdId + '__' + $_.Exception.Message)
  }
  [Console]::Out.Flush()
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
  writeFileSync(SCRIPT_PATH, PS_SCRIPT);
  log('init', `wrote session script to ${SCRIPT_PATH}`);

  const proc = spawn('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-File', SCRIPT_PATH,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  const pending = new Map();
  const queue = [];          // ordered command IDs for output routing
  let stdoutBuf = '';
  let ready = false;
  let readyResolve;
  let readyReject;
  const readyPromise = new Promise((res, rej) => {
    readyResolve = res;
    readyReject = rej;
  });
  const readyTimer = setTimeout(() => {
    if (!ready) readyReject(new Error('PowerShell session setup timeout'));
  }, READY_TIMEOUT_MS);

  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  proc.stdout.on('data', (chunk) => {
    dbg('stdout:raw', JSON.stringify(chunk));
    stdoutBuf += chunk;

    let nlIdx;
    while ((nlIdx = stdoutBuf.indexOf('\n')) >= 0) {
      const line = stdoutBuf.slice(0, nlIdx).replace(/\r$/, '');
      stdoutBuf = stdoutBuf.slice(nlIdx + 1);

      if (!ready) {
        if (line === READY_MARKER) {
          ready = true;
          clearTimeout(readyTimer);
          log('ready', 'session ready');
          readyResolve();
        }
        continue;
      }

      let m;
      if ((m = line.match(/^__DONE_([a-f0-9]{32})__$/))) {
        finish(m[1], 'done');
      } else if ((m = line.match(/^__ERR_([a-f0-9]{32})__(.*)/))) {
        finish(m[1], 'err', m[2]);
      } else if ((m = line.match(/^__OUT_([a-f0-9]{32})__(.*)/))) {
        const entry = pending.get(m[1]);
        if (entry) entry.output = m[2];
      } else if (line) {
        dbg('stdout:line', line);
      }
    }
  });

  function finish(id, kind, errMsg) {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (queue[0] === id) queue.shift();
    clearTimeout(entry.timer);
    const elapsed = Date.now() - entry.sent;
    if (kind === 'done') {
      log('done', `${entry.label} OK (${elapsed}ms)${entry.output ? ' output=' + entry.output.slice(0, 200) : ''}`);
      entry.resolve(entry.output);
    } else {
      const msg = errMsg || 'unknown';
      log('err', `${entry.label} FAILED (${elapsed}ms): ${msg}`);
      entry.reject(new Error(`PowerShell error: ${msg}`));
    }
  }

  proc.stderr.on('data', (chunk) => {
    log('stderr', chunk.trim());
  });

  proc.on('exit', (code, signal) => {
    log('exit', `code=${code} signal=${signal}`);
    if (session) session.dead = true;
    clearTimeout(readyTimer);
    if (!ready) readyReject(new Error(`PowerShell session exited during setup (code=${code})`));
    for (const [id, { reject, timer, label }] of pending.entries()) {
      clearTimeout(timer);
      log('exit', `cancelling pending command: ${label}`);
      reject(new Error('PowerShell session terminated'));
    }
    pending.clear();
    queue.length = 0;
  });

  return {
    proc,
    dead: false,
    ready: readyPromise,
    async exec(script) {
      await readyPromise;
      const id = randomUUID().replace(/-/g, '');
      const label = script.replace(/\s+/g, ' ').trim().slice(0, 80);
      log('exec', `${label}  (id=${id.slice(0, 8)}…)`);
      return new Promise((resolve, reject) => {
        const sent = Date.now();
        const timer = setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            const idx = queue.indexOf(id);
            if (idx >= 0) queue.splice(idx, 1);
            log('timeout', `${label} after ${COMMAND_TIMEOUT_MS}ms  buf=${stdoutBuf.length} chars pending=${pending.size}`);
            dbg('timeout:buf', JSON.stringify(stdoutBuf.slice(0, 500)));
            reject(new Error(`PowerShell command timeout: ${label}`));
          }
        }, COMMAND_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer, sent, label, output: '' });
        queue.push(id);
        proc.stdin.write(id + '\n' + script + '\n');
      });
    },
  };
}

export function psSingleQuote(text) {
  return "'" + String(text).replace(/'/g, "''") + "'";
}
