#!/usr/bin/env tsx

import pino from 'pino';

const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

async function testFetch(symbol: string) {
  const url = `https://iq.vietcap.com.vn/api/iq-insight-service/v1/valuation/${symbol}/peer-comparison?sectorType=RA`;
  
  logger.info(`Testing fetch for ${symbol}`);
  logger.info(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
        'Authorization': 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJyb2xlIjoiVVNFUiIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwidXNlcl90eXBlIjoiT1JHQU5JWkFUSU9OIiwiYWNjb3VudE5vIjoia2lldC50cmFuQHZpbmFjYXBpdGFsLmNvbSIsInNlc3Npb25faWQiOiI5NDFjNTQ1ZC1hM2EzLTQ4YzctYTEzNi04MGQwYTkwZmRiOTIiLCJjbGllbnRfdHlwZSI6MSwidXVpZCI6ImUzMGI4YmZmLWIwYzctNDFjNi05NDlkLWE4NTJhZTBiMDk1MSIsImVtYWlsIjoia2lldC50cmFuQHZpbmFjYXBpdGFsLmNvbSIsImNsaWVudF9pZCI6ImE2NzA5MTRjLTg5NjQtNGIyYy1hMjg5LTZkZTRkNWI5ZDJjNCIsInVzZXJuYW1lIjoia2lldC50cmFuQHZpbmFjYXBpdGFsLmNvbSIsImlhdCI6MTc1NzkzMTY3MiwiZXhwIjoxNzU4NTM2NDcyfQ.wP5RSKVPhVIfZmu5jQKVFvNdexzq09KzKRQaFQjnSlkefRfSzUbyJYsfxTP4fk8w0GitSGUNiHx8714iZ8A4NynIa8MhvC2nYgWO8kyuCOi-vzFTzRd-9BGofNT5iHJspbH94jrleokrwPsvhlc068UW9fgHMr1pyzeuw14C2ysyveVScEjQbgPxVqv3EbRBYdzW5iryivzuSGV_J6gvQASfeuP-1QRe-k_SkEVHHAflbWEssp6mhWK25HSrDPC5CVPnbR5mQQHn9_zng0USDtCgA5a7_3jyPwgEtpNIJNS3gCLT6FcKtpPkKkMXJ-s15L48zJ_1mXTyhYop_JWgWg',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://iq.vietcap.com.vn',
        'Referer': 'https://iq.vietcap.com.vn/',
      },
    });

    logger.info(`Response status: ${response.status}`);
    logger.info(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    
    const text = await response.text();
    logger.info(`Response body: ${text}`);
    
    try {
      const data = JSON.parse(text);
      if (data.data && Array.isArray(data.data)) {
        logger.info(`✅ SUCCESS: Got ${data.data.length} records`);
        if (data.data.length > 0) {
          logger.info(`First record: ${JSON.stringify(data.data[0], null, 2)}`);
        }
      } else {
        logger.warn(`⚠️ No data array in response`);
      }
    } catch (e) {
      logger.error(`Failed to parse JSON: ${e}`);
    }
    
  } catch (error) {
    logger.error(`❌ Error: ${error}`);
  }
}

// Test với ACB
const symbol = process.argv[2] || 'ACB';
testFetch(symbol).then(() => process.exit(0));