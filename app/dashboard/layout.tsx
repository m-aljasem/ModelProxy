import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { SessionGuard } from '@/components/dashboard/SessionGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use client-side session guard instead of server-side check
  // This prevents redirect loops when cookies aren't immediately available server-side
  return (
    <SessionGuard>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </div>
    </SessionGuard>
  )
}

