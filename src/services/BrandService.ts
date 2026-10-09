// ======================================================================
// T-CAR 2.1 — Identidade visual dos documentos gerados (PDF e Excel)
// ======================================================================
// Cores tiradas da logo oficial (verde e vermelho dos marcadores do
// cronômetro) e a própria logo, carregada uma vez e reaproveitada.
// ======================================================================

export const BRAND = {
  green: '#006633',
  greenDark: '#003319',
  greenSoft: '#E8F2EC',
  zebra: '#F4F8F5',
  red: '#C8102E',
  text: '#1E2A22',
  muted: '#5B6B61',
  border: '#D9E2DC',
  tagline: 'Carminatti intermittent test',
} as const;

// Logo oficial (fundo branco, 192 px) — também está no cache do PWA
const LOGO_URL = '/pwa-192x192.png';
export const LOGO_PX = 192;

let logoPromise: Promise<Blob | null> | null = null;

/** A logo como Blob, ou null se não carregar (o documento sai sem ela) */
export function loadLogo(): Promise<Blob | null> {
  if (!logoPromise) {
    logoPromise = fetch(LOGO_URL)
      .then(r => (r.ok ? r.blob() : null))
      .catch(() => null);
  }
  return logoPromise;
}

/** A logo como data URL PNG, para o jsPDF */
export async function loadLogoDataUrl(): Promise<string | null> {
  const blob = await loadLogo();
  if (!blob) return null;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:image/png;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/** "#006633" → [0, 102, 51], para o jsPDF */
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
