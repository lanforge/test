import { performance } from 'perf_hooks';

// Base URL of the API to test
const BASE_URL = process.env.API_URL || 'https://beta.lanforge.co/api';

// Generates a mock Object ID (fallback)
const generateMockId = () => {
  return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
};

interface EndpointConfig {
  path: string;
  method?: string;
  bodyFn?: (context: TestContext) => any;
}

interface TestContext {
  validProductId: string;
  validAccessoryId: string;
  validPartId: string;
}

// Complex Operations that simulate a full user journey
const PUBLIC_ENDPOINTS: EndpointConfig[] = [
  // --- BROWSING ---
  { path: '/accessories' },
  { path: '/products' },
  { path: '/pc-parts' },
  { path: '/reviews' },
  { path: '/services' },

  // --- CART & CUSTOMIZATION ---
  {
    path: '/carts/stress-test-session',
    method: 'PUT',
    bodyFn: (ctx) => ({
      items: [
        { product: ctx.validProductId, quantity: 1 },
        { accessory: ctx.validAccessoryId, quantity: 2 }
      ],
      guestEmail: 'stress@example.com'
    })
  },
  {
    path: '/custom-builds',
    method: 'POST',
    bodyFn: (ctx) => ({
      parts: [
        { part: ctx.validPartId, quantity: 1, partType: 'CPU' },
        { part: ctx.validPartId, quantity: 1, partType: 'GPU' }
      ],
      guestEmail: 'stress@example.com',
      name: 'Stress Test Build'
    })
  },

  // --- CHECKOUT PROCESS ---
  {
    path: '/checkout/validate',
    method: 'POST',
    bodyFn: (ctx) => ({
      items: [
        { product: ctx.validProductId, quantity: 1 }
      ]
    })
  },
  {
    path: '/shipping/rates',
    method: 'POST',
    bodyFn: () => ({
      addressTo: {
        name: "Stress Tester",
        street1: "123 Main St",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US"
      }
    })
  },
  {
    path: '/payments/stripe/create-checkout-intent',
    method: 'POST',
    bodyFn: () => ({
      amount: 1500.00,
      metadata: { stress_test: 'true' }
    })
  },
  {
    path: '/orders',
    method: 'POST',
    bodyFn: (ctx) => ({
      items: [
        { product: ctx.validProductId, quantity: 1 }
      ],
      shippingAddress: {
        firstName: "Stress",
        lastName: "Tester",
        address1: "123 Fake St",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US",
        phone: "555-555-5555"
      },
      billingAddress: {
        firstName: "Stress",
        lastName: "Tester",
        address1: "123 Fake St",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US"
      },
      paymentMethod: "stripe",
      shippingAmount: 29.99
    })
  }
];

interface StressTestOptions {
  concurrency: number;
  requestsPerEndpoint: number;
}

interface TestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number; // 2xx
  badRequests: number;        // 4xx (handled business logic)
  rateLimited: number;        // 429
  failedRequests: number;     // 5xx or network failures
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
  totalTime: number;
}

// Parses CLI arguments
function parseArgs(): StressTestOptions {
  const args = process.argv.slice(2);
  let concurrency = 20;
  let requestsPerEndpoint = 100;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-c' && i + 1 < args.length) {
      concurrency = parseInt(args[++i], 10);
    } else if (args[i] === '-r' && i + 1 < args.length) {
      requestsPerEndpoint = parseInt(args[++i], 10);
    }
  }

  return { concurrency, requestsPerEndpoint };
}

async function fetchValidIds(): Promise<TestContext> {
  console.log('Fetching valid IDs from API to simulate real interactions...');
  
  const ctx: TestContext = {
    validProductId: generateMockId(),
    validAccessoryId: generateMockId(),
    validPartId: generateMockId()
  };

  try {
    const pRes = await fetch(`${BASE_URL}/products`);
    if (pRes.ok) {
      const data: any = await pRes.json();
      if (data.products && data.products.length > 0) ctx.validProductId = data.products[0]._id;
    }

    const aRes = await fetch(`${BASE_URL}/accessories`);
    if (aRes.ok) {
      const data: any = await aRes.json();
      if (data.accessories && data.accessories.length > 0) ctx.validAccessoryId = data.accessories[0]._id;
    }

    const partRes = await fetch(`${BASE_URL}/pc-parts`);
    if (partRes.ok) {
      const data: any = await partRes.json();
      if (data.parts && data.parts.length > 0) ctx.validPartId = data.parts[0]._id;
    }
    console.log(`Setup complete. Product: ${ctx.validProductId}, Accessory: ${ctx.validAccessoryId}, Part: ${ctx.validPartId}`);
  } catch (error) {
    console.error('Failed to fetch valid IDs. Using mocks.');
  }

  return ctx;
}

// Tests a single endpoint under load
async function testEndpoint(config: EndpointConfig, ctx: TestContext, options: StressTestOptions): Promise<TestResult> {
  const url = `${BASE_URL}${config.path}`;
  const method = config.method || 'GET';
  
  console.log(`Testing [${method}] ${url} with ${options.requestsPerEndpoint} reqs @ concurrency ${options.concurrency}...`);
  
  let successfulRequests = 0;
  let badRequests = 0;
  let rateLimited = 0;
  let failedRequests = 0;
  let minLatency = Number.MAX_VALUE;
  let maxLatency = 0;
  let totalLatency = 0;
  
  const startTime = performance.now();
  
  // Helper to run a batch of requests concurrently
  const runBatch = async (batchSize: number) => {
    const promises = Array.from({ length: batchSize }).map(async () => {
      const reqStart = performance.now();
      try {
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'User-Agent': 'Stress-Test-Script/3.0',
            'Accept': 'application/json'
          }
        };

        if (config.bodyFn) {
          fetchOptions.body = JSON.stringify(config.bodyFn(ctx));
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, fetchOptions);
        
        const reqEnd = performance.now();
        const latency = reqEnd - reqStart;
        
        if (response.status >= 200 && response.status < 300) {
          successfulRequests++;
        } else if (response.status === 429) {
          rateLimited++;
        } else if (response.status >= 400 && response.status < 500) {
          badRequests++;
        } else {
          failedRequests++;
        }
        
        minLatency = Math.min(minLatency, latency);
        maxLatency = Math.max(maxLatency, latency);
        totalLatency += latency;
      } catch (error) {
        failedRequests++;
      }
    });
    
    await Promise.all(promises);
  };

  // Run in chunks based on concurrency limit
  let remainingRequests = options.requestsPerEndpoint;
  while (remainingRequests > 0) {
    const batchSize = Math.min(remainingRequests, options.concurrency);
    await runBatch(batchSize);
    remainingRequests -= batchSize;
  }

  const endTime = performance.now();
  
  return {
    endpoint: config.path.split('?')[0].substring(0, 25), // truncated for table
    method,
    totalRequests: options.requestsPerEndpoint,
    successfulRequests,
    badRequests,
    rateLimited,
    failedRequests,
    minLatency: minLatency === Number.MAX_VALUE ? 0 : minLatency,
    maxLatency,
    avgLatency: (successfulRequests + badRequests + rateLimited + failedRequests) > 0 ? totalLatency / (successfulRequests + badRequests + rateLimited + failedRequests) : 0,
    totalTime: endTime - startTime
  };
}

async function main() {
  const options = parseArgs();
  console.log(`Starting extreme checkout stress test on ${BASE_URL}`);
  
  // 1. Setup Context
  const context = await fetchValidIds();

  console.log(`Endpoints: ${PUBLIC_ENDPOINTS.length}`);
  console.log(`Concurrency: ${options.concurrency}`);
  console.log(`Requests per endpoint: ${options.requestsPerEndpoint}`);
  console.log('--------------------------------------------------\n');

  const results: TestResult[] = [];

  // Run all endpoints in sequence
  for (const config of PUBLIC_ENDPOINTS) {
    const result = await testEndpoint(config, context, options);
    results.push(result);
  }

  console.log('\n================ RESULTS ================');
  console.table(
    results.map(r => ({
      Method: r.method,
      Endpoint: r.endpoint,
      '2xx': r.successfulRequests,
      '4xx': r.badRequests,
      '429 (Rate Limit)': r.rateLimited,
      '5xx': r.failedRequests,
      'Min (ms)': Math.round(r.minLatency),
      'Max (ms)': Math.round(r.maxLatency),
      'Avg (ms)': Math.round(r.avgLatency),
      'Total Time (s)': (r.totalTime / 1000).toFixed(2)
    }))
  );
  
  const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const totalSuccess = results.reduce((sum, r) => sum + r.successfulRequests, 0);
  const totalBad = results.reduce((sum, r) => sum + r.badRequests, 0);
  const totalRateLimited = results.reduce((sum, r) => sum + r.rateLimited, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failedRequests, 0);
  
  console.log('\nSummary:');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful (2xx): ${totalSuccess}`);
  console.log(`Bad Request/Other 4xx: ${totalBad}`);
  console.log(`Rate Limited (429): ${totalRateLimited}`);
  console.log(`Server Errors (5xx): ${totalFailed}`);
  
  if (totalFailed > 0) {
    console.log('\nWarning: Some requests caused 5xx errors. The server might be rate-limiting or crashing.');
  } else {
    console.log('\nSuccess! The server handled the load successfully.');
  }
}

main().catch(console.error);
