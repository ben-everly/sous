export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="bg-muted mx-auto h-8 w-44 animate-pulse rounded-md" />
          <div className="bg-muted mx-auto h-4 w-64 animate-pulse rounded-md" />
        </div>
        <div className="bg-muted h-9 w-full animate-pulse rounded-md" />
      </div>
    </main>
  )
}
