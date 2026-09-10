"use client";

import { useActionState } from "react";
import { changeMyPassword, type ProfileState } from "./actions";
import { Button, Input } from "@/components/ui/primitives";

const initialState: ProfileState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeMyPassword, initialState);
  return (
    <form action={formAction} className="max-w-xs space-y-3">
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-600">{state.success}</p>}
      <Input label="New password" name="newPassword" type="password" required minLength={6} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
