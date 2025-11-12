import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { SessionGuard } from '@/components/dashboard/SessionGuard'
import Link from 'next/link'

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
          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm px-6 py-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span>© 2024-2025</span>
                <Link 
                  href="https://aljasem.eu.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  Mohamad AlJasem
                </Link>
              </div>
              <Link 
                href="https://aljasem.eu.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                aljasem.eu.org
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </SessionGuard>
  )
}

