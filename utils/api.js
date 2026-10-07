export async function processImage(payload) {
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `A API Python respondeu com HTTP ${response.status}.`);
  }

  return result;
}