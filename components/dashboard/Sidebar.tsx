'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  Network,
  Key,
  Server,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Endpoints', href: '/dashboard/endpoints', icon: Network },
  { name: 'Tokens', href: '/dashboard/tokens', icon: Key },
  { name: 'Providers', href: '/dashboard/providers', icon: Server },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Logs', href: '/dashboard/logs', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white min-h-screen border-r border-slate-700/50">
      <div className="p-6 border-b border-slate-700/50">
        <Link href="/dashboard" className="flex items-center space-x-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Network className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            ModelProxy
          </h1>
        </Link>
      </div>
      <nav className="p-3 space-y-1 mt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              )}
            >
              <item.icon className={cn(
                'mr-3 h-5 w-5 transition-transform',
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-110'
              )} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

