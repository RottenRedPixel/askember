import { motion } from 'framer-motion';

export default function Home() {
  return (
    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">hello, I'm ember</h1>
        <p className="text-lg text-gray-600 mb-6">Your AI-powered audio and visual storytelling companion</p>
      </div>
    </motion.div>
  );
} 