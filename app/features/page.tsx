import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import Link from 'next/link'
import {
  MessageSquare,
  Cpu,
  TestTube,
  Network,
  Shield,
  BarChart3,
  Zap,
  Lock,
  Activity,
  Code,
  Settings,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'

export default async function FeaturesPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  const features = [
    {
      icon: MessageSquare,
      title: 'Interactive Chat Interface',
      description: 'Chat directly with any AI model through an intuitive interface. Select endpoints or choose provider + model combinations instantly.',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      icon: Cpu,
      title: 'Smart Model Management',
      description: 'Pre-define models per provider or use custom models on-the-fly. Flexible model selection that adapts to your workflow.',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      icon: TestTube,
      title: 'Built-in API Testing',
      description: 'Test endpoints instantly with real-time results and cURL command generation. Debug faster, deploy with confidence.',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Network,
      title: 'Multi-Provider Support',
      description: 'Unified interface for OpenAI, OpenRouter, and custom providers. Switch between providers seamlessly.',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Token-based access with bcrypt hashing, IP whitelisting, rate limits, and granular scopes. Your keys stay hidden.',
      gradient: 'from-red-500 to-orange-600'
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Comprehensive usage tracking, request logs, and beautiful visualizations. Know exactly what&apos;s happening.',
      gradient: 'from-yellow-500 to-amber-600'
    },
    {
      icon: Zap,
      title: 'Real-Time Streaming',
      description: 'Server-Sent Events (SSE) support for streaming chat completions with low latency and high performance.',
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      icon: Lock,
      title: 'Rate Limiting',
      description: 'Per-token rate limits and monthly quotas with burst control to prevent abuse and manage costs.',
      gradient: 'from-indigo-500 to-blue-600'
    },
    {
      icon: Activity,
      title: 'Audit Logging',
      description: 'Complete request tracing with correlation IDs, latency tracking, and comprehensive audit trails.',
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      icon: Code,
      title: 'API Documentation',
      description: 'Auto-generated API docs with code examples in multiple languages. Get started in minutes, not hours.',
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      icon: Settings,
      title: 'Flexible Configuration',
      description: 'Customize endpoints, models, and authentication settings to match your exact requirements.',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      icon: Network,
      title: 'Extensible Architecture',
      description: 'Easy to extend with custom providers and integrations. Built for developers, by developers.',
      gradient: 'from-orange-500 to-red-600'
    }
  ]

  const benefits = [
    'Chat with any model instantly—no code required',
    'Test endpoints with one click and get cURL commands',
    'Pre-define models or use custom ones on-the-fly',
    'Hide provider keys while giving clients seamless access',
    'Enforce quotas and rate limits to control costs',
    'Track everything with beautiful analytics and logs',
    'Deploy in minutes, scale to millions of requests',
    'Enterprise-grade security out of the box'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Powerful <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Features</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
            Everything you need to manage, test, and deploy AI infrastructure at scale
          </p>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse-glow delay-1000"></div>
      </div>

      {/* Features Grid */}
      <div className="relative py-24 px-6 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Comprehensive features designed to make AI infrastructure management effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="group p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-white/70 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Why Choose ModelProxy?
              </h2>
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
                Stop juggling multiple tools. ModelProxy gives you everything you need to manage, test, and deploy AI solutions with confidence.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/90 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
              <div className="relative p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <span className="text-white font-medium">Average Latency</span>
                    </div>
                    <span className="text-white font-semibold">&lt; 200ms</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">Security Score</span>
                    </div>
                    <span className="text-white font-semibold">A+</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-5 h-5 text-indigo-400" />
                      <span className="text-white font-medium">Uptime</span>
                    </div>
                    <span className="text-green-400 font-semibold">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 px-6 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Experience all these features and more. Start managing your AI infrastructure today.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}

