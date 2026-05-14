import { execPowerShell, psSingleQuote } from './windows/session.js';

export async function pasteText(text) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[paste:mac-stub] would paste: ${JSON.stringify(text)}`);
      return;
    case 'win32':
      return execPowerShell(
        `Set-Clipboard -Value ${psSingleQuote(text)}; [System.Windows.Forms.SendKeys]::SendWait('^v')`,
      );
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
