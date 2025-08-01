const axios = require('axios');
const https = require('https');

// Disable SSL verification for BioTime API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const axiosConfig = {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 120000 // 2 minutes timeout
};

async function emergencyJulyFix() {
    console.log('🚨 EMERGENCY JULY 20-21 DATA FIX STARTING...');
    
    try {
        // Step 1: Authenticate with BioTime API
        console.log('🔐 Authenticating with BioTime API...');
        const authResponse = await axios.post(
            'https://192.168.10.201/jwt-api-token-auth/',
            { username: 'naeem', password: '4Lf58g!J8G2u' },
            axiosConfig
        );
        
        const token = authResponse.data.token;
        console.log('✅ Authentication successful');

        // Step 2: Fetch data for July 20th and 21st
        const dates = ['2025-07-20', '2025-07-21'];
        let totalRecords = 0;
        
        for (const date of dates) {
            console.log(`\n📅 Fetching data for ${date}...`);
            
            try {
                const response = await axios.get(
                    `https://192.168.10.201/iclock/api/transactions/`,
                    {
                        ...axiosConfig,
                        params: {
                            start_time: `${date} 00:00:00`,
                            end_time: `${date} 23:59:59`,
                            page: 1,
                            page_size: 1000
                        },
                        headers: { Authorization: `JWT ${token}` }
                    }
                );
                
                const records = response.data.data || [];
                console.log(`📊 Found ${records.length} records for ${date}`);
                
                if (records.length > 0) {
                    console.log('Sample record:', {
                        id: records[0].id,
                        emp_code: records[0].emp_code,
                        punch_time: records[0].punch_time,
                        punch_state: records[0].punch_state
                    });
                    totalRecords += records.length;
                } else {
                    console.log(`❌ NO DATA FOUND for ${date} - this explains missing attendance!`);
                }
                
            } catch (error) {
                console.error(`❌ Error fetching ${date}:`, error.message);
            }
        }
        
        console.log(`\n📈 TOTAL RECORDS FOUND: ${totalRecords}`);
        
        if (totalRecords === 0) {
            console.log('\n🔍 DIAGNOSIS: BioTime API has NO DATA for July 20-21');
            console.log('This is why the pollers cannot process anything - source has no data!');
            console.log('Solutions:');
            console.log('1. Check if BioTime system was offline on these dates');
            console.log('2. Check if employees had manual attendance that needs to be imported');
            console.log('3. Create synthetic attendance data for demonstration purposes');
        } else {
            console.log('✅ Data exists in BioTime API - pollers should be able to fetch it');
        }
        
    } catch (error) {
        console.error('❌ Emergency fix failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run immediately
emergencyJulyFix()
    .then(() => {
        console.log('✅ Emergency diagnostic completed');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Emergency diagnostic failed:', err);
        process.exit(1);
    });