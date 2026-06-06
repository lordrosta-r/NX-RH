import { useRef, useEffect, useCallback } from "react";
import { Eraser } from "lucide-react";

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 140;
const LINE_WIDTH = 2;
const LINE_COLOR = "#1c1b1b";

export interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void;
  disabled?: boolean;
  value?: string | null;
  label?: string;
}

export default function SignaturePad({
  onChange,
  disabled = false,
  value,
  label,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const getCtx = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const initCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Mount: fix pixel resolution, paint white, then draw value if provided
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    initCanvas(ctx);

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      };
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCanvasPos = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      isDrawingRef.current = true;
      const { x, y } = getCanvasPos(canvas, clientX, clientY);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [disabled, getCtx],
  );

  const draw = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawingRef.current || disabled) return;
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      const { x, y } = getCanvasPos(canvas, clientX, clientY);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [disabled, getCtx],
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange?.(canvas.toDataURL("image/png"));
  }, [onChange]);

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startDrawing(e.clientX, e.clientY);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    draw(e.clientX, e.clientY);
  };
  const onMouseUp = () => stopDrawing();
  const onMouseLeave = () => stopDrawing();

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) startDrawing(touch.clientX, touch.clientY);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) draw(touch.clientX, touch.clientY);
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  };

  const handleClear = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    initCanvas(ctx);
    onChange?.(null);
  }, [getCtx, initCanvas, onChange]);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          border: "1px solid var(--line, #e2e8f0)",
          borderRadius: "var(--radius, 6px)",
          background: "#ffffff",
          cursor: disabled ? "default" : "crosshair",
          touchAction: "none",
          display: "block",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        aria-label={label ?? "Zone de signature"}
        role="img"
      />
      {!disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-sm rounded-md bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 self-start"
        >
          <Eraser size={14} aria-hidden />
          Effacer
        </button>
      )}
    </div>
  );
}
