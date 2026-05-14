import { execPowerShell } from './windows/session.js';

const MEDIA_VK = {
  play_pause: 0xB3,
  volume_up: 0xAF,
  volume_down: 0xAE,
  mute: 0xAD,
};

export async function pressMedia(action) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[media:mac-stub] would press: ${action}`);
      return;
    case 'win32':
      return execPowerShell(`Send-Vk ${MEDIA_VK[action]}`);
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
