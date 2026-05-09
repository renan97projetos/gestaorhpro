import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, ZoomIn, ZoomOut, Crosshair, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUrl?: string | null;
  onSave: (file: File) => Promise<void>;
};

const OUT_SIZE = 512;

export function LogoEditorDialog({ open, onOpenChange, currentUrl, onSave }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // -1..1 do tamanho de saída
  const [offsetY, setOffsetY] = useState(0);
  const [hasImage, setHasImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Ao abrir com logo atual, carrega
  useEffect(() => {
    if (!open) return;
    setZoom(1); setOffsetX(0); setOffsetY(0);
    if (currentUrl) {
      loadFromUrl(currentUrl);
    } else {
      imgRef.current = null;
      setHasImage(false);
      drawEmpty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUrl]);

  // Redesenha sempre que muda algo
  useEffect(() => { if (hasImage) draw(); }, [zoom, offsetX, offsetY, hasImage]);

  function drawEmpty() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawCheckerboard(ctx, c.width, c.height);
  }

  function loadFromUrl(url: string) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setHasImage(true);
      // auto-fit inicial: cabe todo o conteúdo dentro
      autoFit(img);
    };
    img.onerror = () => toast.error("Não foi possível carregar a logo atual");
    img.src = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  function autoFit(img: HTMLImageElement) {
    const ratio = OUT_SIZE / Math.max(img.naturalWidth, img.naturalHeight);
    setZoom(ratio);
    setOffsetX(0);
    setOffsetY(0);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setHasImage(true);
      autoFit(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { toast.error("Imagem inválida"); URL.revokeObjectURL(url); };
    img.src = url;
  }

  function draw() {
    const c = canvasRef.current; const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawCheckerboard(ctx, c.width, c.height);

    const drawW = img.naturalWidth * zoom;
    const drawH = img.naturalHeight * zoom;
    const cx = c.width / 2 + offsetX * c.width;
    const cy = c.height / 2 + offsetY * c.height;
    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

    // borda
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, c.width - 1, c.height - 1);
  }

  function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const s = 12;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        const dark = ((x / s) + (y / s)) % 2 === 0;
        ctx.fillStyle = dark ? "#1f2937" : "#374151";
        ctx.fillRect(x, y, s, s);
      }
    }
  }

  // Drag para reposicionar
  function onMouseDown(e: React.MouseEvent) {
    if (!hasImage) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const dx = (e.clientX - dragStart.current.x) / rect.width;
    const dy = (e.clientY - dragStart.current.y) / rect.height;
    setOffsetX(Math.max(-1, Math.min(1, dragStart.current.ox + dx)));
    setOffsetY(Math.max(-1, Math.min(1, dragStart.current.oy + dy)));
  }
  function onMouseUp() { setDragging(false); }

  function onWheel(e: React.WheelEvent) {
    if (!hasImage) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.05, Math.min(8, z * factor)));
  }

  function centralizar() {
    const img = imgRef.current; if (!img) return;
    autoFit(img);
  }

  async function salvar() {
    const img = imgRef.current; if (!img) { toast.error("Selecione uma imagem"); return; }
    setSaving(true);
    try {
      const out = document.createElement("canvas");
      out.width = OUT_SIZE; out.height = OUT_SIZE;
      const octx = out.getContext("2d"); if (!octx) throw new Error("Canvas indisponível");
      octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = "high";
      const drawW = img.naturalWidth * zoom;
      const drawH = img.naturalHeight * zoom;
      const cx = OUT_SIZE / 2 + offsetX * OUT_SIZE;
      const cy = OUT_SIZE / 2 + offsetY * OUT_SIZE;
      octx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      const blob: Blob | null = await new Promise((r) => out.toBlob((b) => r(b), "image/png", 0.95));
      if (!blob) throw new Error("Falha ao gerar imagem");
      const file = new File([blob], `logo-${Date.now()}.png`, { type: "image/png" });
      await onSave(file);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar logo da empresa</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Preview */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={288}
              height={288}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onWheel={onWheel}
              className="rounded-lg cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: "none" }}
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" /> {hasImage ? "Trocar imagem" : "Escolher imagem"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={onPickFile}
            />
            <Button variant="outline" size="sm" onClick={centralizar} disabled={!hasImage}>
              <Crosshair className="h-3.5 w-3.5 mr-1" /> Centralizar
            </Button>
          </div>

          {/* Zoom */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Zoom</span>
              <span>{zoom.toFixed(2)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.05, z * 0.9))} disabled={!hasImage}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Slider
                value={[zoom * 100]}
                min={5}
                max={400}
                step={1}
                onValueChange={(v) => setZoom(v[0] / 100)}
                disabled={!hasImage}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(8, z * 1.1))} disabled={!hasImage}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Arraste a imagem para reposicionar. Use a roda do mouse para zoom rápido.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={!hasImage || saving}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Salvando...</> : "Salvar logo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
