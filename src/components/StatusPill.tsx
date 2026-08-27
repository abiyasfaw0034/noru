import clsx from "clsx";

import { statusLabels } from "@/lib/constants";

type StatusPillProps = {
  status: string;
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={clsx("status-pill", `status-${status.toLowerCase()}`)}>
      {statusLabels[status] ?? status}
    </span>
  );
}
