import { CalendarDays, FileText, ArrowRight, History, UserCheck } from "lucide-react"
import Link from "next/link"

const tools = [
  {
    name: "Service Reports",
    description: "Generate formatted reports for church services with volunteer counts, congregation data, and altar calls.",
    href: "/tools/reports",
    icon: FileText,
    available: true,
  },
  {
    name: "Reports History",
    description: "Browse and review all saved service reports from Firestore.",
    href: "/tools/reports-history",
    icon: History,
    available: true,
  },
  {
    name: "Assign",
    description: "Open the assignment tool for service block allocation and counters.",
    href: "/tools/assign",
    icon: UserCheck,
    available: true,
  },
  {
    name: "Events (Experimental)",
    description: "Access external event management from sc.gms.church with web authentication.",
    href: "/tools/events",
    icon: CalendarDays,
    available: true,
  },
]

export default function ToolsPage() {
  return (
    <div className="max-w-3xl animate-stagger">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-foreground leading-[1.1]">
          Your tools
        </h1>
        <p className="mt-3 text-muted-foreground text-base max-w-md leading-relaxed">
          Everything you need to manage and document your ministry services.
        </p>
      </div>

      <div className="grid gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.available ? tool.href : "#"}
            className={`group relative flex items-start gap-5 rounded-xl border border-border/70 bg-card p-6 transition-all duration-200 ${
              tool.available
                ? "hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <tool.icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                  {tool.name}
                </h2>
                {!tool.available && (
                  <span className="text-[10px] font-medium tracking-[0.06em] uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {tool.description}
              </p>
            </div>
            {tool.available && (
              <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
