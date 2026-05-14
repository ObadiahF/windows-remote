export async function runSystem(action) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[system:mac-stub] would do: ${action}`);
      return;
    case 'win32':
      throw new Error('Windows system not implemented yet');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
