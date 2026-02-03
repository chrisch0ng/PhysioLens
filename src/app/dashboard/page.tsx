"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Activity, 
  ChevronLeft, 
  Trophy, 
  Flame, 
  Target, 
  TrendingUp,
  Calendar,
  Clock,
  Award,
  ArrowRight
} from "lucide-react";
import { Button, Card, Progress, Badge } from "@/components/ui";
import { useProgressStore } from "@/stores/progress-store";
import { exercises } from "@/data/exercises";
import { getScoreColor } from "@/lib/utils";

export default function DashboardPage() {
  const progress = useProgressStore();

  const stats = [
    {
      label: "Total Workouts",
      value: progress.totalSessions,
      icon: Trophy,
      color: "bg-amber-100 text-amber-600",
    },
    {
      label: "Current Streak",
      value: `${progress.currentStreak} days`,
      icon: Flame,
      color: "bg-orange-100 text-orange-600",
    },
    {
      label: "Total Reps",
      value: progress.totalReps,
      icon: Target,
      color: "bg-teal-100 text-teal-600",
    },
    {
      label: "Avg Form Score",
      value: `${progress.averageFormScore}%`,
      icon: TrendingUp,
      color: "bg-sage-100 text-sage-600",
    },
  ];

  const recentExercises = progress.exerciseHistory
    .sort((a, b) => new Date(b.lastPerformed).getTime() - new Date(a.lastPerformed).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-sage-50">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/exercises">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-sage-800">PhysioLens</span>
              </div>
            </div>
            <Link href="/exercises">
              <Button className="gradient-teal text-white">
                Start Workout
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-sage-900 mb-2">Your Progress</h1>
          <p className="text-sage-600">
            Track your recovery journey and form improvement over time
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="p-6 border-sage-100">
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold text-sage-900">{stat.value}</p>
                <p className="text-sm text-sage-600">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="border-sage-100">
              <div className="p-6 border-b border-sage-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-sage-900">Recent Activity</h2>
                  <Link href="/exercises">
                    <Button variant="outline" size="sm" className="border-sage-300">
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              {recentExercises.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-sage-400" />
                  </div>
                  <h3 className="font-semibold text-sage-900 mb-2">No workouts yet</h3>
                  <p className="text-sage-600 mb-4">Start your first workout to track your progress</p>
                  <Link href="/exercises">
                    <Button className="gradient-teal text-white">
                      Browse Exercises
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-sage-100">
                  {recentExercises.map((history) => {
                    const exercise = exercises.find(e => e.id === history.exerciseId);
                    if (!exercise) return null;

                    return (
                      <div key={history.exerciseId} className="p-6 flex items-center justify-between hover:bg-sage-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sage-900">{exercise.name}</h3>
                            <p className="text-sm text-sage-600">
                              {history.sessions} sessions • Last: {history.lastPerformed}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getScoreColor(history.averageFormScore)}`}>
                            {history.averageFormScore}%
                          </p>
                          <p className="text-xs text-sage-500">avg form</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Card className="border-sage-100">
              <div className="p-6">
                <h2 className="font-semibold text-sage-900 mb-4">Quick Start</h2>
                <div className="space-y-3">
                  {exercises
                    .filter(e => e.tier === 1)
                    .slice(0, 3)
                    .map((exercise) => (
                      <Link key={exercise.id} href={`/workout/${exercise.slug}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-teal-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sage-900">{exercise.name}</p>
                            <p className="text-xs text-sage-600">{exercise.category}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-sage-400" />
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            </Card>

            <Card className="border-sage-100 bg-gradient-to-br from-teal-500 to-sage-600 text-white">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-8 h-8" />
                  <h2 className="font-semibold">Next Milestone</h2>
                </div>
                <p className="text-teal-100 mb-4">
                  Complete {10 - (progress.totalSessions % 10)} more workouts to reach {Math.ceil(progress.totalSessions / 10) * 10} total sessions!
                </p>
                <Progress 
                  value={(progress.totalSessions % 10) * 10} 
                  className="h-2 bg-white/20"
                />
                <p className="text-sm text-teal-100 mt-2">
                  {progress.totalSessions % 10} / 10 sessions
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
