"use client";

import { useRef, useState, type PointerEvent } from "react";

export function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [dataUrl, setDataUrl] = useState("");

  function getCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function pointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    drawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function pointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#14151a";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  }

  function pointerUp() {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) setDataUrl(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setDataUrl("");
  }

  return (
    <div>
      <div className="rounded-lg border border-dashed border-[var(--dg-line)] bg-white">
        <canvas
          ref={canvasRef}
          width={480}
          height={140}
          className="w-full touch-none rounded-lg"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-[var(--dg-slate)]">
          {hasSignature ? "Signature captured" : "Sign above with your mouse or finger"}
        </p>
        <button type="button" onClick={clear} className="text-xs font-medium text-[var(--dg-accent)]">
          Clear
        </button>
      </div>
      <input type="hidden" name={name} value={dataUrl} />
    </div>
  );
}
