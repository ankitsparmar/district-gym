"use client";

import { useActionState } from "react";
import { sendManualPaymentReminderSms, type SmsReminderState } from "./actions";
import { MessageSquare } from "lucide-react";

const initialState: SmsReminderState = {};

// Compact per-row action for the members table: fires an ad-hoc "your
// payment is due" SMS via the manual reminder server action and shows the
// result inline, without navigating away from the list.
export function SmsReminderButton({ memberId, disabled, disabledReason }: { memberId: number; disabled?: boolean; disabledReason?: string }) {
  const [state, formAction, pending] = useActionState(sendManualPaymentReminderSms, initialState);

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="memberId" value={memberId} />
        <button
          type="submit"
          disabled={disabled || pending}
          title={disabled ? disabledReason : "Send a payment reminder SMS now"}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--dg-line)] px-2 py-1 text-xs font-medium text-[var(--dg-slate)] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MessageSquare size={13} />
          {pending ? "Sending…" : "SMS reminder"}
        </button>
      </form>
      {state.success && <p className="text-[11px] font-medium text-emerald-600">{state.success}</p>}
      {state.error && <p className="max-w-[220px] text-[11px] font-medium text-red-600">{state.error}</p>}
    </div>
  );
}
