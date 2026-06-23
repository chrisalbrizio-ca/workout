// Health Auto Export Loader - Clean Git folder
const HEALTH_PATH = 'iCloud~com~ifunography~HealthExport/Documents/Git';

export async function loadHealthExport() {
  // For now we use manual file input.
  // Future: Try to auto-read from known path if possible in browser context
  return null;
}

export function setupHealthLoader(onLoadCallback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      onLoadCallback(data);
    } catch (err) {
      alert('Failed to load Health export: ' + err.message);
    }
  };

  return () => input.click();
}