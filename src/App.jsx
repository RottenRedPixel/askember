import { Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useStore from './store';
import SupabaseTest from './components/SupabaseTest';
import AuthGuard from './components/auth/AuthGuard';
import AuthCallback from './components/auth/AuthCallback';
import './App.css'

function Home() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">hello, I'm ember</h1>
        <p className="text-lg text-gray-600 mb-6">Your AI-powered audio and visual storytelling companion</p>
        
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="text-gray-700">Counter: {count}</span>
          <button 
            onClick={increment}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Increment
          </button>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <SupabaseTest />
      </div>
    </motion.div>
  );
}

function About() {
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

function Dashboard() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold text-green-600">🎉 Dashboard</h1>
      <p className="mt-4">Welcome! You are successfully authenticated.</p>
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-green-800">This is a protected route that requires authentication.</p>
      </div>
    </motion.div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-8 flex justify-center gap-8">
          <Link 
            to="/" 
            className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            About
          </Link>
          <Link 
            to="/dashboard" 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Dashboard
          </Link>
        </nav>
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          } />
        </Routes>
      </div>
    </div>
  );
}
