'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function UsagePage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const now = new Date()
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const { data: logs } = await supabase
      .from('usage_logs')
      .select('*')
      .gte('created_at', last7Days.toISOString())
      .order('created_at', { ascending: true })

    if (logs) {
      // Group by date
      const dailyData: Record<string, { date: string; requests: number; errors: number }> = {}
      logs.forEach((log) => {
        const date = new Date(log.created_at).toLocaleDateString()
        if (!dailyData[date]) {
          dailyData[date] = { date, requests: 0, errors: 0 }
        }
        dailyData[date].requests++
        if (log.status === 'error' || log.status === 'rate_limited') {
          dailyData[date].errors++
        }
      })

      const chartData = Object.values(dailyData)

      setStats({
        total: logs.length,
        success: logs.filter((l) => l.status === 'success').length,
        errors: logs.filter((l) => l.status === 'error' || l.status === 'rate_limited').length,
        chartData,
      })
    }
    setLoading(false)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Usage Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Requests (7d)</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.total || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Successful</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats?.success || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Errors</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats?.errors || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Requests Over Time</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={stats?.chartData || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="requests" fill="#4F46E5" />
            <Bar dataKey="errors" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

