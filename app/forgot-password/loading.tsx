export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="bg-muted mx-auto h-8 w-52 animate-pulse rounded-md" />
          <div className="bg-muted mx-auto h-4 w-72 animate-pulse rounded-md" />
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="bg-muted h-3.5 w-20 animate-pulse rounded-md" />
            <div className="bg-muted h-9 w-full animate-pulse rounded-md" />
          </div>
          <div className="bg-muted h-9 w-full animate-pulse rounded-md" />
        </div>
        <div className="bg-muted mx-auto h-4 w-28 animate-pulse rounded-md" />
      </div>
    </main>
  )
}
