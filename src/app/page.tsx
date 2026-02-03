"use client";

import { motion } from "framer-motion";
import { Activity, Camera, Sparkles, Shield, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-sage-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-sage-800">PhysioLens</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-sage-600 hover:text-sage-800 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-sage-600 hover:text-sage-800 transition-colors">
                How It Works
              </a>
              <Link href="/exercises">
                <Button variant="outline" className="border-sage-300 text-sage-700 hover:bg-sage-50">
                  Browse Exercises
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sage-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-800 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                AI-Powered Form Correction
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-sage-900 leading-tight mb-6"
            >
              Like having a{" "}
              <span className="bg-gradient-to-r from-teal-600 to-sage-600 bg-clip-text text-transparent">
                physiotherapist
              </span>{" "}
              in your living room
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-sage-600 mb-10 max-w-2xl mx-auto"
            >
              Real-time AI form correction for physical therapy exercises. 
              Get instant feedback, track your progress, and recover faster.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/exercises">
                <Button size="lg" className="gradient-teal text-white hover:opacity-90 px-8">
                  <Play className="w-4 h-4 mr-2" />
                  Start Exercising
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="border-sage-300 text-sage-700">
                  How It Works
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold text-sage-900 mb-6">
                The Reality of Physical Therapy
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-red-600">35%</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sage-900">of patients complete exercises</h3>
                    <p className="text-sage-600 text-sm">The majority struggle with adherence at home</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-amber-600">3wk</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sage-900">average wait for first appointment</h3>
                    <p className="text-sage-600 text-sm">Then only seen every 2 weeks</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-red-600">$8k</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sage-900">average physio bills</h3>
                    <p className="text-sage-600 text-sm">With limited supervision between visits</p>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-sage-100 to-teal-100 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-teal-500 mx-auto mb-4 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-sage-700 font-medium">Zero supervision at home</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-sage-900 mb-4">
              Your AI Physical Therapy Coach
            </h2>
            <p className="text-sage-600 max-w-2xl mx-auto">
              Computer vision + real-time feedback = better recovery outcomes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Camera,
                title: "Real-Time Form Detection",
                description: "AI watches your movement and provides instant voice and visual feedback on form quality",
                color: "bg-teal-100 text-teal-600",
              },
              {
                icon: Sparkles,
                title: "Smart Coaching",
                description: "Get specific cues like \"Keep your back straight\" or \"Lower those hips\" as you exercise",
                color: "bg-sage-100 text-sage-600",
              },
              {
                icon: Shield,
                title: "Privacy First",
                description: "All computer vision runs locally in your browser. Your video never leaves your device",
                color: "bg-emerald-100 text-emerald-600",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-sage-100 hover:shadow-md transition-shadow"
              >
                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-6`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-sage-900 mb-3">{feature.title}</h3>
                <p className="text-sage-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-sage-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Select Exercise", desc: "Choose from our curated PT exercise library" },
              { step: "2", title: "Enable Camera", desc: "Allow camera access for pose detection" },
              { step: "3", title: "Follow Along", desc: "Get real-time form feedback as you move" },
              { step: "4", title: "Track Progress", desc: "See your improvement over time" },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full gradient-teal text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-sage-900 mb-2">{item.title}</h3>
                <p className="text-sage-600 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl gradient-teal p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to transform your recovery?
            </h2>
            <p className="text-teal-100 mb-8 max-w-xl mx-auto">
              Start with our AI-guided exercises and experience the difference real-time feedback makes
            </p>
            <Link href="/exercises">
              <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 px-8">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-sage-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-sage-800">PhysioLens</span>
            </div>
            <p className="text-sage-500 text-sm">
              Built for better physical therapy outcomes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
