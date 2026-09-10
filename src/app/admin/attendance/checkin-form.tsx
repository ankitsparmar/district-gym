"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { checkInByCode, type CheckInState } from "./actions";
import { Button, Input } from "@/components/ui/primitives";
import { QrCameraScanner } from "@/components/qr-camera-scanner";
import { Camera } from "lucide-react";

const initialState: CheckInState = {};

export function CheckInForm() {
  const [state, formAction, pending] = useActionState(checkInByCode, initialState);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<"QR" | "MANUAL">("MANUAL");
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the field after a successful check-in. Controlled input, so a
  // remount-via-key trick won't do it — but calling setState during render
  // (React's documented pattern for resetting state when a prop/derived
  // value changes) avoids the extra render an effect would cost here.
  const [lastHandledSuccess, setLastHandledSuccess] = useState(state.success);
  if (state.success !== lastHandledSuccess) {
    setLastHandledSuccess(state.success);
    if (state.success) setCode("");
  }

  function handleScan(data: string) {
    setScanning(false);
    setMethod("QR");
    setCode(data);
    // Submit on the next tick so the input's new value is part of the FormData.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="method" value={method} />
        <div className="flex-1">
          <Input
            label="Scan or type member code"
            name="code"
            placeholder="DG-2026-0001"
            autoComplete="off"
            autoFocus
            value={code}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setCode(e.target.value);
              setMethod("MANUAL");
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setScanning((s) => !s)}>
            <Camera size={16} />
            {scanning ? "Close camera" : "Scan QR"}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Checking in…" : "Check in"}
          </Button>
        </div>
      </form>

      {scanning && (
        <QrCameraScanner
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      )}

      {state.success && <p className="text-sm font-medium text-emerald-600">{state.success}</p>}
      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
    </div>
  );
}
