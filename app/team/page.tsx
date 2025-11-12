import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { Github, Linkedin, Mail, Globe } from 'lucide-react'
import Link from 'next/link'

export default async function TeamPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  const teamMembers = [
    {
      name: 'Mohamad AlJasem',
      role: 'Founder & Lead Developer',
      bio: 'Passionate about building tools that make AI accessible to everyone. Full-stack developer with expertise in modern web technologies.',
      image: '👨‍💻',
      links: {
        website: 'https://aljasem.eu.org',
        github: 'https://github.com',
        linkedin: 'https://linkedin.com',
        email: 'mailto:contact@aljasem.eu.org'
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Meet the <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Team</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
            The passionate individuals building the future of AI infrastructure management
          </p>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse-glow delay-1000"></div>
      </div>

      {/* Team Members Section */}
      <div className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="group p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
              >
                <div className="text-center mb-6">
                  <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-6xl">
                    {member.image}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                  <p className="text-indigo-400 font-medium mb-4">{member.role}</p>
                  <p className="text-white/70 leading-relaxed text-sm">{member.bio}</p>
                </div>
                <div className="flex items-center justify-center space-x-4 pt-4 border-t border-white/10">
                  {member.links.website && (
                    <Link
                      href={member.links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-all"
                      aria-label="Website"
                    >
                      <Globe className="w-5 h-5" />
                    </Link>
                  )}
                  {member.links.github && (
                    <Link
                      href={member.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-all"
                      aria-label="GitHub"
                    >
                      <Github className="w-5 h-5" />
                    </Link>
                  )}
                  {member.links.linkedin && (
                    <Link
                      href={member.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-all"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5" />
                    </Link>
                  )}
                  {member.links.email && (
                    <Link
                      href={member.links.email}
                      className="p-2 bg-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-all"
                      aria-label="Email"
                    >
                      <Mail className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Join Us Section */}
      <div className="relative py-24 px-6 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Join Our Mission
          </h2>
          <p className="text-xl text-white/80 mb-8 leading-relaxed">
            We&apos;re always looking for talented individuals who share our passion for making AI infrastructure 
            management simple and accessible. If you&apos;re interested in contributing or joining the team, 
            we&apos;d love to hear from you.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105"
          >
            <span>Get in Touch</span>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}

