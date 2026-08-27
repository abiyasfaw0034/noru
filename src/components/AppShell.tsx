import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Briefcase,
  LogOut,
  Hotel,
  LayoutDashboard,
  Network,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { logout, selectHotel } from "@/app/actions";
import { getHotelContext } from "@/lib/tenant";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/hotels",
    label: "Hotels",
    icon: Building2,
  },
  {
    href: "/employees",
    label: "Employees",
    icon: UsersRound,
  },
  {
    href: "/departments",
    label: "Departments",
    icon: Network,
  },
  {
    href: "/roles",
    label: "Roles",
    icon: Briefcase,
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: CalendarClock,
  },
  {
    href: "/attendance",
    label: "Attendance",
    icon: ClipboardCheck,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
  },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { activeHotel, hotels, user } = await getHotelContext();

  if (!user) {
    return <main className="auth-content">{children}</main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Hotel aria-hidden size={22} />
          </span>
          <span>
            <strong>Noru</strong>
            <small>Hotel Ops</small>
          </span>
        </Link>

        <div className="user-panel">
          <span>{user.systemRole === "SUPER_ADMIN" ? "Super admin" : "Hotel user"}</span>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
        </div>

        <form action={selectHotel} className="hotel-switcher">
          <label htmlFor="activeHotel">Active hotel</label>
          <div>
            <select
              defaultValue={activeHotel?.id ?? ""}
              disabled={hotels.length === 0}
              id="activeHotel"
              name="hotelId"
            >
              {hotels.length === 0 ? <option value="">No hotels</option> : null}
              {hotels.map((hotelItem) => (
                <option key={hotelItem.id} value={hotelItem.id}>
                  {hotelItem.name}
                </option>
              ))}
            </select>
            <button aria-label="Switch active hotel" disabled={hotels.length === 0} type="submit">
              <Building2 aria-hidden size={16} />
            </button>
          </div>
        </form>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link className="nav-link" href={item.href} key={item.href}>
                <Icon aria-hidden size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action={logout} className="logout-form">
          <button className="nav-link" type="submit">
            <LogOut aria-hidden size={18} />
            Sign out
          </button>
        </form>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
