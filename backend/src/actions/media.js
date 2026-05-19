import { execPowerShell } from './windows/session.js';

const MEDIA_VK = {
  play_pause: 0xB3,
  volume_up: 0xAF,
  volume_down: 0xAE,
  mute: 0xAD,
  next_track: 0xB0,
  prev_track: 0xB1,
};

let macFakeMuted = false;

export async function pressMedia(action) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[media:mac-stub] would press: ${action}`);
      if (action === 'mute') macFakeMuted = !macFakeMuted;
      else if (action === 'volume_up' || action === 'volume_down') macFakeMuted = false;
      return;
    case 'win32':
      return execPowerShell(`Send-Vk ${MEDIA_VK[action]}`);
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export async function getMuteState() {
  switch (process.platform) {
    case 'darwin':
      return { muted: macFakeMuted };
    case 'win32': {
      const output = await execPowerShell('Get-AudioState');
      const parsed = JSON.parse(output.trim());
      return { muted: Boolean(parsed.muted) };
    }
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
