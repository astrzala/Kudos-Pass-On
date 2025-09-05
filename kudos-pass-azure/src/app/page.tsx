import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6 text-center">
        <h1 className="text-3xl font-bold">Kudos Pass (Azure)</h1>
        <p className="text-gray-600">A lightweight team kudos game with 24h sessions.</p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/create" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Create Session
          </Link>
          <Link href="/join" className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-100">
            Join Session
          </Link>
        </div>
      </div>
    </main>
  );
}

