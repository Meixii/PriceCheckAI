// Simple test to verify API response structure
const axios = require('axios');

async function testAPI() {
    console.log('🧪 Testing API response structure...\n');
    
    try {
        console.log('📡 Making request to: http://localhost:3000/scrape/all?SEARCH_TERM=paracetamol');
        
        const response = await axios.get('http://localhost:3000/scrape/all?SEARCH_TERM=paracetamol', {
            timeout: 120000 // 2 minute timeout
        });
        
        console.log('Response received!');
        console.log('Status Code:', response.status);
        console.log('Response Status:', response.data.status);
        console.log('Message:', response.data.message);
        
        console.log('\nData Structure:');
        console.log('- Data keys:', Object.keys(response.data.data || {}));
        
        // Check each source
        Object.entries(response.data.data || {}).forEach(([source, products]) => {
            console.log(`- ${source}: ${products.length} products`);
            if (products.length > 0) {
                console.log(`  Sample product:`, {
                    title: products[0].title?.substring(0, 50) + '...',
                    price: products[0].price,
                    hasLink: !!products[0].link
                });
            }
        });
        
        if (response.data.errors) {
            console.log('\nErrors:');
            Object.entries(response.data.errors).forEach(([source, error]) => {
                console.log(`- ${source}: ${error}`);
            });
        }
        
        if (response.data.summary) {
            console.log('\nSummary:');
            console.log(`- Total Products: ${response.data.summary.totalProducts}`);
            console.log(`- Successful Sources: ${response.data.summary.successfulSources}`);
            console.log(`- Failed Sources: ${response.data.summary.failedSources}`);
        }
        
        // Test if the response structure matches what frontend expects
        console.log('\nFrontend Compatibility Check:');
        const hasValidData = response.data.data && typeof response.data.data === 'object';
        const hasValidStatus = response.data.status === 'success';
        
        console.log(`- Valid data structure: ${hasValidData ? 'Yes' : 'No'}`);
        console.log(`- Success status: ${hasValidStatus ? 'Yes' : 'No'}`);
        
        if (hasValidData && hasValidStatus) {
            console.log('\nAPI is working correctly! Frontend should display results.');
        } else {
            console.log('\nAPI response structure issue detected.');
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\nBackend server is not running!');
            console.log('   Start it with: npm run dev in the backend directory');
        } else if (error.code === 'ECONNRESET' || error.message.includes('timeout')) {
            console.log('\nRequest timed out - this is normal for the first run');
            console.log('   The scraping process can take 1-2 minutes');
        }
    }
}

// Run the test
testAPI(); 