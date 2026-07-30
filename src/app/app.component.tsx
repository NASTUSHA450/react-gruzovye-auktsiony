export function App() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-12 text-ink">
      <section className="w-full max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-card sm:p-10">
        <p className="mb-3 text-sm font-semibold tracking-wide text-brand uppercase">
          Frontend test assignment
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Грузовые аукционы
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted">
          SPA для просмотра грузовых аукционов, истории ставок и управления
          своей ставкой.
        </p>
        <div className="mt-8 flex flex-wrap gap-2 text-sm">
          {['React', 'TypeScript', 'Tailwind CSS'].map((technology) => (
            <span
              className="rounded-full border border-line bg-canvas px-3 py-1.5"
              key={technology}
            >
              {technology}
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}
