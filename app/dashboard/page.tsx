import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Server, Network, Key, Activity, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Get stats
  const [providersResult, endpointsResult, tokensResult, usageResult, successResult] = await Promise.all([
    supabaseAdmin.from('providers').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('endpoints').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('api_tokens').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'success')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])

  const totalRequests = usageResult.count || 0
  const successRequests = successResult.count || 0
  const successRate = totalRequests > 0 ? Math.round((successRequests / totalRequests) * 100) : 0

  const stats = {
    providers: providersResult.count || 0,
    endpoints: endpointsResult.count || 0,
    tokens: tokensResult.count || 0,
    requests24h: totalRequests,
    successRate,
  }

  const statCards = [
    {
      name: 'Providers',
      value: stats.providers,
      icon: Server,
      gradient: 'from-blue-500 to-cyan-500',
      href: '/dashboard/providers',
    },
    {
      name: 'Endpoints',
      value: stats.endpoints,
      icon: Network,
      gradient: 'from-purple-500 to-pink-500',
      href: '/dashboard/endpoints',
    },
    {
      name: 'API Tokens',
      value: stats.tokens,
      icon: Key,
      gradient: 'from-indigo-500 to-purple-500',
      href: '/dashboard/tokens',
    },
    {
      name: 'Requests (24h)',
      value: stats.requests24h,
      icon: Activity,
      gradient: 'from-green-500 to-emerald-500',
      href: '/dashboard/usage',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here&apos;s what&apos;s happening with your AI infrastructure.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
            <div className="p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.name}</h3>
              <p className="text-3xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Success Rate Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Success Rate (24h)</span>
            </div>
            <p className="text-5xl font-bold mb-2">{stats.successRate}%</p>
            <p className="text-sm opacity-80">
              {successRequests.toLocaleString()} successful requests out of {totalRequests.toLocaleString()} total
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center">
              <Zap className="w-16 h-16 text-white/50" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Network className="w-5 h-5 mr-2 text-indigo-600" />
            Quick Start
          </h2>
          <p className="text-gray-600 mb-6">
            Get started by configuring your first provider and endpoint to start proxying AI requests.
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard/providers"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:from-indigo-100 hover:to-purple-100 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Server className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-gray-900">Add Provider</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
            </Link>
            <Link
              href="/dashboard/endpoints"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Network className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900">Create Endpoint</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
            </Link>
            <Link
              href="/dashboard/tokens"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Key className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">Generate API Token</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-purple-600" />
            System Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">API Health</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Database</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Connected</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Active Providers</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                {stats.providers} Active
              </span>
            </div>
            <Link
              href="/dashboard/logs"
              className="block text-center p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all mt-4"
            >
              View All Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

