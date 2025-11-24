'use client';

import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import Link from 'next/link';
import { 
  Users, 
  CheckSquare, 
  Mail, 
  Sparkles, 
  BarChart3, 
  Shield, 
  ArrowRight,
  Check,
  Star,
  Quote
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Users,
      title: 'Client Management',
      description: 'Track and manage all your client relationships in one place with health scores and activity tracking.',
    },
    {
      icon: CheckSquare,
      title: 'Task Management',
      description: 'Organize your work with a powerful Kanban board. Move tasks through stages and stay on top of deadlines.',
    },
    {
      icon: Mail,
      title: 'Email Integration',
      description: 'Connect your emails and automatically extract actionable tasks using AI-powered analysis.',
    },
    {
      icon: Sparkles,
      title: 'AI Task Extraction',
      description: 'Let AI analyze your emails and suggest tasks automatically. Save time and never miss important action items.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Get insights into your client relationships and task completion rates with detailed analytics.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and secure. We take privacy seriously and protect your information.',
    },
  ];

  const benefits = [
    'Streamline your workflow',
    'Never miss important tasks',
    'Improve client relationships',
    'Save time with AI automation',
    'Track everything in one place',
    'Make data-driven decisions',
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Project Manager',
      company: 'TechCorp',
      content: 'Fluere has transformed how we manage client relationships. The AI task extraction saves us hours every week.',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Sales Director',
      company: 'GrowthCo',
      content: 'The Kanban board and client health scores help us stay organized and proactive. Highly recommend!',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Operations Lead',
      company: 'StartupXYZ',
      content: 'Best tool we\'ve used for client management. The interface is clean and the features are exactly what we needed.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black dark:grid-pattern-elegant relative overflow-hidden">
      {/* Subtle animated pattern - only for non-hero sections */}
      <div className="fixed inset-0 animated-pattern pointer-events-none opacity-20 dark:opacity-10" />
      
      <LandingNavbar />
      
      {/* Hero Section */}
      <HeroGeometric
        badge="AI-Powered Task Management"
        title1="Manage Clients & Tasks"
        title2="With Intelligence"
        description="Fluere helps you manage client relationships, organize tasks, and extract actionable insights from your emails using AI."
      />

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-black dark:grid-pattern-elegant section-divider">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight text-glow">
                Powerful Features
              </h2>
              <p className="text-xl text-slate-600 dark:text-white/50 max-w-2xl mx-auto">
                Everything you need to manage your clients and tasks efficiently
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <ScrollReveal key={index} delay={index * 100}>
                  <Card className="border border-slate-200 dark:border-white/[0.08] bg-white/90 backdrop-blur-sm dark:bg-black group border-decoration card-shine elegant-hover relative">
                    <CardHeader>
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg w-fit mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <CardTitle className="text-xl text-slate-800 dark:text-white font-semibold">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-slate-600 dark:text-white/50 text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-black dark:grid-pattern-elegant section-divider">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight text-glow">
                Loved by Teams
              </h2>
              <p className="text-xl text-slate-600 dark:text-white/50 max-w-2xl mx-auto">
                See what our users are saying about Fluere
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="border border-slate-200 dark:border-white/[0.08] bg-white/90 backdrop-blur-sm dark:bg-black p-6 elegant-hover">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-slate-300 dark:fill-white/10 text-slate-300 dark:text-white/10" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-slate-300 dark:text-white/10 mb-4" />
                  <p className="text-slate-700 dark:text-white/60 mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-slate-500 dark:text-white/40">{testimonial.role} at {testimonial.company}</p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-black dark:grid-pattern-elegant section-divider">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight text-glow">
                  About Fluere
                </h2>
                <p className="text-lg text-slate-600 dark:text-white/50 mb-6 leading-relaxed">
                  Fluere is a modern client and task management platform designed to help you stay organized and productive. 
                  We combine powerful project management tools with AI-powered email analysis to help you extract actionable 
                  tasks from your communications.
                </p>
                <p className="text-lg text-slate-600 dark:text-white/50 mb-8 leading-relaxed">
                  Whether you're managing multiple clients, tracking tasks across projects, or trying to stay on top of 
                  important emails, Fluere provides the tools you need to work more efficiently.
                </p>
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="p-1 bg-blue-50 dark:bg-blue-500/10 rounded-full">
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-slate-700 dark:text-white/60">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border border-slate-200 dark:border-white/[0.08] bg-white/90 backdrop-blur-sm dark:bg-black p-6 elegant-hover corner-accent">
                  <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">100%</div>
                  <div className="text-slate-600 dark:text-white/50">Uptime</div>
                </Card>
                <Card className="border border-slate-200 dark:border-white/[0.08] bg-white/90 backdrop-blur-sm dark:bg-black p-6 elegant-hover corner-accent">
                  <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">24/7</div>
                  <div className="text-slate-600 dark:text-white/50">Support</div>
                </Card>
                <Card className="border border-slate-200 dark:border-white/[0.08] bg-white/90 backdrop-blur-sm dark:bg-black p-6 elegant-hover corner-accent">
                  <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">AI</div>
                  <div className="text-slate-600 dark:text-white/50">Powered</div>
                </Card>
                <Card className="border border-slate-200 dark:border-white/[0.08] bg-white/90 backdrop-blur-sm dark:bg-black p-6 elegant-hover corner-accent">
                  <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Free</div>
                  <div className="text-slate-600 dark:text-white/50">Forever</div>
                </Card>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-black dark:grid-pattern-elegant">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <Card className="border border-slate-200 dark:border-white/[0.08] bg-white/90 backdrop-blur-sm dark:bg-black p-12 text-center border-decoration elegant-hover relative">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight text-glow">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-slate-600 dark:text-white/50 mb-8">
                Join thousands of users who are already managing their clients and tasks more efficiently with Fluere.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-medium text-base px-8 py-6 rounded-lg transition-colors">
                    Create Free Account
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/[0.05] font-medium text-base px-8 py-6 rounded-lg transition-colors">
                    Sign In
                  </Button>
                </Link>
              </div>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Fluere</h3>
              <p className="text-slate-600 dark:text-white/50">
                Manage clients and tasks with intelligence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-slate-600 dark:text-white/50">
                <li><Link href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#about" className="hover:text-slate-900 dark:hover:text-white transition-colors">About</Link></li>
                <li><Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-600 dark:text-white/50">
                <li><Link href="/clients" className="hover:text-slate-900 dark:hover:text-white transition-colors">Clients</Link></li>
                <li><Link href="/tasks" className="hover:text-slate-900 dark:hover:text-white transition-colors">Tasks</Link></li>
                <li><Link href="/emails" className="hover:text-slate-900 dark:hover:text-white transition-colors">Emails</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Account</h4>
              <ul className="space-y-2 text-slate-600 dark:text-white/50">
                <li><Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Login</Link></li>
                <li><Link href="/signup" className="hover:text-slate-900 dark:hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/[0.08] text-center text-slate-500 dark:text-white/40">
            <p>&copy; 2025 Fluere. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
