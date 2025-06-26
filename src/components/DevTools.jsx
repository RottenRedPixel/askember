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

  const checkSharingSystem = async () => {
    setIsLoading(true);
    try {
      const sql = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'embers' AND column_name = 'is_public'
        ) as has_is_public,
        EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'embers' AND column_name = 'allow_public_edit'
        ) as has_allow_public_edit,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'ember_shares'
        ) as has_ember_shares_table;
      `;
      const result = await executeSQL(sql);
      if (result.success) {
        addResult('success', 'Sharing system check completed!', result.data);
      } else {
        addResult('error', `Sharing system check failed: ${result.error}`);
      }
    } catch (error) {
      addResult('error', `Sharing system check error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTitleColumn = async () => {
    setIsLoading(true);
    try {
      const sql = `
        -- Ensure title column exists and has correct type
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'embers' AND column_name = 'title'
          ) THEN
            ALTER TABLE embers ADD COLUMN title VARCHAR(45);
          ELSE
            ALTER TABLE embers ALTER COLUMN title TYPE VARCHAR(45);
          END IF;
        END $$;

        -- Refresh the schema cache
        NOTIFY pgrst, 'reload schema';
      `;
      const result = await executeSQL(sql);
      if (result.success) {
        addResult('success', 'Title column refreshed successfully!', result.data);
      } else {
        addResult('error', `Title column refresh failed: ${result.error}`);
      }
    } catch (error) {
      addResult('error', `Title column refresh error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runSharingSystemSetup = async () => {
    setIsLoading(true);
    try {
      const sharingSQL = `
-- Sharing System for Embers
-- Add sharing fields to embers table
ALTER TABLE embers ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE embers ADD COLUMN IF NOT EXISTS allow_public_edit BOOLEAN DEFAULT false;

-- Create ember_shares table for individual sharing permissions
CREATE TABLE IF NOT EXISTS ember_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ember_id UUID NOT NULL REFERENCES embers(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'edit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(ember_id, shared_with_email)
);

-- Enable RLS on ember_shares
ALTER TABLE ember_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ember_shares
CREATE POLICY "Users can view shares for their embers" ON ember_shares
    FOR SELECT USING (
        shared_by_user_id = auth.uid() OR 
        shared_with_email = auth.jwt() ->> 'email'
    );

CREATE POLICY "Users can create shares for their embers" ON ember_shares
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_shares.ember_id 
            AND embers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shares for their embers" ON ember_shares
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_shares.ember_id 
            AND embers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shares for their embers" ON ember_shares
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM embers 
            WHERE embers.id = ember_shares.ember_id 
            AND embers.user_id = auth.uid()
        )
    );

-- Update embers RLS policy to include shared access
DROP POLICY IF EXISTS "Users can view their own embers" ON embers;
CREATE POLICY "Users can view their own embers or shared embers" ON embers
    FOR SELECT USING (
        user_id = auth.uid() OR 
        is_public = true OR
        EXISTS (
            SELECT 1 FROM ember_shares 
            WHERE ember_shares.ember_id = embers.id 
            AND ember_shares.shared_with_email = auth.jwt() ->> 'email'
            AND ember_shares.is_active = true
            AND (ember_shares.expires_at IS NULL OR ember_shares.expires_at > now())
        )
    );

-- Function to get user permission level for an ember
CREATE OR REPLACE FUNCTION get_ember_permission(ember_uuid UUID, user_email TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    user_email_param TEXT := COALESCE(user_email, auth.jwt() ->> 'email');
    ember_record embers%ROWTYPE;
    share_record ember_shares%ROWTYPE;
BEGIN
    -- Get ember details
    SELECT * INTO ember_record FROM embers WHERE id = ember_uuid;
    
    IF NOT FOUND THEN
        RETURN 'none';
    END IF;
    
    -- Check if user is owner
    IF ember_record.user_id = auth.uid() THEN
        RETURN 'owner';
    END IF;
    
    -- Check if ember is public
    IF ember_record.is_public THEN
        IF ember_record.allow_public_edit THEN
            RETURN 'edit';
        ELSE
            RETURN 'view';
        END IF;
    END IF;
    
    -- Check specific shares
    SELECT * INTO share_record 
    FROM ember_shares 
    WHERE ember_id = ember_uuid 
    AND shared_with_email = user_email_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
    
    IF FOUND THEN
        RETURN share_record.permission_level;
    END IF;
    
    RETURN 'none';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
      `;

      const result = await executeSQL(sharingSQL);
      if (result.success) {
        addResult('success', 'Sharing system setup completed successfully!', result.data);
      } else {
        addResult('error', `Sharing system setup failed: ${result.error}`);
      }
    } catch (error) {
      addResult('error', `Sharing system setup error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Button onClick={runHealthCheck} disabled={isLoading} variant="blue">
              Health Check
            </Button>
            <Button onClick={() => checkTable('user_profiles')} disabled={isLoading} variant="blue">
              Check Profiles
            </Button>
            <Button onClick={checkSharingSystem} disabled={isLoading} variant="blue">
              Check Sharing System
            </Button>
            <Button onClick={refreshTitleColumn} disabled={isLoading} variant="blue">
              Refresh Title Column
            </Button>
            <Button onClick={runSharingSystemSetup} disabled={isLoading} variant="blue">
              Setup Sharing
            </Button>
            <Button onClick={clearAllResults} variant="blue">
              Clear All
            </Button>
          </div>

          {/* Quick Sharing Queries */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Quick Sharing Queries</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button 
                onClick={() => setCustomSQL('SELECT * FROM ember_shares WHERE is_active = true;')} 
                variant="outline" 
                size="sm"
              >
                View Active Shares
              </Button>
              <Button 
                onClick={() => setCustomSQL('SELECT id, title, is_public, allow_public_edit FROM embers;')} 
                variant="outline" 
                size="sm"
              >
                View Ember Privacy Settings
              </Button>
              <Button 
                onClick={() => setCustomSQL(`SELECT 
  e.title,
  e.is_public,
  COUNT(es.id) as share_count
FROM embers e
LEFT JOIN ember_shares es ON e.id = es.ember_id AND es.is_active = true
GROUP BY e.id, e.title, e.is_public
ORDER BY share_count DESC;`)} 
                variant="outline" 
                size="sm"
              >
                Sharing Statistics
              </Button>
              <Button 
                onClick={() => setCustomSQL(`SELECT 
  es.shared_with_email,
  es.permission_level,
  e.title as ember_title,
  es.created_at
FROM ember_shares es
JOIN embers e ON es.ember_id = e.id
WHERE es.is_active = true
ORDER BY es.created_at DESC;`)} 
                variant="outline" 
                size="sm"
              >
                Recent Shares
              </Button>
            </div>
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