"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";

// Opens the device camera (back camera preferred, for phones/tablets used at
// a front desk) and decodes QR codes live. Deliberately loaded as a small,
// self-contained widget so pages that don't need scanning pay nothing for
// it — QrScanner itself is only imported once the user opens the scanner.
export function QrCameraScanner({
  onScan,
  onClose,
}: {
  onScan: (data: string) => void;
  onClose?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<import("qr-scanner").default | null>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "error" | "no-camera">("starting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("no-camera");
        setError("This browser doesn't support camera access. Type the member code instead.");
        return;
      }

      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !videoRef.current) return;

      // Served from /public so bundler worker-loading quirks can't break
      // the camera in production — see public/qr-scanner-worker.min.js.
      QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

      const hasCamera = await QrScanner.hasCamera().catch(() => false);
      if (cancelled) return;
      if (!hasCamera) {
        setStatus("no-camera");
        setError("No camera found on this device. Type the member code instead.");
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const text = typeof result === "string" ? result : result.data;
          if (text) {
            scanner.stop();
            onScan(text.trim());
          }
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );
      scannerRef.current = scanner;

      try {
        await scanner.start();
        if (!cancelled) setStatus("scanning");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(
            err instanceof Error && /permission|denied/i.test(err.message)
              ? "Camera access was denied. Allow camera access in your browser settings, or type the member code instead."
              : "Couldn't start the camera. Type the member code instead."
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [onScan]);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--dg-line)] bg-black/5 p-3">
      <div className="relative aspect-square w-full max-w-xs mx-auto overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80">
            Starting camera…
          </div>
        )}
      </div>
      {(status === "error" || status === "no-camera") && error && (
        <p className="text-center text-xs text-red-600">{error}</p>
      )}
      {status === "scanning" && (
        <p className="text-center text-xs text-[var(--dg-slate)]">Point the camera at the member&rsquo;s QR code</p>
      )}
      {onClose && (
        <Button type="button" variant="ghost" size="sm" className="w-full justify-center" onClick={onClose}>
          Cancel
        </Button>
      )}
    </div>
  );
}
