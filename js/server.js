const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Add request logging middleware for ALL requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve static files
app.use(express.static('.'));

// Generic Shopify proxy using middleware
app.use('/shopify-api', async (req, res) => {
    try {
        const shop = req.query.shop;
        const token = req.query.token;

        if (!shop || !token) {
            return res.status(400).json({ error: 'Missing shop or token parameter' });
        }

        // Extract the path after /shopify-api
        const apiPath = req.url.split('?')[0];  // Get path without query string

        // Build the target URL
        const targetUrl = `https://${shop}${apiPath}`;
        console.log(`Shopify API request to: ${targetUrl}`);

        // Create a new URLSearchParams object without shop and token
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(req.query)) {
            if (key !== 'shop' && key !== 'token') {
                queryParams.append(key, value);
            }
        }

        // Append the query string if there are parameters
        const queryString = queryParams.toString();
        const fullUrl = `${targetUrl}${queryString ? '?' + queryString : ''}`;

        console.log(`Making request to: ${fullUrl}`);

        // Make the request to Shopify
        const response = await fetch(fullUrl, {
            headers: {
                'X-Shopify-Access-Token': token,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log(`Shopify API responded with status: ${response.status}`);

        // Get the response data
        const data = await response.text();

        // Forward status code
        res.status(response.status);

        // Forward content type
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.set('Content-Type', contentType);
        }

        // Send the response
        res.send(data);
    } catch (error) {
        console.error('Shopify API proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Simplified orders endpoint that returns only essential data
app.get('/simplified-orders', async (req, res) => {
    try {
        const shop = req.query.shop;
        const token = req.query.token;

        if (!shop || !token) {
            return res.status(400).json({ error: 'Missing shop or token parameter' });
        }

        console.log(`Fetching simplified orders for shop: ${shop}`);

        // Construct the Shopify API URL for unfulfilled orders
        const fullUrl = `https://${shop}/admin/api/2023-07/orders.json?status=open&fulfillment_status=unfulfilled&limit=50`;

        // Make the request to Shopify
        const response = await fetch(fullUrl, {
            headers: {
                'X-Shopify-Access-Token': token,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Shopify API error: ${response.status}`);
            return res.status(response.status).json({ error: `Shopify API error: ${response.status}` });
        }

        // Parse the response
        const rawData = await response.json();

        // Extract only the data we need
        const simplifiedOrders = rawData.orders.map(order => {
            return {
                id: order.id,
                name: order.name,
                created_at: order.created_at,
                current_total_price: order.current_total_price,
                products: order.line_items.map(item => ({
                    name: item.title,
                    quantity: item.quantity,
                    price: item.price
                }))
            };
        });

        // Return the simplified data
        res.json({ orders: simplifiedOrders });

    } catch (error) {
        console.error('Error fetching simplified orders:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} at ${new Date().toISOString()}`);
});