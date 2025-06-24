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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold underline">Home</h1>
      <p>Count: {count}</p>
      <button className="btn" onClick={increment}>Increment</button>
      
      <div className="mt-8">
        <SupabaseTest />
      </div>
    </motion.div>
  );
}

function About() {
  return (
    <motion.div initial={{ x: -100 }} animate={{ x: 0 }}>
      <h1 className="text-3xl font-bold">About</h1>
      <p>This is the about page.</p>
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
    <div className="p-4 min-h-screen bg-blue-100">
      <nav className="mb-4 flex gap-4">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/dashboard" className="text-green-600 font-medium">Dashboard (Protected)</Link>
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
  );
}
