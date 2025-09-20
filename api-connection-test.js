/**
 * Comprehensive API Connection Test Suite
 * Tests all external API connections used in the AskEmber application
 * 
 * Usage: node api-connection-test.js
 * 
 * This script tests:
 * - Supabase connection and authentication
 * - OpenAI API (GPT-4, image analysis)
 * - ElevenLabs API (TTS, STT, voices)
 * - Nominatim/OpenStreetMap (geocoding)
 * - All API routes in the /api directory
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration - Load from environment or set defaults
const config = {
    supabase: {
        url: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
    },
    elevenlabs: {
        apiKey: process.env.VITE_ELEVENLABS_API_KEY
    },
    testing: {
        baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
        timeout: 30000 // 30 seconds
    }
};

// Test results collector
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utility functions
const log = (message, type = 'info') => {
    const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        error: '\x1b[31m',
        warning: '\x1b[33m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
};

const test = (name, testFn) => {
    return new Promise(async (resolve) => {
        const startTime = Date.now();
        try {
            log(`Testing: ${name}`, 'info');
            await testFn();
            const duration = Date.now() - startTime;
            log(`✅ ${name} (${duration}ms)`, 'success');
            results.passed++;
            results.tests.push({ name, status: 'PASS', duration });
            resolve(true);
        } catch (error) {
            const duration = Date.now() - startTime;
            log(`❌ ${name}: ${error.message} (${duration}ms)`, 'error');
            results.failed++;
            results.tests.push({ name, status: 'FAIL', error: error.message, duration });
            resolve(false);
        }
    });
};

// Test timeout wrapper
const withTimeout = (promise, timeoutMs = config.testing.timeout) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Test timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
};

// 1. Supabase Connection Tests
const testSupabaseConnection = async () => {
    if (!config.supabase.url || !config.supabase.anonKey) {
        throw new Error('Missing Supabase configuration (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)');
    }

    const supabase = createClient(config.supabase.url, config.supabase.anonKey);

    // Test basic connection
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && error.message !== 'JWT expired') {
        throw new Error(`Supabase connection failed: ${error.message}`);
    }

    return true;
};

const testSupabaseDatabase = async () => {
    if (!config.supabase.url || !config.supabase.anonKey) {
        throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(config.supabase.url, config.supabase.anonKey);

    // Test a simple RPC call that should exist
    try {
        const { data, error } = await supabase.rpc('get_active_prompt', {
            prompt_key_param: 'test_connection'
        });

        // We don't care if the prompt exists, just that the RPC works
        if (error && !error.message.includes('not found')) {
            throw new Error(`Database RPC failed: ${error.message}`);
        }
    } catch (rpcError) {
        // Try a simpler test - just check if we can query a system table
        const { error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
        if (error) {
            throw new Error(`Database query failed: ${error.message}`);
        }
    }

    return true;
};

// 2. OpenAI API Tests
const testOpenAIConnection = async () => {
    if (!config.openai.apiKey) {
        throw new Error('Missing OpenAI API key (OPENAI_API_KEY or VITE_OPENAI_API_KEY)');
    }

    const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
            'Authorization': `Bearer ${config.openai.apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response from OpenAI API');
    }

    return true;
};

const testOpenAIChat = async () => {
    if (!config.openai.apiKey) {
        throw new Error('Missing OpenAI API key');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.openai.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello! This is a test.' }],
            max_tokens: 10
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI Chat API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI Chat API');
    }

    return true;
};

// 3. ElevenLabs API Tests
const testElevenLabsConnection = async () => {
    if (!config.elevenlabs.apiKey) {
        throw new Error('Missing ElevenLabs API key (VITE_ELEVENLABS_API_KEY)');
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
            'xi-api-key': config.elevenlabs.apiKey
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorData.detail || response.statusText}`);
    }

    const data = await response.json();
    if (!data.voices || !Array.isArray(data.voices)) {
        throw new Error('Invalid response from ElevenLabs API');
    }

    return true;
};

const testElevenLabsTTS = async () => {
    if (!config.elevenlabs.apiKey) {
        throw new Error('Missing ElevenLabs API key');
    }

    // Use a known default voice ID
    const defaultVoiceId = 'pNInz6obpgDQGcFmaJgB';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': config.elevenlabs.apiKey
        },
        body: JSON.stringify({
            text: 'Test',
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorData.detail || response.statusText}`);
    }

    // Check if response is audio
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('audio')) {
        throw new Error('TTS did not return audio content');
    }

    return true;
};

// 4. Nominatim/OpenStreetMap Geocoding Test
const testNominatimGeocoding = async () => {
    const testLat = 40.7128;
    const testLng = -74.0060; // New York City coordinates

    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${testLat}&lon=${testLng}&zoom=18&addressdetails=1`,
        {
            headers: {
                'User-Agent': 'AskEmber-App-Test'
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.display_name) {
        throw new Error('Invalid response from Nominatim API');
    }

    return true;
};

// 5. API Routes Tests (if server is running)
const testAPIRoute = async (route, method = 'GET', body = null) => {
    const url = `${config.testing.baseUrl}${route}`;

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // We just want to check if the route exists, not if it succeeds with our test data
    if (response.status === 404) {
        throw new Error(`API route not found: ${route}`);
    }

    return true;
};

// Main test runner
const runTests = async () => {
    log('🚀 Starting API Connection Tests for AskEmber', 'info');
    log('================================================', 'info');

    // Environment check
    log('\n📋 Configuration Check:', 'info');
    log(`Supabase URL: ${config.supabase.url ? '✅ Set' : '❌ Missing'}`, config.supabase.url ? 'success' : 'error');
    log(`Supabase Anon Key: ${config.supabase.anonKey ? '✅ Set' : '❌ Missing'}`, config.supabase.anonKey ? 'success' : 'error');
    log(`OpenAI API Key: ${config.openai.apiKey ? '✅ Set' : '❌ Missing'}`, config.openai.apiKey ? 'success' : 'error');
    log(`ElevenLabs API Key: ${config.elevenlabs.apiKey ? '✅ Set' : '❌ Missing'}`, config.elevenlabs.apiKey ? 'success' : 'error');
    log(`Test Base URL: ${config.testing.baseUrl}`, 'info');

    log('\n🔍 Running Connection Tests:', 'info');
    log('==============================', 'info');

    // Supabase Tests
    await test('Supabase Basic Connection', () => withTimeout(testSupabaseConnection()));
    await test('Supabase Database Access', () => withTimeout(testSupabaseDatabase()));

    // OpenAI Tests
    await test('OpenAI API Connection', () => withTimeout(testOpenAIConnection()));
    await test('OpenAI Chat Completion', () => withTimeout(testOpenAIChat()));

    // ElevenLabs Tests
    await test('ElevenLabs API Connection', () => withTimeout(testElevenLabsConnection()));
    await test('ElevenLabs Text-to-Speech', () => withTimeout(testElevenLabsTTS()));

    // Geocoding Tests
    await test('Nominatim Geocoding Service', () => withTimeout(testNominatimGeocoding()));

    // API Routes Tests (only if server is running)
    log('\n🌐 Testing API Routes (if server is running):', 'info');
    log('================================================', 'info');

    const apiRoutes = [
        { path: '/api/ai-title-suggestion', method: 'POST', body: { emberData: {}, type: 'single' } },
        { path: '/api/analyze-image', method: 'POST', body: { emberId: 'test', imageUrl: 'https://example.com/image.jpg' } },
        { path: '/api/generate-story-cut', method: 'POST', body: { formData: {}, selectedStyle: 'test' } },
        { path: '/api/process-exif', method: 'POST', body: { photoId: 'test', imageUrl: 'https://example.com/image.jpg' } }
    ];

    for (const route of apiRoutes) {
        await test(`API Route: ${route.path}`, async () => {
            try {
                await withTimeout(testAPIRoute(route.path, route.method, route.body), 5000);
            } catch (error) {
                if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
                    throw new Error('Local server not running (this is optional for most tests)');
                }
                throw error;
            }
        });
    }

    // Final Results
    log('\n📊 Test Results Summary:', 'info');
    log('========================', 'info');
    log(`Total Tests: ${results.passed + results.failed}`, 'info');
    log(`Passed: ${results.passed}`, 'success');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
    log(`Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`, results.failed > 0 ? 'warning' : 'success');

    if (results.failed > 0) {
        log('\n❌ Failed Tests:', 'error');
        results.tests.filter(t => t.status === 'FAIL').forEach(test => {
            log(`  • ${test.name}: ${test.error}`, 'error');
        });
    }

    log('\n✅ Passed Tests:', 'success');
    results.tests.filter(t => t.status === 'PASS').forEach(test => {
        log(`  • ${test.name} (${test.duration}ms)`, 'success');
    });

    log('\n🎯 Recommendations:', 'info');

    if (!config.supabase.url || !config.supabase.anonKey) {
        log('  • Configure Supabase environment variables', 'warning');
    }
    if (!config.openai.apiKey) {
        log('  • Configure OpenAI API key for AI features', 'warning');
    }
    if (!config.elevenlabs.apiKey) {
        log('  • Configure ElevenLabs API key for voice features', 'warning');
    }
    if (results.tests.some(t => t.name.includes('API Route') && t.status === 'FAIL')) {
        log('  • Start local development server to test API routes', 'warning');
    }

    log('\n✨ Testing Complete!', 'success');

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
};

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
    log(`❌ Unhandled error: ${error.message}`, 'error');
    process.exit(1);
});

// Run the tests
runTests().catch((error) => {
    log(`❌ Test runner failed: ${error.message}`, 'error');
    process.exit(1);
});
