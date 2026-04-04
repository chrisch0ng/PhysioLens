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
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button, Card, Progress } from "@/components/ui";
import { useProgressStore } from "@/stores/progress-store";
import { exercises } from "@/data/exercises";
import { getScoreColor, getScoreBgColor } from "@/lib/utils";

// ─── Demo placeholder data shown when no real sessions exist ─────────────────

const DEMO_STATS = {
  totalSessions: 12,
  currentStreak: 5,
  totalReps: 347,
  averageFormScore: 78,
};

const DEMO_TREND = [
  { session: "S1",  score: 61 },
  { session: "S2",  score: 64 },
  { session: "S3",  score: 60 },
  { session: "S4",  score: 67 },
  { session: "S5",  score: 70 },
  { session: "S6",  score: 69 },
  { session: "S7",  score: 73 },
  { session: "S8",  score: 75 },
  { session: "S9",  score: 72 },
  { session: "S10", score: 78 },
  { session: "S11", score: 80 },
  { session: "S12", score: 78 },
];

const DEMO_ACTIVITY = [
  { exerciseId: "bodyweight-squat", sessions: 4, averageFormScore: 84, lastPerformed: "Today" },
  { exerciseId: "cat-camel",        sessions: 4, averageFormScore: 91, lastPerformed: "Yesterday" },
  { exerciseId: "dead-bug",         sessions: 2, averageFormScore: 72, lastPerformed: "3 days ago" },
  { exerciseId: "cobra-stretch",    sessions: 2, averageFormScore: 88, lastPerformed: "5 days ago" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const progress = useProgressStore();
  const isDemo = progress.totalSessions === 0;

  const totalSessions    = isDemo ? DEMO_STATS.totalSessions    : progress.totalSessions;
  const currentStreak    = isDemo ? DEMO_STATS.currentStreak    : progress.currentStreak;
  const totalReps        = isDemo ? DEMO_STATS.totalReps        : progress.totalReps;
  const averageFormScore = isDemo ? DEMO_STATS.averageFormScore : progress.averageFormScore;

  const recentActivity = isDemo
    ? DEMO_ACTIVITY
    : progress.exerciseHistory
        .sort((a, b) => new Date(b.lastPerformed).getTime() - new Date(a.lastPerformed).getTime())
        .slice(0, 4);

  // Build trend data from real sessions if available
  const trendData = isDemo
    ? DEMO_TREND
    : progress.exerciseHistory
        .flatMap(h => [] as { session: string; score: number }[]) // placeholder — real chart needs per-session data
        .slice(-12);

  const stats = [
    { label: "Total Workouts",  value: totalSessions,          icon: Trophy,    color: "bg-amber-100 text-amber-600" },
    { label: "Current Streak",  value: `${currentStreak} days`, icon: Flame,    color: "bg-orange-100 text-orange-600" },
    { label: "Total Reps",      value: totalReps,               icon: Target,   color: "bg-teal-100 text-teal-600" },
    { label: "Avg Form Score",  value: `${averageFormScore}%`,  icon: TrendingUp, color: "bg-sage-100 text-sage-600" },
  ];

  const milestoneTarget = Math.ceil(totalSessions / 10) * 10 || 10;
  const milestoneProgress = ((totalSessions % 10) / 10) * 100;
  const milestoneRemaining = milestoneTarget - totalSessions;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-sage-50">
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
            <div className="flex items-center gap-3">
              {isDemo && (
                <span className="text-xs text-sage-500 bg-sage-100 px-3 py-1 rounded-full">
                  Demo data
                </span>
              )}
              <Link href="/exercises">
                <Button className="gradient-teal text-white">Start Workout</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-sage-900 mb-1">Your Progress</h1>
          <p className="text-sage-600">Track your recovery journey and form improvement over time</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
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

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Form trend chart */}
            <Card className="border-sage-100">
              <div className="p-6 border-b border-sage-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-sage-900">Form Score Trend</h2>
                  <p className="text-sm text-sage-500 mt-0.5">Improvement across your last 12 sessions</p>
                </div>
                <div className="flex items-center gap-1.5 text-teal-600 text-sm font-medium bg-teal-50 px-3 py-1 rounded-full">
                  <TrendingUp className="w-4 h-4" />
                  +17 pts
                </div>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={isDemo ? DEMO_TREND : trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="session" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                      formatter={(v: number) => [`${v}%`, "Form score"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#0d9488" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Recent activity */}
            <Card className="border-sage-100">
              <div className="p-6 border-b border-sage-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-sage-900">Recent Activity</h2>
                <Link href="/exercises">
                  <Button variant="outline" size="sm" className="border-sage-300">
                    New workout <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {recentActivity.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-sage-400" />
                  </div>
                  <h3 className="font-semibold text-sage-900 mb-2">No workouts yet</h3>
                  <p className="text-sage-600 mb-4">Start your first workout to see your progress here</p>
                  <Link href="/exercises">
                    <Button className="gradient-teal text-white">Browse Exercises</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-sage-100">
                  {recentActivity.map((history) => {
                    const exercise = exercises.find(e => e.id === history.exerciseId);
                    if (!exercise) return null;
                    return (
                      <div key={history.exerciseId} className="p-5 flex items-center gap-4 hover:bg-sage-50 transition-colors">
                        <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                          <Activity className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sage-900">{exercise.name}</p>
                          <p className="text-sm text-sage-500">
                            {history.sessions} session{history.sessions !== 1 ? "s" : ""} · {history.lastPerformed}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-bold ${getScoreColor(history.averageFormScore)}`}>
                            {history.averageFormScore}%
                          </p>
                          <p className="text-xs text-sage-400">avg form</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Per-exercise form breakdown */}
            <Card className="border-sage-100">
              <div className="p-6 border-b border-sage-100">
                <h2 className="font-semibold text-sage-900">Exercise Breakdown</h2>
              </div>
              <div className="p-6 space-y-5">
                {(isDemo ? DEMO_ACTIVITY : recentActivity).map((h) => {
                  const ex = exercises.find(e => e.id === h.exerciseId);
                  if (!ex) return null;
                  return (
                    <div key={h.exerciseId}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-sage-800 truncate pr-2">{ex.name}</span>
                        <span className={`font-semibold shrink-0 ${getScoreColor(h.averageFormScore)}`}>
                          {h.averageFormScore}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${getScoreBgColor(h.averageFormScore)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${h.averageFormScore}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Quick start */}
            <Card className="border-sage-100">
              <div className="p-6">
                <h2 className="font-semibold text-sage-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  Quick Start
                </h2>
                <div className="space-y-2">
                  {exercises.slice(0, 3).map((exercise) => (
                    <Link key={exercise.id} href={`/workout?exercise=${exercise.slug}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-sage-50 transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sage-900 text-sm">{exercise.name}</p>
                          <p className="text-xs text-sage-500">{exercise.defaultSets} sets · {exercise.defaultReps} reps</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-sage-400 shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>

            {/* Milestone */}
            <Card className="border-0 bg-gradient-to-br from-teal-500 to-sage-600 text-white">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-7 h-7" />
                  <h2 className="font-semibold">Next Milestone</h2>
                </div>
                <p className="text-teal-100 text-sm mb-4">
                  {milestoneRemaining === 0
                    ? "Milestone reached — great work!"
                    : `${milestoneRemaining} more workout${milestoneRemaining !== 1 ? "s" : ""} to reach ${milestoneTarget} total sessions`}
                </p>
                <Progress value={milestoneProgress} className="h-2 bg-white/20" />
                <p className="text-xs text-teal-100 mt-2">
                  {totalSessions % 10} / 10 sessions
                </p>
              </div>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
