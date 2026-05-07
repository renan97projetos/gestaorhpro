// Utilitário client-side para "auto-ajustar" uma imagem antes do upload.
// - Detecta o bounding box do conteúdo (ignora pixels totalmente transparentes
//   e bordas brancas/quase-brancas) — útil para logos com muito espaço em branco.
// - Centraliza num canvas quadrado com pequeno padding.
// - Exporta como PNG (preserva transparência) com tamanho máximo controlado.
//
// Sem dependência externa — usa <canvas> nativo do navegador.

export type AutoFitOptions = {
  size?: number; // tamanho final do quadrado (px). Default 512.
  padding?: number; // % de margem em volta do conteúdo. Default 0.08 (8%).
  background?: string | null; // cor de fundo; null = transparente. Default null.
  whiteThreshold?: number; // 0-255 — pixels acima são considerados "branco". Default 245.
  alphaThreshold?: number; // 0-255 — abaixo é considerado transparente. Default 8.
  format?: "image/png" | "image/jpeg" | "image/webp"; // Default png.
  quality?: number; // 0-1 (jpeg/webp). Default 0.92.
};

export async function autoFitImage(file: File, opts: AutoFitOptions = {}): Promise<File> {
  const {
    size = 512,
    padding = 0.08,
    background = null,
    whiteThreshold = 245,
    alphaThreshold = 8,
    format = "image/png",
    quality = 0.92,
  } = opts;

  // Carrega a imagem
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    // Canvas auxiliar para ler pixels e calcular bounding box
    const work = document.createElement("canvas");
    work.width = img.naturalWidth;
    work.height = img.naturalHeight;
    const wctx = work.getContext("2d", { willReadFrequently: true });
    if (!wctx) throw new Error("Canvas indisponível");
    wctx.drawImage(img, 0, 0);

    let bbox: { x: number; y: number; w: number; h: number };
    try {
      const data = wctx.getImageData(0, 0, work.width, work.height).data;
      bbox = computeBBox(data, work.width, work.height, alphaThreshold, whiteThreshold);
    } catch {
      // CORS / tainted canvas — fallback: usa a imagem inteira
      bbox = { x: 0, y: 0, w: work.width, h: work.height };
    }

    // Canvas final: quadrado size x size, conteúdo centralizado com padding
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const octx = out.getContext("2d");
    if (!octx) throw new Error("Canvas indisponível");

    if (background) {
      octx.fillStyle = background;
      octx.fillRect(0, 0, size, size);
    }

    const inner = size * (1 - padding * 2);
    const scale = Math.min(inner / bbox.w, inner / bbox.h);
    const drawW = bbox.w * scale;
    const drawH = bbox.h * scale;
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;

    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(img, bbox.x, bbox.y, bbox.w, bbox.h, dx, dy, drawW, drawH);

    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob((b) => resolve(b), format, quality),
    );
    if (!blob) throw new Error("Falha ao gerar imagem");

    const ext = format === "image/jpeg" ? "jpg" : format === "image/webp" ? "webp" : "png";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}-fit.${ext}`, { type: format });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

function computeBBox(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  alphaThreshold: number,
  whiteThreshold: number,
): { x: number; y: number; w: number; h: number } {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < alphaThreshold) continue;
      // Ignorar pixels brancos (logos com fundo branco têm muita borda assim)
      if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) {
    // Imagem totalmente transparente/branca — usa tudo
    return { x: 0, y: 0, w, h };
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
