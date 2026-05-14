export async function pressDirection(key) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[direction:mac-stub] would press: ${key}`);
      return;
    case 'win32':
      throw new Error('Windows direction not implemented yet');
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
      throw new Error('Windows keyboard:type not implemented yet');
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
      throw new Error('Windows keyboard:backspace not implemented yet');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
