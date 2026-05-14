export async function pasteText(text) {
  switch (process.platform) {
    case 'darwin':
      console.log(`[paste:mac-stub] would paste: ${JSON.stringify(text)}`);
      return;
    case 'win32':
      throw new Error('Windows paste not implemented yet');
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
