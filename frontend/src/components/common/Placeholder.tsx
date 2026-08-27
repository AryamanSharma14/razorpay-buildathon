export function Placeholder({ name }: { name: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold">{name}</h1>
      <p className="mt-2 text-sm text-text-muted">
        View scaffolded. Built in a later phase.
      </p>
    </div>
  )
}
