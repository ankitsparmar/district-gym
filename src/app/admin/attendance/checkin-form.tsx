"use client";

import { useActionState } from "react";
import { checkInByCode, type CheckInState } from "./actions";
import { Button, Input } from "@/components/ui/primitives";

const initialState: CheckInState = {};

export function CheckInForm() {
  const [state, formAction, pending] = useActionState(checkInByCode, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="method" value="QR" />
      <div className="flex-1">
        <Input
          key={state.success ?? state.error ?? "init"}
          label="Scan or type member code"
          name="code"
          placeholder="DG-2026-0001"
          autoComplete="off"
          autoFocus
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Checking in…" : "Check in"}
      </Button>
    </form>
  );
}
