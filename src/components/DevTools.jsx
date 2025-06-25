import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { runMigration, executeSQL, healthCheck, tableExists, getTableSchema, debugStorageSetup } from '@/lib/database';
import { getStorageUsage, formatBytes } from '@/lib/storage';

export default function DevTools() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customSQL, setCustomSQL] = useState('');

  const addResult = (type, message, data = null) => {
    const result = {
      id: Date.now(),
      type, // 'success', 'error', 'info'
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [result, ...prev].slice(0, 10)); // Keep last 10 results
  };

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const health = await healthCheck();
      if (health.healthy) {
        addResult('success', `Database is healthy. User profiles: ${health.userCount || 0}`);
      } else {
        addResult('error', `Database health check failed: ${health.error}`);
      }
    } catch (error) {
      addResult('error', `Health check error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkTable = async (tableName) => {
    setIsLoading(true);
    try {
      const exists = await tableExists(tableName);
      if (exists) {
        const schema = await getTableSchema(tableName);
        addResult('info', `Table "${tableName}" exists`, schema);
      } else {
        addResult('info', `Table "${tableName}" does not exist`);
      }
    } catch (error) {
      addResult('error', `Table check error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runCustomSQL = async () => {
    if (!customSQL.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await executeSQL(customSQL);
      if (result.success) {
        addResult('success', 'Custom SQL executed successfully', result.data);
      } else {
        addResult('error', `SQL Error: ${result.error}`);
      }
    } catch (error) {
      addResult('error', `SQL execution error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllResults = () => {
    setResults([]);
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button onClick={runHealthCheck} disabled={isLoading} variant="blue">
              Health Check
            </Button>
            <Button onClick={() => checkTable('user_profiles')} disabled={isLoading} variant="blue">
              Check Profiles
            </Button>
            <Button onClick={clearAllResults} variant="blue">
              Clear All
            </Button>
          </div>

          {/* Custom SQL */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Custom SQL</h3>
            <textarea
              value={customSQL}
              onChange={(e) => setCustomSQL(e.target.value)}
              placeholder="Enter SQL query..."
              className="w-full h-32 p-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <Button onClick={runCustomSQL} disabled={isLoading || !customSQL.trim()} className="mt-2">
              Execute SQL
            </Button>
          </div>

          {/* Results */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map(result => (
                <Alert key={result.id} className={`
                  ${result.type === 'success' ? 'border-green-200 bg-green-50' : ''}
                  ${result.type === 'error' ? 'border-red-200 bg-red-50' : ''}
                  ${result.type === 'info' ? 'border-blue-200 bg-blue-50' : ''}
                `}>
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <span>{result.message}</span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    {result.data && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 