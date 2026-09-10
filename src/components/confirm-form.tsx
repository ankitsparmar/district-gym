"use client";

import type { ReactNode } from "react";

// A <form> that asks for a native confirm() before letting its Server
// Action submit go through. Small and dependency-free on purpose — used
// for the handful of destructive actions in the admin (e.g. deleting a
// membership) that don't warrant a full modal.
export function ConfirmForm({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => void;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
