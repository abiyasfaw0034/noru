import { Building2 } from "lucide-react";
import Link from "next/link";

export function NoHotelState() {
  return (
    <section className="panel">
      <div className="empty-state">
        <div>
          <Building2 aria-hidden size={28} />
          <strong>Create a hotel first</strong>
          <span>Hotels own employees, departments, roles, shifts, and attendance records.</span>
          <Link className="button primary" href="/hotels">
            Add hotel
          </Link>
        </div>
      </div>
    </section>
  );
}
