import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// Microphone icon
const MicIcon = () => (
  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

// Heart icon
const HeartIcon = () => (
  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

// Dummy data for the donut chart
const chartData = [
  { name: "Stories", value: 30, fill: "#3b82f6" },
  { name: "Voices", value: 25, fill: "#10b981" },
  { name: "Memories", value: 20, fill: "#f59e0b" },
  { name: "Moments", value: 15, fill: "#ef4444" },
  { name: "Connections", value: 10, fill: "#8b5cf6" },
];

// Animated Donut Chart Component
const StoryCircleChart = () => (
  <div className="w-32 h-32 mx-auto">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={29}
          outerRadius={48}
          paddingAngle={2}
          dataKey="value"
          animationBegin={0}
          animationDuration={1500}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default function About() {
  return (
    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="max-w-4xl mx-auto space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Hi, this is ember</h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
          An AI-guided companion that helps you preserve memories through shared, thoughtful conversations with friends and family.
        </p>
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="flex justify-center">
            <MicIcon />
          </div>
          <p className="text-lg text-gray-600 leading-relaxed">
            Ember records real voices of the people who gather to reflect on a moment — capturing what happened, how it felt, and what it meant to everyone.
          </p>
        </div>
      </div>

      {/* Build a Story Circle Section */}
      <div className="text-center space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">The Story Circle</h2>

        {/* Animated Donut Chart */}
        <div className="mt-3">
          <StoryCircleChart />
        </div>

        <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Invite others to join a group conversation about a time or place — preserving not just the stories, but the voices and reactions around them.
        </p>
      </div>

      {/* Keep It Alive Section */}
      <div className="text-center space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Keep It Alive</h2>
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="flex justify-center">
            <HeartIcon />
          </div>
          <p className="text-lg text-gray-600 leading-relaxed">
            Ember connects every story into a living archive — evolving as new memories, voices, and perspectives are added over time.
          </p>
        </div>
      </div>

      {/* Get Started Button - Bottom */}
      <div className="text-center pt-8">
        <Link to="/create">
          <Button size="lg" variant="blue" className="px-8 text-lg font-semibold">
            Get Started Now
          </Button>
        </Link>
      </div>
    </motion.div>
  );
} 