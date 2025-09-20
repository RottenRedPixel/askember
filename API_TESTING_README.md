# AskEmber API Connection Testing

This directory contains comprehensive testing tools for all external API connections used in the AskEmber application.

## What Gets Tested

### 🗄️ **Supabase (Database & Auth)**
- Connection to Supabase instance
- Database access and RPC functionality
- Authentication service availability

### 🤖 **OpenAI API**
- API connection and authentication
- GPT models availability
- Chat completion functionality
- Image analysis capabilities

### 🎤 **ElevenLabs API**
- Voice API connection
- Text-to-Speech functionality
- Available voices list
- Speech-to-Text capabilities

### 🌍 **Nominatim/OpenStreetMap**
- Reverse geocoding service
- Address resolution functionality

### 🛣️ **API Routes** (if server running)
- `/api/ai-title-suggestion` - AI title generation
- `/api/analyze-image` - Image analysis
- `/api/generate-story-cut` - Story generation
- `/api/process-exif` - EXIF data processing

## How to Run Tests

### Method 1: NPM Script (Recommended)
```bash
npm run test:api
```

### Method 2: Direct Node.js
```bash
node api-connection-test.js
```

### Method 3: Platform-Specific Scripts

**Windows:**
```cmd
test-api-connections.bat
```

**Linux/macOS:**
```bash
chmod +x test-api-connections.sh
./test-api-connections.sh
```

## Required Environment Variables

Create a `.env.local` file in your project root with these variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
# OR alternatively:
VITE_OPENAI_API_KEY=your_openai_api_key

# ElevenLabs Configuration
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional: Custom test URL
TEST_BASE_URL=http://localhost:3000
```

## Understanding Test Results

### ✅ **PASS** - Connection successful
The API is accessible and responding correctly.

### ❌ **FAIL** - Connection failed
Check the error message for details. Common issues:
- Missing API keys
- Invalid credentials
- Network connectivity issues
- Service temporarily unavailable

### ⚠️ **Timeout** - Request took too long
The service may be slow or experiencing issues.

## Test Output Example

```
🚀 Starting API Connection Tests for AskEmber
================================================

📋 Configuration Check:
Supabase URL: ✅ Set
Supabase Anon Key: ✅ Set
OpenAI API Key: ✅ Set
ElevenLabs API Key: ✅ Set
Test Base URL: http://localhost:3000

🔍 Running Connection Tests:
==============================
Testing: Supabase Basic Connection
✅ Supabase Basic Connection (245ms)
Testing: Supabase Database Access
✅ Supabase Database Access (156ms)
Testing: OpenAI API Connection
✅ OpenAI API Connection (432ms)
Testing: OpenAI Chat Completion
✅ OpenAI Chat Completion (1203ms)
Testing: ElevenLabs API Connection
✅ ElevenLabs API Connection (678ms)
Testing: ElevenLabs Text-to-Speech
✅ ElevenLabs Text-to-Speech (2145ms)
Testing: Nominatim Geocoding Service
✅ Nominatim Geocoding Service (534ms)

📊 Test Results Summary:
========================
Total Tests: 7
Passed: 7
Failed: 0
Success Rate: 100%
```

## Troubleshooting

### Common Issues

**❌ Missing Environment Variables**
- Ensure all required environment variables are set
- Check `.env.local` file exists and is properly formatted
- Verify no typos in variable names

**❌ Network Connection Issues**
- Check internet connectivity
- Verify firewall settings
- Check if you're behind a corporate proxy

**❌ Invalid API Keys**
- Verify API keys are correct and active
- Check if the keys have proper permissions
- Ensure billing is current for paid services

**❌ Supabase RLS (Row Level Security) Issues**
- Check if your Supabase project has proper policies
- Verify the anon key has necessary permissions
- Test with service role key if needed

**❌ Local Server Not Running**
- API route tests will fail if the dev server isn't running
- Start the server with `npm run dev` before testing
- These tests are optional for external API validation

### Getting Help

1. Check the error messages in the test output
2. Verify your environment variables
3. Check the service status pages:
   - [OpenAI Status](https://status.openai.com/)
   - [ElevenLabs Status](https://status.elevenlabs.io/)
   - [Supabase Status](https://status.supabase.com/)

## Test Configuration

You can modify test behavior by setting these environment variables:

```env
# Timeout for each test (milliseconds)
API_TEST_TIMEOUT=30000

# Base URL for API route testing
TEST_BASE_URL=http://localhost:3000

# Skip certain test categories (comma-separated)
SKIP_TESTS=elevenlabs,api-routes
```

## Files in This Testing Suite

- `api-connection-test.js` - Main test script
- `test-api-connections.bat` - Windows batch file
- `test-api-connections.sh` - Unix shell script
- `API_TESTING_README.md` - This documentation
- `package.json` - Updated with `npm run test:api` script

## Integration with CI/CD

You can integrate these tests into your continuous integration pipeline:

```yaml
# GitHub Actions example
- name: Test API Connections
  run: npm run test:api
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    VITE_ELEVENLABS_API_KEY: ${{ secrets.VITE_ELEVENLABS_API_KEY }}
```

Happy testing! 🚀
