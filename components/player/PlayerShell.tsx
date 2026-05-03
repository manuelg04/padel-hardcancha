export function PlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell player-shell">
      <section className="player-surface">
        <div className="player-screen">{children}</div>
      </section>
    </main>
  );
}
