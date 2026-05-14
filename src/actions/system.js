import { execPowerShell } from './windows/session.js';

export async function runSystem(action) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[system:mac-stub] would do: ${action}`);
      return;
    case 'win32':
      return execPowerShell(buildSystemScript(action));
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function buildSystemScript(action) {
  switch (action) {
    case 'sleep':
      return 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
    case 'back':
      return `[System.Windows.Forms.SendKeys]::SendWait('{ESC}')`;
    default:
      throw new Error(`Unknown system action: ${action}`);
  }
}
