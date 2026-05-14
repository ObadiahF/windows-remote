import { execPowerShell, psSingleQuote } from './windows/session.js';

const DIRECTION_VK = {
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,
  select: 0x0D,
};

export async function pressDirection(key) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[direction:mac-stub] would press: ${key}`);
      return;
    case 'win32':
      return execPowerShell(`Send-Vk ${DIRECTION_VK[key]}`);
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
      return execPowerShell(`Type-Text ${psSingleQuote(text)}`);
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
      return execPowerShell('Send-Vk 0x08');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
