"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Activity, 
  ChevronLeft, 
  Search, 
  Sparkles,
  ArrowRight,
  Dumbbell,
  Heart,
  Zap,
  PersonStanding
} from "lucide-react";
import { exercises } from "@/data/exercises";
import { Button, Card, Badge } from "@/components/ui";
import { Exercise } from "@/types";

const categoryIcons: Record<string, typeof Dumbbell> = {
  mobility: PersonStanding,
  strength: Dumbbell,
  stretch: Heart,
  stability: Zap,
};

const difficultyColors = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

export default function ExercisesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exercise.targetMuscles.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRegion = selectedRegion === "all" || exercise.bodyRegion === selectedRegion;
    const matchesCategory = selectedCategory === "all" || exercise.category === selectedCategory;
    
    return matchesSearch && matchesRegion && matchesCategory;
  });

  const tier1Exercises = filteredExercises.filter(e => e.tier === 1);
  const tier2Exercises = filteredExercises.filter(e => e.tier === 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-sage-50">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
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
            <Link href="/dashboard">
              <Button variant="outline" className="border-sage-300">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-sage-900 mb-2">Exercise Library</h1>
          <p className="text-sage-600">
            Select an exercise to start your AI-guided workout session
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-sage-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-2 rounded-lg border border-sage-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Body Regions</option>
              <option value="lower_back">Lower Back</option>
              <option value="lower_body">Lower Body</option>
              <option value="core">Core</option>
              <option value="upper_body">Upper Body</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border border-sage-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Categories</option>
              <option value="mobility">Mobility</option>
              <option value="strength">Strength</option>
              <option value="stretch">Stretch</option>
              <option value="stability">Stability</option>
            </select>
          </div>
        </div>

        {/* AI-Powered Section */}
        {tier1Exercises.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h2 className="text-xl font-semibold text-sage-900">AI Form Detection</h2>
              <Badge variant="outline" className="border-teal-300 text-teal-700">
                Real-time feedback
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tier1Exercises.map((exercise, index) => (
                <ExerciseCard key={exercise.id} exercise={exercise} index={index} hasAi={true} />
              ))}
            </div>
          </section>
        )}

        {/* Standard Exercises */}
        {tier2Exercises.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Dumbbell className="w-5 h-5 text-sage-600" />
              <h2 className="text-xl font-semibold text-sage-900">Guided Exercises</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tier2Exercises.map((exercise, index) => (
                <ExerciseCard key={exercise.id} exercise={exercise} index={index + tier1Exercises.length} hasAi={false} />
              ))}
            </div>
          </section>
        )}

        {filteredExercises.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sage-600">No exercises found matching your criteria</p>
          </div>
        )}
      </main>
    </div>
  );
}

function ExerciseCard({ exercise, index, hasAi }: { exercise: Exercise; index: number; hasAi: boolean }) {
  const Icon = categoryIcons[exercise.category] || Dumbbell;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow border-sage-100">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl ${hasAi ? 'bg-teal-100' : 'bg-sage-100'} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${hasAi ? 'text-teal-600' : 'text-sage-600'}`} />
            </div>
            {hasAi && (
              <Badge className="bg-teal-100 text-teal-700 border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </Badge>
            )}
          </div>

          <h3 className="font-semibold text-lg text-sage-900 mb-2">{exercise.name}</h3>
          <p className="text-sage-600 text-sm mb-4 line-clamp-2">{exercise.description}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className={difficultyColors[exercise.difficulty]}>
              {exercise.difficulty}
            </Badge>
            <Badge variant="outline" className="text-sage-600">
              {exercise.category}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm text-sage-500 mb-4">
            <span>{exercise.defaultSets} sets</span>
            <span>{exercise.defaultReps} {exercise.repType === 'timed' ? 'sec' : 'reps'}</span>
          </div>

          <Link href={`/workout?exercise=${exercise.slug}`}>
            <Button className={`w-full ${hasAi ? 'gradient-teal text-white' : 'bg-sage-600 hover:bg-sage-700 text-white'}`}>
              Start Exercise
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
