// Simplified application logic
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const settingsLogo = document.getElementById('settingsLogo');
    const apiSettings = document.getElementById('api-settings');
    const connectBtn = document.getElementById('connectBtn');
    const statusText = document.getElementById('status-text');
    const backgroundImageInput = document.getElementById('backgroundImage');
    const orderBoxBackgroundInput = document.getElementById('orderBoxBackground');
    const upcomingOrderBackgroundInput = document.getElementById('upcomingOrderBackground');
    const mainContainer = document.getElementById('main-container');
    const nextOrderNumberElement = document.getElementById('next-order-number');
    const queueCountElement = document.getElementById('queue-count');
    const nextOrderBox = document.getElementById('next-order-box');
    const textColorInput = document.getElementById('nextOrderTextColor');
    const borderColorInput = document.getElementById('nextOrderBorderColor');
    const overlayColorInput = document.getElementById('overlayColor');
    const overlayOpacityInput = document.getElementById('overlayOpacity');
    const opacityValueSpan = document.getElementById('opacityValue');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const upcomingOrdersElement = document.getElementById('upcoming-orders');

    // Application state - make it a window-level variable for cross-script access
    window.state = {
        activeOrders: [],
        inactiveOrders: [], // Array for inactive orders
        shopName: localStorage.getItem('shopName') || '',
        accessToken: localStorage.getItem('accessToken') || '',
        isConnected: false,
        showingInactive: false // Track if we're showing inactive orders
    };

    // Initialize the application
    function init() {
        // Set up event listeners
        settingsLogo.addEventListener('click', toggleSettings);
        connectBtn.addEventListener('click', connectToShopify);
        closeSettingsBtn.addEventListener('click', toggleSettings);

        // Add event listener for background image selection
        backgroundImageInput.addEventListener('change', handleBackgroundImageChange);
        orderBoxBackgroundInput.addEventListener('change', handleOrderBoxBackground);
        upcomingOrderBackgroundInput.addEventListener('change', handleUpcomingOrderBackground);
        textColorInput.addEventListener('input', updateTextColor);
        borderColorInput.addEventListener('input', updateBorderColor);
        overlayColorInput.addEventListener('input', updateOverlay);
        overlayOpacityInput.addEventListener('input', updateOverlay);

        // Fix: Only handle next order box click when not showing inactive orders
        nextOrderBox.addEventListener('click', handleNextOrderBoxClick);

        // Toggle between active and inactive views
        queueCountElement.addEventListener('click', toggleInactiveOrders);

        // Load saved background images and visual settings only
        loadBackgroundImage();
        loadOrderBoxBackground();
        loadUpcomingOrderBackground();
        loadColorSettings();

        // Initialize empty state instead of loading from localStorage
        state.activeOrders = [];
        state.inactiveOrders = [];
        state.showingInactive = false;

        // Load saved shop credentials (but not order data)
        if (state.shopName && state.accessToken) {
            document.getElementById('shopName').value = state.shopName;
            document.getElementById('apiKey').value = state.accessToken;

            // Auto connect if credentials exist
            connectToShopify();
        }

        // Update UI with current state
        updateNextOrderNumber();
        updateQueueCount();

        addTouchSupport();
    }

    function addTouchSupport() {
        // Prevent double-tap zoom on iOS
        document.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Add touchstart listeners in addition to click listeners
        queueCountElement.addEventListener('touchstart', function (e) {
            e.preventDefault();
            toggleInactiveOrders();
        }, { passive: false });

        nextOrderBox.addEventListener('touchstart', function (e) {
            e.preventDefault();
            handleNextOrderBoxClick();
        }, { passive: false });
    }

    // Handle next order box click based on current view
    function handleNextOrderBoxClick() {
        if (!state.showingInactive) {
            // Skip the current order if we're showing active orders
            if (state.activeOrders.length > 0) {
                skipOrder(0);
            }
        }
        // Do nothing when showing inactive orders - it's just informational
    }

    // Toggle settings panel
    function toggleSettings() {
        apiSettings.classList.toggle('hidden');
    }

    // Handle background image selection
    function handleBackgroundImageChange(event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
                // Set the background image
                mainContainer.style.backgroundImage = `url('${e.target.result}')`;

                // Save to local storage (base64)
                localStorage.setItem('backgroundImage', e.target.result);

                updateStatus('Bakgrundsbild uppdaterad', 'success');
            };

            reader.readAsDataURL(file);
        }
    }

    // Handle order box background
    function handleOrderBoxBackground(event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
                // Set custom property for the background
                document.documentElement.style.setProperty('--next-order-bg', `url('${e.target.result}')`);

                // Save to local storage
                localStorage.setItem('orderBoxBackground', e.target.result);

                updateStatus('Bakgrund för nästa order uppdaterad', 'success');
            };

            reader.readAsDataURL(file);
        }
    }

    // Handle upcoming order background
    function handleUpcomingOrderBackground(event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
                // Set custom property for the background
                document.documentElement.style.setProperty('--upcoming-order-bg', `url('${e.target.result}')`);

                // Save to local storage
                localStorage.setItem('upcomingOrderBackground', e.target.result);

                updateStatus('Bakgrund för kommande ordrar uppdaterad', 'success');
            };

            reader.readAsDataURL(file);
        }
    }

    // Load saved background image
    function loadBackgroundImage() {
        const savedImage = localStorage.getItem('backgroundImage');
        if (savedImage) {
            mainContainer.style.backgroundImage = `url('${savedImage}')`;
        }
    }

    // Load saved order box background
    function loadOrderBoxBackground() {
        const savedImage = localStorage.getItem('orderBoxBackground');
        if (savedImage) {
            document.documentElement.style.setProperty('--next-order-bg', `url('${savedImage}')`);
        }
    }

    // Load saved upcoming order background
    function loadUpcomingOrderBackground() {
        const savedImage = localStorage.getItem('upcomingOrderBackground');
        if (savedImage) {
            document.documentElement.style.setProperty('--upcoming-order-bg', `url('${savedImage}')`);
        }
    }

    // Update text color
    function updateTextColor(event) {
        const color = event.target.value;
        document.documentElement.style.setProperty('--next-order-text-color', color);
        localStorage.setItem('nextOrderTextColor', color);
    }

    // Update border color
    function updateBorderColor(event) {
        const color = event.target.value;
        document.documentElement.style.setProperty('--next-order-border-color', color);
        localStorage.setItem('nextOrderBorderColor', color);
    }

    // Update overlay color and opacity
    function updateOverlay() {
        const color = overlayColorInput.value;
        const opacity = overlayOpacityInput.value / 100;

        // Convert hex to rgba
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);

        const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        document.documentElement.style.setProperty('--overlay-color', rgba);

        // Update opacity percentage display
        opacityValueSpan.textContent = `${overlayOpacityInput.value}%`;

        // Save settings
        localStorage.setItem('overlayColor', color);
        localStorage.setItem('overlayOpacity', overlayOpacityInput.value);
    }

    // Load color settings
    function loadColorSettings() {
        // Load text color
        const textColor = localStorage.getItem('nextOrderTextColor');
        if (textColor) {
            textColorInput.value = textColor;
            document.documentElement.style.setProperty('--next-order-text-color', textColor);
        }

        // Load border color
        const borderColor = localStorage.getItem('nextOrderBorderColor');
        if (borderColor) {
            borderColorInput.value = borderColor;
            document.documentElement.style.setProperty('--next-order-border-color', borderColor);
        }

        // Load overlay color and opacity
        const overlayColor = localStorage.getItem('overlayColor');
        const overlayOpacity = localStorage.getItem('overlayOpacity');

        if (overlayColor) {
            overlayColorInput.value = overlayColor;
        }

        if (overlayOpacity) {
            overlayOpacityInput.value = overlayOpacity;
            opacityValueSpan.textContent = `${overlayOpacity}%`;
        }

        // Apply overlay (this will use either stored or default values)
        updateOverlay();
    }

    // Update next order number
    function updateNextOrderNumber() {
        if (state.showingInactive) {
            // If we're showing inactive orders, display a message
            document.querySelector('.next-order-title').textContent = 'Inaktiva ordrar'; // Update the title
            nextOrderNumberElement.textContent = state.inactiveOrders.length > 0 ?
                `${state.inactiveOrders.length} st` :
                'Inga';
            nextOrderBox.classList.add('showing-inactive');

            // Show inactive orders
            displayInactiveOrders();
        } else {
            // Reset inactive styling and title
            document.querySelector('.next-order-title').textContent = 'Next order'; // Reset the title
            nextOrderBox.classList.remove('showing-inactive');

            if (state.activeOrders && state.activeOrders.length > 0) {
                const nextOrder = state.activeOrders[0];
                nextOrderNumberElement.textContent = nextOrder.orderNumber || 'NR#0000';

                // Show upcoming orders if there are more than 1 order
                displayActiveOrders();
            } else {
                nextOrderNumberElement.textContent = 'Kön är tom!';
                // Clear any upcoming orders
                upcomingOrdersElement.innerHTML = '';
            }
        }
    }

    // Display active orders (only the upcoming ones after the first)
    function displayActiveOrders() {
        upcomingOrdersElement.innerHTML = ''; // Clear previous content

        if (state.activeOrders.length > 1) {
            // Get the next 3 orders (or fewer if there aren't enough)
            const upcomingOrders = state.activeOrders.slice(1, 4);

            // Create elements for each upcoming order
            upcomingOrders.forEach((order, index) => {
                const orderElement = document.createElement('div');
                orderElement.className = 'upcoming-order';
                orderElement.textContent = order.orderNumber || 'NR#0000';

                // Add click event listener to skip this order
                orderElement.addEventListener('click', () => skipOrder(index + 1));

                upcomingOrdersElement.appendChild(orderElement);
            });
        }
    }

    // Display inactive orders
    function displayInactiveOrders() {
        upcomingOrdersElement.innerHTML = ''; // Clear previous content

        if (state.inactiveOrders.length > 0) {
            // Create elements for each inactive order
            state.inactiveOrders.forEach((order, index) => {
                const orderElement = document.createElement('div');
                orderElement.className = 'upcoming-order inactive-order';
                orderElement.textContent = order.orderNumber || 'NR#0000';

                // Add click event listener to reactivate this order
                orderElement.addEventListener('click', () => reactivateOrder(index));

                upcomingOrdersElement.appendChild(orderElement);
            });
        } else {
            // Show a message if no inactive orders
            const messageElement = document.createElement('div');
            messageElement.className = 'upcoming-order no-orders';
            messageElement.textContent = 'Inga inaktiva ordrar';
            upcomingOrdersElement.appendChild(messageElement);
        }
    }

    // Toggle between showing active and inactive orders
    function toggleInactiveOrders() {
        state.showingInactive = !state.showingInactive;

        // Update the UI to reflect the change
        if (state.showingInactive) {
            queueCountElement.classList.add('showing-inactive');
            queueCountElement.textContent = `Inaktiva: ${state.inactiveOrders.length}`;
        } else {
            queueCountElement.classList.remove('showing-inactive');
            updateQueueCount();
        }

        // Update the orders display
        updateNextOrderNumber();
    }

    // Skip an order - move it to inactive pool
    function skipOrder(index) {
        if (state.activeOrders.length <= index) return;

        // Get the order to skip
        const skippedOrder = state.activeOrders[index];

        // Check if this order is already in the inactive pool (by ID to avoid duplicates)
        const alreadyInactive = state.inactiveOrders.some(order => order.id === skippedOrder.id);

        if (!alreadyInactive) {
            // Remove the order from active orders array
            state.activeOrders.splice(index, 1);
            // Add to inactive orders
            state.inactiveOrders.push(skippedOrder);

            updateStatus(`Order ${skippedOrder.orderNumber} flyttad till inaktiva ordrar`, 'info');
        } else {
            // Just remove from active if it's already in inactive
            state.activeOrders.splice(index, 1);
            updateStatus(`Order ${skippedOrder.orderNumber} borttagen från aktiv kö`, 'info');
        }

        // Update the display
        updateNextOrderNumber();
        updateQueueCount();
    }

    // Reactivate an order from the inactive pool
    function reactivateOrder(index) {
        if (state.inactiveOrders.length <= index) return;

        // Get the order to reactivate
        const reactivatedOrder = state.inactiveOrders[index];

        // Check if this order is already in the active pool (by ID to avoid duplicates)
        const alreadyActive = state.activeOrders.some(order => order.id === reactivatedOrder.id);

        if (!alreadyActive) {
            // Remove from inactive orders
            state.inactiveOrders.splice(index, 1);
            // Add to active orders
            state.activeOrders.push(reactivatedOrder);

            updateStatus(`Order ${reactivatedOrder.orderNumber} återaktiverad`, 'success');
        } else {
            // Just remove from inactive if it's already active
            state.inactiveOrders.splice(index, 1);
            updateStatus(`Order ${reactivatedOrder.orderNumber} borttagen från inaktiv kö`, 'info');
        }

        // Update the display
        updateNextOrderNumber();
        updateQueueCount();

        // If we're now out of inactive orders, switch back to active view
        if (state.inactiveOrders.length === 0) {
            state.showingInactive = false;
            queueCountElement.classList.remove('showing-inactive');
        }
    }

    // Connect to Shopify
    function connectToShopify() {
        // Add console logs to debug
        console.log("Connect to Shopify button clicked");

        const shopName = document.getElementById('shopName').value;
        const apiKey = document.getElementById('apiKey').value;

        if (!shopName || !apiKey) {
            updateStatus('Vänligen ange både butiksnamn och API-nyckel', 'error');
            return;
        }

        // Check if formatShopName is available
        if (typeof window.formatShopName !== 'function') {
            console.error('formatShopName function is not available');
            updateStatus('Ett fel uppstod. Ladda om sidan och försök igen.', 'error');
            return;
        }

        console.log("Formatting shop name:", shopName);

        try {
            // Update state and save to localStorage
            state.shopName = window.formatShopName(shopName);  // FIXED: Use window.formatShopName
            state.accessToken = apiKey;
            localStorage.setItem('shopName', state.shopName);
            localStorage.setItem('accessToken', state.accessToken);

            updateStatus('Ansluter till Shopify...', 'info');

            // Test connection by fetching shop info
            console.log("Calling fetchShopInfo");
            window.fetchShopInfo()  // FIXED: Use window.fetchShopInfo
                .then(shop => {
                    console.log("Shop info received:", shop);
                    updateStatus(`Ansluten till ${shop.name}`, 'success');
                    state.isConnected = true;

                    // Hide settings panel
                    apiSettings.classList.add('hidden');

                    // Fetch orders
                    refreshOrders();
                })
                .catch(error => {
                    console.error("Error in fetchShopInfo:", error);
                    updateStatus(`Anslutning misslyckades: ${error.message}`, 'error');
                    state.isConnected = false;
                });
        } catch (error) {
            console.error("Error in connectToShopify:", error);
            updateStatus(`Ett fel uppstod: ${error.message}`, 'error');
        }
    }

    // Refresh orders
    function refreshOrders() {
        if (!state.isConnected) {
            updateStatus('Inte ansluten till Shopify', 'error');
            return;
        }

        updateStatus('Hämtar ordrar...', 'info');

        window.fetchOrders()  // FIXED: Use window.fetchOrders
            .then(newOrders => {
                console.log("Orders received:", newOrders);

                // Filter out any orders that are already in the inactive list
                const inactiveOrderIds = state.inactiveOrders.map(order => order.id);
                const filteredOrders = newOrders.filter(order => !inactiveOrderIds.includes(order.id));

                // IMPORTANT: Replace all active orders with fresh data instead of maintaining old ones
                // This ensures orders no longer unfulfilled are removed
                state.activeOrders = filteredOrders;

                // Update next order number and upcoming orders
                updateNextOrderNumber();

                // Start auto refresh
                startAutoRefresh();

                // Update queue count
                updateQueueCount();

                updateStatus(`Hämtade ${filteredOrders.length} aktiva ordrar`, 'success');
            })
            .catch(error => {
                console.error("Error in fetchOrders:", error);
                updateStatus(`Kunde inte hämta ordrar: ${error.message}`, 'error');
            });
    }

    // Update queue count display
    function updateQueueCount() {
        if (queueCountElement) {
            if (state.showingInactive) {
                queueCountElement.textContent = `Inaktiva: ${state.inactiveOrders.length}`;
            } else {
                const activeCount = state.activeOrders.length;
                const inactiveCount = state.inactiveOrders.length;

                queueCountElement.textContent = `Kö: ${activeCount} ordrar`;

                // Add a visual indicator if there are inactive orders
                if (inactiveCount > 0) {
                    queueCountElement.classList.add('has-inactive');
                } else {
                    queueCountElement.classList.remove('has-inactive');
                }
            }
        }
    }

    // Update status message (now only in settings)
    window.updateStatus = function (message, type = 'info') {
        statusText.textContent = message;

        // Reset classes
        statusText.className = '';

        // Add appropriate class
        if (type === 'error') {
            statusText.classList.add('status-error');
        } else if (type === 'success') {
            statusText.classList.add('status-success');
        }
    }

    // Start automatic refresh
    function startAutoRefresh(interval = 30000) { // Refresh every 30 seconds
        // Clear any existing interval
        if (window.refreshInterval) {
            clearInterval(window.refreshInterval);
        }

        // Set new interval
        window.refreshInterval = setInterval(() => {
            if (state.isConnected) {
                refreshOrders();
            }
        }, interval);
    }

    // Initialize the app
    init();
});
