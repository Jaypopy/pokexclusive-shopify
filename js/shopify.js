// Optimized Shopify API integration focusing on unfulfilled orders

// Format shop name to ensure correct format
function formatShopName(name) {
    name = name.trim().toLowerCase();
    if (name.startsWith('http://')) name = name.substring(7);
    if (name.startsWith('https://')) name = name.substring(8);
    const slashIndex = name.indexOf('/');
    if (slashIndex > 0) name = name.substring(0, slashIndex);
    return name.endsWith('.myshopify.com') ? name : `${name}.myshopify.com`;
}

// Fetch shop information to test the connection
async function fetchShopInfo() {
    const shopName = state.shopName;
    const accessToken = state.accessToken;

    try {
        // Use proxy instead of direct request
        const shopUrl = `/shopify-api/admin/api/2023-07/shop.json?shop=${shopName}&token=${accessToken}`;

        const response = await fetch(shopUrl);

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        return data.shop;
    } catch (error) {
        throw new Error(`Failed to connect: ${error.message}`);
    }
}

// Fetch unfulfilled orders from Shopify
async function fetchOrders(maxAttempts = 3) {
    try {
        const { shopName, accessToken } = window.state;

        if (!shopName || !accessToken) {
            throw new Error('Missing shop name or access token');
        }

        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                // Use the new simplified-orders endpoint
                const response = await fetch(`/simplified-orders?shop=${shopName}&token=${accessToken}`);

                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }

                const data = await response.json();
                // The simplified orders are already processed, just map them to our app format
                return data.orders.map(order => ({
                    id: order.id.toString(),
                    orderNumber: order.name,
                    orderDate: new Date(order.created_at),
                    queuePosition: 0, // Will be set by the app
                    orderItems: order.products.map(product => ({
                        id: product.id ? product.id.toString() : Math.random().toString(),
                        title: product.name,
                        variant: '',
                        quantity: product.quantity,
                        price: parseFloat(product.price),
                        imageUrl: ''
                    })),
                    totalPrice: parseFloat(order.current_total_price)
                }));
            } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) throw error;
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        if (typeof updateStatus === 'function') {
            updateStatus(`Failed to fetch orders: ${error.message}`, 'error');
        }
        throw error;
    }
}

// Process orders from Shopify into our application format - simplified
function processOrders(shopifyOrders) {
    const orders = [];
    let position = 1;

    for (const order of shopifyOrders) {
        // Convert to our format with only essential fields
        const processedOrder = {
            id: order.id.toString(),
            orderNumber: order.name,
            customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
            orderDate: new Date(order.created_at),
            queuePosition: position++,
            orderItems: processLineItems(order.line_items),
            totalPrice: parseFloat(order.total_price)
        };

        orders.push(processedOrder);
    }

    return orders;
}

// Process line items - simplified to essential fields
function processLineItems(lineItems) {
    return lineItems.map(item => ({
        id: item.id.toString(),
        title: item.title,
        variant: item.variant_title || '',
        quantity: item.quantity,
        price: parseFloat(item.price),
        imageUrl: item.image ? item.image.src : ''
    }));
}