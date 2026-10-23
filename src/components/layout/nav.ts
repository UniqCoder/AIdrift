import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  FileBarChart,
  FileSignature,
  FlaskConical,
  Ghost,
  GitCompareArrows,
  GitPullRequestArrow,
  KeyRound,
  LayoutDashboard,
  Network,
  Plug,
  Settings,
  ShieldAlert,
  ShieldBan,
  Waypoints,
  Radar,
  Presentation,
  Play,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Your workflow", items: [
    { to: "/demo", label: "Guided workflow", icon: Play },
    { to: "/activity", label: "Executed activity", icon: Activity },
    { to: "/incidents", label: "Findings & investigation", icon: ShieldAlert },
    { to: "/reports", label: "Evidence & reports", icon: FileBarChart },
  ] },
  { group: "Explore & configure", items: [
    { to: "/lab", label: "Advanced lab", icon: FlaskConical },
    { to: "/settings", label: "Settings", icon: Settings },
  ] },
];

export const ILLUSTRATIVE_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Monitor",
    items: [
      { to: "/dashboard", label: "Command Center", icon: LayoutDashboard },
      { to: "/agents", label: "Agent Fleet", icon: Bot },
      { to: "/analytics", label: "Behavioral Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Investigate",
    items: [
      { to: "/drift", label: "Identity Drift", icon: GitCompareArrows },
      { to: "/threat-graph", label: "Provenance Graph", icon: Network },
      { to: "/ghost-replay", label: "Ghost Replay", icon: Ghost },
    ],
  },
  {
    group: "Defend",
    items: [
      { to: "/containment", label: "Containment", icon: ShieldBan },
      { to: "/credentials", label: "Credential Integrity", icon: KeyRound },
      { to: "/decoys", label: "D3COY Mesh", icon: Radar },
      { to: "/data-flow", label: "Data Flow Guard", icon: Waypoints },
    ],
  },
  {
    group: "Govern",
    items: [
      { to: "/contracts", label: "Role Contracts", icon: FileSignature },
      { to: "/changes", label: "Change Registry", icon: GitPullRequestArrow },
    ],
  },
  {
    group: "Workspace",
    items: [
      { to: "/showcase", label: "System Preview", icon: Presentation },
      { to: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
];

export const ALL_NAV = [...NAV, ...ILLUSTRATIVE_NAV].flatMap((g) => g.items);
export const BrandIcon = Boxes;
