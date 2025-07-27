// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Add cache control headers to prevent browser caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Serve static files from the root directory (one level up from js/)
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
}));

app.get('/', (req, res) => {
    // Send the index.html file from the root directory
    res.sendFile('index.html', {
        root: path.join(__dirname, '..'),
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, private'
        }
    });
});

// Shopify API proxy
app.use('/shopify-api', async (req, res) => {
    try {
        const shop = req.query.shop;
        const token = req.query.token;

        if (!shop || !token) {
            return res.status(400).json({ error: 'Missing shop or token parameter' });
        }

        // Extract path after /shopify-api
        const apiPath = req.url.split('?')[0];  // Get path without query string
        const targetUrl = `https://${shop}${apiPath}`;

        console.log(`Proxying request to: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                'X-Shopify-Access-Token': token,
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Shopify API proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Real orders endpoint - fetches actual data from Shopify
app.get('/simplified-orders', async (req, res) => {
    try {
        const shop = req.query.shop;
        const token = req.query.token;

        if (!shop || !token) {
            return res.status(400).json({ error: 'Missing shop or token parameter' });
        }

        // Fetch unfulfilled orders from Shopify
        const timestamp = Date.now(); // Add timestamp to prevent caching
        const url = `https://${shop}/admin/api/2023-07/orders.json?status=open&fulfillment_status=unfulfilled&limit=50&_=${timestamp}`;

        console.log(`Fetching orders from: ${url}`);

        const response = await fetch(url, {
            headers: {
                'X-Shopify-Access-Token': token,
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `Shopify API error: ${response.status}` });
        }

        const data = await response.json();

        // Format orders for our app
        const orders = data.orders.map(order => ({
            id: order.id,
            name: order.name,
            created_at: order.created_at
        }));

        // Add a timestamp to prevent caching
        res.json({
            orders,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error fetching orders from Shopify:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
