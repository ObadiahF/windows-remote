import { execPowerShell, psSingleQuote, escapeSendKeys } from './windows/session.js';

const DIRECTION_TO_SENDKEY = {
  up: '{UP}',
  down: '{DOWN}',
  left: '{LEFT}',
  right: '{RIGHT}',
  select: '{ENTER}',
};

export async function pressDirection(key) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[direction:mac-stub] would press: ${key}`);
      return;
    case 'win32':
      return execPowerShell(
        `[System.Windows.Forms.SendKeys]::SendWait('${DIRECTION_TO_SENDKEY[key]}')`,
      );
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export async function typeText(text) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[keyboard:type:mac-stub] would type: ${JSON.stringify(text)}`);
      return;
    case 'win32':
      return execPowerShell(
        `[System.Windows.Forms.SendKeys]::SendWait(${psSingleQuote(escapeSendKeys(text))})`,
      );
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export async function pressBackspace() {
  switch (process.platform) {
    case 'darwin':
      console.log('[keyboard:backspace:mac-stub] would press backspace');
      return;
    case 'win32':
      return execPowerShell(`[System.Windows.Forms.SendKeys]::SendWait('{BS}')`);
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
