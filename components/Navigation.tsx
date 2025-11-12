'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Network } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/features' },
    { name: 'About', href: '/about' },
    { name: 'Team', href: '/team' },
    { name: 'Contact', href: '/contact' },
  ]

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <Network className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">ModelProxy</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300',
                  isActive
                    ? 'bg-white/20 text-white backdrop-blur-md border border-white/30'
                    : 'text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </div>

        <Link
          href="/login"
          className="px-6 py-2.5 bg-white/10 backdrop-blur-md text-white rounded-lg font-medium hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/30"
        >
          Sign In
        </Link>
      </div>
    </nav>
  )
}

