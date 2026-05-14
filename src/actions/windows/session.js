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

function Get-AudioState {
  $muted = [LRAudio.Audio]::IsMuted()
  Write-Output (@{ muted = $muted } | ConvertTo-Json -Compress)
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
      const output = stdoutBuf.slice(0, match.index);
      stdoutBuf = stdoutBuf.slice(match.index + full.length);
      const entry = pending.get(id);
      if (!entry) continue;
      pending.delete(id);
      clearTimeout(entry.timer);
      if (kind === 'DONE') entry.resolve(output);
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
