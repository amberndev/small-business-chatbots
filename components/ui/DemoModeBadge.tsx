import { ui, type Lang } from "@/lib/i18n";
export function DemoModeBadge({ demoMode, lang = "en" }: { demoMode: boolean | null; lang?: Lang }) {
  const strings = ui[lang];
  return <span className="mode-badge">{demoMode === null ? strings.modePending : demoMode ? strings.demoMode : strings.liveMode}</span>;
}
