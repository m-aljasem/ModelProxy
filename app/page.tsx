import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { 
  Shield, 
  Zap, 
  Network, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Globe,
  MessageSquare,
  Cpu,
  TestTube
} from 'lucide-react'

export default async function Home() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  // Show homepage for visitors
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-white/90">The Ultimate AI Gateway & Management Platform</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Your AI Infrastructure,
            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Simplified & Supercharged
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            The all-in-one platform that transforms how you manage AI providers. 
            <span className="block mt-2 text-white/90 font-semibold">
              Chat with any model. Test instantly. Deploy confidently. Scale effortlessly.
            </span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105 flex items-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse-glow delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      {/* Features Section */}
      <div id="features" className="relative py-24 px-6 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need to Master AI
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              From interactive chat interfaces to powerful testing tools—everything you need in one beautiful platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 - Chat Interface */}
            <div className="group p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Interactive Chat Interface</h3>
              <p className="text-white/70 leading-relaxed">
                Chat directly with any AI model through an intuitive interface. Select endpoints or choose provider + model combinations instantly.
              </p>
            </div>

            {/* Feature 2 - Model Management */}
            <div className="group p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Smart Model Management</h3>
              <p className="text-white/70 leading-relaxed">
                Pre-define models per provider or use custom models on-the-fly. Flexible model selection that adapts to your workflow.
              </p>
            </div>

            {/* Feature 3 - API Testing */}
            <div className="group p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TestTube className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Built-in API Testing</h3>
              <p className="text-white/70 leading-relaxed">
                Test endpoints instantly with real-time results and cURL command generation. Debug faster, deploy with confidence.
              </p>
            </div>

            {/* Feature 4 - Multi-Provider */}
            <div className="group p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Multi-Provider Support</h3>
              <p className="text-white/70 leading-relaxed">
                Unified interface for OpenAI, OpenRouter, and custom providers. Switch between providers seamlessly.
              </p>
            </div>

            {/* Feature 5 - Secure Authentication */}
            <div className="group p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Enterprise Security</h3>
              <p className="text-white/70 leading-relaxed">
                Token-based access with bcrypt hashing, IP whitelisting, rate limits, and granular scopes. Your keys stay hidden.
              </p>
            </div>

            {/* Feature 6 - Analytics */}
            <div className="group p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Real-Time Analytics</h3>
              <p className="text-white/70 leading-relaxed">
                Comprehensive usage tracking, request logs, and beautiful visualizations. Know exactly what&apos;s happening.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Why Teams Choose ModelProxy
              </h2>
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
                Stop juggling multiple tools. ModelProxy gives you everything you need to manage, test, and deploy AI solutions with confidence.
              </p>
              <div className="space-y-4">
                {[
                  'Chat with any model instantly—no code required',
                  'Test endpoints with one click and get cURL commands',
                  'Pre-define models or use custom ones on-the-fly',
                  'Hide provider keys while giving clients seamless access',
                  'Enforce quotas and rate limits to control costs',
                  'Track everything with beautiful analytics and logs',
                  'Deploy in minutes, scale to millions of requests'
                ].map((benefit, index) => (
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
                      <Globe className="w-5 h-5 text-indigo-400" />
                      <span className="text-white font-medium">Global Availability</span>
                    </div>
                    <span className="text-green-400 font-semibold">99.9%</span>
                  </div>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-md rounded-3xl border border-white/10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your AI Workflow?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join developers and teams who&apos;ve simplified their AI infrastructure. 
              <span className="block mt-2 font-semibold text-white">Start chatting, testing, and deploying in minutes.</span>
            </p>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
