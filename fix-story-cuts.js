// Fix Story Cuts Voice Format Script
// Run this to convert existing story cuts from inline format to [EMBER VOICE] format

import { fixStoryCutsVoiceFormat } from './src/lib/fixDatabase.js';

async function runFix() {
    try {
        console.log('🚀 Starting story cuts voice format fix...');

        const result = await fixStoryCutsVoiceFormat();

        console.log('\n📊 Fix Results:');
        console.log(`Total story cuts: ${result.totalStoryCuts}`);
        console.log(`Fixed: ${result.fixedCount}`);
        console.log(`Skipped: ${result.skippedCount}`);

        if (result.results.length > 0) {
            console.log('\n📋 Detailed Results:');
            result.results.forEach(item => {
                if (item.success) {
                    console.log(`✅ ${item.title}: ${item.changes}`);
                } else {
                    console.log(`❌ ${item.title}: ${item.error}`);
                }
            });
        }

        console.log('\n🎉 Fix complete!');

    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    }
}

// Run the fix
runFix(); 