import { motion } from 'framer-motion';
import SupabaseTest from '@/components/SupabaseTest';

export default function Dashboard() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-green-600">🎉 Dashboard</h1>
        <p className="mt-4">Welcome! You are successfully authenticated.</p>
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">This is a protected route that requires authentication.</p>
        </div>
      </div>
      
      <div className="max-w-2xl">
        <SupabaseTest />
      </div>
    </motion.div>
  );
} 