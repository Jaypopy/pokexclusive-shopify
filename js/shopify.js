// Explicitly export functions to global scope
console.log("Shopify.js loading...");

// Format shop name to ensure correct format
window.formatShopName = function (name) {
    console.log("formatShopName called with:", name);
    name = name.trim().toLowerCase();
    if (name.startsWith('http://')) name = name.substring(7);
    if (name.startsWith('https://')) name = name.substring(8);
    const slashIndex = name.indexOf('/');
    if (slashIndex > 0) name = name.substring(0, slashIndex);
    return name.endsWith('.myshopify.com') ? name : `${name}.myshopify.com`;
};

// Fetch shop information to test the connection
window.fetchShopInfo = async function () {
    const shopName = window.state.shopName;
    const accessToken = window.state.accessToken;

    try {
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        const shopUrl = `/shopify-api/admin/api/2023-07/shop.json?shop=${shopName}&token=${accessToken}&_=${timestamp}`;

        console.log("Fetching shop info from:", shopUrl);
        const response = await fetch(shopUrl);

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        return data.shop;
    } catch (error) {
        throw new Error(`Failed to connect: ${error.message}`);
    }
};

// Fetch unfulfilled orders from Shopify
window.fetchOrders = async function (maxAttempts = 3) {
    try {
        const { shopName, accessToken } = window.state;

        if (!shopName || !accessToken) {
            throw new Error('Missing shop name or access token');
        }

        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                // Add timestamp parameter to prevent caching
                const timestamp = Date.now();

                // Use our simplified-orders endpoint
                const response = await fetch(`/simplified-orders?shop=${shopName}&token=${accessToken}&_=${timestamp}`);

                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }

                const data = await response.json();

                // Format the orders for our app
                const formattedOrders = data.orders.map(order => ({
                    id: order.id.toString(),
                    orderNumber: order.name,
                    orderDate: new Date(order.created_at)
                }));

                return formattedOrders;
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
};

console.log("Shopify.js loaded successfully!");
