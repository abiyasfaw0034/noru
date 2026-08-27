"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
};

export function SubmitButton({ children, pendingLabel = "Saving", className }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className ?? "button primary"} disabled={pending} type="submit">
      {pending ? <Loader2 aria-hidden className="spin" size={16} /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
