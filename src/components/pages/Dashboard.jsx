import { motion } from 'framer-motion';

export default function Dashboard() {
  return (
    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-8">
      <div className="text-center mt-2">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 pt-2">my embers</h1>
        <p className="text-lg text-gray-600 mb-6">View your embers or create a new one</p>
      </div>
    </motion.div>
  );
} 