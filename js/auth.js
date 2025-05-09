// Basic authentication for Shopify API

// Initialize auth from localStorage if available
function initAuth() {
    // Make sure the state object exists
    if (typeof window.state === 'undefined') {
        console.error('State object not initialized');
        return false;
    }

    const savedToken = localStorage.getItem('accessToken');
    const savedShop = localStorage.getItem('shopName');

    if (savedToken && savedShop) {
        window.state.accessToken = savedToken;
        window.state.shopName = savedShop;
        window.state.isConnected = true;
        return true;
    }
    return false;
}

// Save credentials
function saveCredentials(shop, token) {
    localStorage.setItem('shopName', shop);
    localStorage.setItem('accessToken', token);

    // Make sure the state object exists
    if (typeof window.state !== 'undefined') {
        window.state.shopName = shop;
        window.state.accessToken = token;
        window.state.isConnected = true;
    }
}

// Check if user is already authenticated
function checkAuthentication() {
    return initAuth();
}

// Clear credentials on logout
function clearCredentials() {
    localStorage.removeItem('shopName');
    localStorage.removeItem('accessToken');

    // Make sure the state object exists
    if (typeof window.state !== 'undefined') {
        window.state.shopName = '';
        window.state.accessToken = '';
        window.state.isConnected = false;
    }
}

// Add login form handler for login.html
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const shopName = document.getElementById('shopName').value;
            if (!shopName) {
                const errorElement = document.getElementById('login-error');
                if (errorElement) {
                    errorElement.textContent = 'Please enter your Shopify store name';
                    errorElement.classList.remove('hidden');
                }
                return;
            }

            // Format shop name
            const formattedShop = formatShopName(shopName);

            // For our simplified authentication, redirect to the main app
            // In a real app, this would go through OAuth
            saveCredentials(formattedShop, 'direct_access_token');
            window.location.href = 'index.html';
        });
    }

    // If we're on login page but already authenticated, redirect to app
    if (window.location.pathname.includes('login.html') && checkAuthentication()) {
        window.location.href = 'index.html';
    }
});