import Link from 'next/link'
import { Network } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative py-12 px-6 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ModelProxy</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
            <p className="text-white/60 text-sm">
              © 2024-2025 <a href="https://aljasem.eu.org" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors underline">Mohamad AlJasem</a>
            </p>
            <span className="hidden md:inline text-white/40">•</span>
            <a href="https://aljasem.eu.org" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white text-sm transition-colors">
              aljasem.eu.org
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

