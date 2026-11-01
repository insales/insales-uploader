export default async function openBrowser(url) {
  try {
    const {default: open} = await import('open');
    await open(url);
  } catch { /* Opening the preview is optional. */ }
}
