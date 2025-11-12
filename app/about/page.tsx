import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { Target, Lightbulb, Rocket, Heart } from 'lucide-react'

export default async function AboutPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            About <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">ModelProxy</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
            We&apos;re building the future of AI infrastructure management—one that&apos;s simple, secure, and scalable.
          </p>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse-glow delay-1000"></div>
      </div>

      {/* Mission Section */}
      <div className="relative py-24 px-6 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
                <Target className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-white/90 font-medium">Our Mission</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Empowering Teams to Master AI
              </h2>
              <p className="text-lg text-white/80 leading-relaxed mb-6">
                ModelProxy was born from a simple observation: managing AI providers shouldn&apos;t be complicated. 
                We believe that every team, regardless of size, should have access to enterprise-grade AI infrastructure 
                management tools.
              </p>
              <p className="text-lg text-white/80 leading-relaxed">
                Our mission is to democratize AI infrastructure by providing a unified platform that makes it easy to 
                manage multiple providers, secure API keys, test endpoints, and scale with confidence.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
              <div className="relative p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Innovation First</h3>
                      <p className="text-white/70">We continuously innovate to stay ahead of the AI landscape.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Performance Driven</h3>
                      <p className="text-white/70">Every feature is optimized for speed and reliability.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">User Centric</h3>
                      <p className="text-white/70">Your success is our success. We build with you in mind.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Story</h2>
            <p className="text-xl text-white/70">How ModelProxy came to be</p>
          </div>
          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-white/80 leading-relaxed mb-6">
              ModelProxy started as a solution to a real problem: managing multiple AI providers was becoming 
              increasingly complex. As AI adoption grew, teams found themselves juggling API keys, managing quotas, 
              testing endpoints, and trying to maintain security across multiple services.
            </p>
            <p className="text-lg text-white/80 leading-relaxed mb-6">
              We saw an opportunity to create something better—a platform that brings all these capabilities together 
              in one beautiful, intuitive interface. A platform that doesn&apos;t just manage AI providers, but makes 
              the entire workflow seamless.
            </p>
            <p className="text-lg text-white/80 leading-relaxed">
              Today, ModelProxy is trusted by teams worldwide to manage their AI infrastructure. We&apos;re constantly 
              evolving, adding new features, and improving the experience based on feedback from our community. 
              This is just the beginning.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="relative py-24 px-6 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Values</h2>
            <p className="text-xl text-white/70">What drives us every day</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Simplicity',
                description: 'Complex problems deserve simple solutions. We believe in making powerful tools accessible to everyone.',
                gradient: 'from-indigo-500 to-purple-600'
              },
              {
                title: 'Security',
                description: 'Your data and API keys are sacred. We implement enterprise-grade security measures to keep everything safe.',
                gradient: 'from-purple-500 to-pink-600'
              },
              {
                title: 'Reliability',
                description: 'You can count on us. We build for scale and maintain 99.9% uptime to keep your operations running smoothly.',
                gradient: 'from-blue-500 to-cyan-600'
              }
            ].map((value, index) => (
              <div key={index} className="p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className={`w-14 h-14 bg-gradient-to-br ${value.gradient} rounded-xl flex items-center justify-center mb-6`}>
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-white/70 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

