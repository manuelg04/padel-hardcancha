import { Signal, Wifi } from "lucide-react";

export function PlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell player-frame">
      <section className="phone">
        <div className="phone-notch" />
        <div className="phone-statusbar">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <Signal size={14} strokeWidth={2.4} />
            <Wifi size={14} strokeWidth={2.4} />
            <span className="text-xs">5G</span>
          </span>
        </div>
        <div className="phone-screen">{children}</div>
      </section>
    </main>
  );
}
