export function DemoModeBadge({ demoMode }: { demoMode: boolean | null }) {
  return <span className="mode-badge">{demoMode === null ? "Mode verified on first reply" : demoMode ? "Demo mode — scripted responses, no live AI" : "Live AI · demonstration business"}</span>;
}
