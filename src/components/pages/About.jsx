import { motion } from 'framer-motion';

export default function About() {
  return (
    <motion.div initial={{ x: -100 }} animate={{ x: 0 }} className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">about ember</h1>
      <div className="prose prose-lg">
        <p className="text-gray-600 leading-relaxed">
          Ember is a progressive web app that combines the power of AI with audio recording, 
          image analysis, and voice synthesis to create compelling digital stories and experiences.
        </p>
      </div>
    </motion.div>
  );
} 