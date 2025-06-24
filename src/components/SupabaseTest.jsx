import { useState } from 'react';
import { testConnection } from '../lib/supabase';

export default function SupabaseTest() {
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestConnection = async () => {
    setIsLoading(true);
    const result = await testConnection();
    setTestResult(result);
    setIsLoading(false);
  };

  return (
    <div className="p-6 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Supabase Connection Test</h3>
      
      <button
        onClick={handleTestConnection}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Testing...' : 'Test Connection'}
      </button>

      {testResult && (
        <div className={`mt-4 p-3 rounded ${
          testResult.success 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <p className="font-medium">
            {testResult.success ? '✅ Success!' : '❌ Failed'}
          </p>
          <p className="text-sm mt-1">{testResult.message}</p>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Setup Instructions:</strong></p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Go to your Supabase project dashboard</li>
          <li>Copy your Project URL and anon public key</li>
          <li>Update the values in <code className="bg-gray-200 px-1 rounded">.env.local</code></li>
          <li>Restart your dev server</li>
          <li>Click "Test Connection" above</li>
        </ol>
      </div>
    </div>
  );
} 