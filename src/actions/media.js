export async function pressMedia(action) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[media:mac-stub] would press: ${action}`);
      return;
    case 'win32':
      throw new Error('Windows media not implemented yet');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
