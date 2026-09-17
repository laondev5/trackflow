import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  Search,
  Settings,
  Sun,
  Timer,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/upcoming", label: "Upcoming", icon: CalendarRange },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/board", label: "Board", icon: KanbanSquare },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/completed", label: "Completed", icon: CheckCircle2 },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/stats", label: "Insights", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/upcoming", label: "Upcoming", icon: CalendarRange },
  // FAB sits in the middle
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/browse", label: "Browse", icon: LayoutGrid },
];
