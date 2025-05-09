// Main application logic - Swedish translations
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const apiSettings = document.getElementById('api-settings');
    const connectBtn = document.getElementById('connectBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const statusText = document.getElementById('status-text');
    const statusBar = document.getElementById('status-bar');
    const statusToggle = document.getElementById('statusToggle');
    const activeQueue = document.getElementById('active-queue');
    const standbyQueue = document.getElementById('standby-queue');
    const queueCountElement = document.getElementById('queue-count');

    // Application state - make it a window-level variable for cross-script access
    window.state = {
        activeOrders: [],
        standbyOrders: [],
        shopName: localStorage.getItem('shopName') || '',
        accessToken: localStorage.getItem('accessToken') || '',
        isConnected: false,
        refreshInterval: null
    };

    // Initialize the application
    function init() {
        // Set up event listeners
        settingsBtn.addEventListener('click', toggleSettings);
        connectBtn.addEventListener('click', connectToShopify);
        refreshBtn.addEventListener('click', refreshOrders);
        statusToggle.addEventListener('change', toggleStatusBar);

        // Initialize Sortable for drag and drop
        initializeDragAndDrop();

        // Load saved queue state
        loadQueueState();

        // Load saved shop details if available
        if (state.shopName && state.accessToken) {
            document.getElementById('shopName').value = state.shopName;
            document.getElementById('apiKey').value = state.accessToken;

            // Auto connect if credentials exist
            connectToShopify();
        }

        // Set status bar visibility based on saved preference
        const showStatusBar = localStorage.getItem('showStatusBar') !== 'false';
        statusToggle.checked = showStatusBar;
        statusBar.classList.toggle('hidden', !showStatusBar);

        // Update queue count
        updateQueueCount();
    }

    // Toggle settings panel
    function toggleSettings() {
        apiSettings.classList.toggle('hidden');
    }

    // Toggle status bar
    function toggleStatusBar() {
        const isVisible = statusToggle.checked;
        statusBar.classList.toggle('hidden', !isVisible);
        localStorage.setItem('showStatusBar', isVisible);
    }

    // Connect to Shopify
    function connectToShopify() {
        const shopName = document.getElementById('shopName').value;
        const apiKey = document.getElementById('apiKey').value;

        if (!shopName || !apiKey) {
            updateStatus('Vänligen ange både butiksnamn och API-nyckel', 'error');
            return;
        }

        // Update state and save to localStorage
        state.shopName = formatShopName(shopName);
        state.accessToken = apiKey;
        localStorage.setItem('shopName', state.shopName);
        localStorage.setItem('accessToken', state.accessToken);

        updateStatus('Ansluter till Shopify...', 'info');

        // Test connection by fetching shop info
        fetchShopInfo()
            .then(shop => {
                updateStatus(`Ansluten till ${shop.name}`, 'success');
                state.isConnected = true;

                // Start auto-refresh
                startAutoRefresh();

                // Hide settings panel
                apiSettings.classList.add('hidden');

                // Fetch orders
                refreshOrders();
            })
            .catch(error => {
                updateStatus(`Anslutning misslyckades: ${error.message}`, 'error');
                state.isConnected = false;
            });
    }

    // Start auto-refresh
    function startAutoRefresh(interval = 60000) { // Default: 1 minute
        // Clear any existing interval
        if (state.refreshInterval) {
            clearInterval(state.refreshInterval);
        }

        // Set new interval
        state.refreshInterval = setInterval(() => {
            refreshOrders();
            updateStatus(`Auto-uppdaterad kl ${new Date().toLocaleTimeString()}`, 'info');
        }, interval);
    }

    // Refresh orders
    function refreshOrders() {
        if (!state.isConnected) {
            updateStatus('Inte ansluten till Shopify', 'error');
            return;
        }

        updateStatus('Hämtar ordrar...', 'info');

        fetchOrders()
            .then(orders => {
                // Filter out orders already in standby
                const standbyOrderIds = state.standbyOrders.map(order => order.id);
                const newOrders = orders.filter(order => !standbyOrderIds.includes(order.id));

                // Update state
                state.activeOrders = newOrders.map((order, index) => ({
                    ...order,
                    queuePosition: index + 1
                }));

                // Render orders
                renderOrders();

                // Update queue count
                updateQueueCount();

                // Save queue state
                saveQueueState();

                updateStatus(`Hämtade ${orders.length} ordrar`, 'success');
            })
            .catch(error => {
                updateStatus(`Kunde inte hämta ordrar: ${error.message}`, 'error');
            });
    }

    // Update queue count display
    function updateQueueCount() {
        if (queueCountElement) {
            const totalOrders = state.activeOrders.length + state.standbyOrders.length;
            queueCountElement.textContent = `Kö: ${totalOrders} ordrar`;
        }
    }

    // Render orders in the UI
    function renderOrders() {
        renderQueue(activeQueue, state.activeOrders, 'active');
        renderQueue(standbyQueue, state.standbyOrders, 'standby');
    }

    // Render a single queue
    function renderQueue(queueElement, orders, queueType) {
        // Clear current content
        queueElement.innerHTML = '';

        // Add each order
        orders.forEach(order => {
            const orderElement = createOrderElement(order, queueType);
            queueElement.appendChild(orderElement);
        });
    }

    // Create HTML for an order
    function createOrderElement(order, queueType) {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-item';
        orderElement.dataset.orderId = order.id;

        // Create order header
        const header = document.createElement('div');
        header.className = 'order-header';

        // Add drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        header.appendChild(dragHandle);

        // Add position number
        const position = document.createElement('span');
        position.className = 'position';
        position.textContent = order.queuePosition;
        header.appendChild(position);

        // Add order number
        const orderNumber = document.createElement('span');
        orderNumber.className = 'order-number';
        orderNumber.textContent = order.orderNumber;
        header.appendChild(orderNumber);

        // Add date
        const date = document.createElement('span');
        date.className = 'order-date';
        // Format date in Swedish
        date.textContent = formatSwedishDate(order.orderDate);
        header.appendChild(date);

        // Add action button
        if (queueType === 'active') {
            const moveToStandbyBtn = document.createElement('button');
            moveToStandbyBtn.className = 'btn info';
            moveToStandbyBtn.textContent = '⏱️';
            moveToStandbyBtn.setAttribute('aria-label', 'Flytta till väntelista');
            moveToStandbyBtn.addEventListener('click', () => moveToStandbyQueue(order.id));
            header.appendChild(moveToStandbyBtn);
        } else if (queueType === 'standby') {
            const moveBtn = document.createElement('button');
            moveBtn.className = 'btn info';
            moveBtn.textContent = '➡';
            moveBtn.setAttribute('aria-label', 'Flytta till aktiv kö');
            moveBtn.addEventListener('click', () => moveToActiveQueue(order.id));
            header.appendChild(moveBtn);
        }

        orderElement.appendChild(header);

        // Add order items
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'order-items';

        order.orderItems.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'order-item-row';

            // Add image if available
            if (item.imageUrl) {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.title;
                img.className = 'item-image';
                itemRow.appendChild(img);
            }

            // Add item details
            const details = document.createElement('div');
            details.className = 'item-details';

            const title = document.createElement('div');
            title.className = 'item-title';
            title.textContent = item.title;
            details.appendChild(title);

            if (item.variant) {
                const variant = document.createElement('div');
                variant.className = 'item-variant';
                variant.textContent = item.variant;
                details.appendChild(variant);
            }

            const meta = document.createElement('div');
            meta.className = 'item-meta';

            const quantity = document.createElement('span');
            quantity.textContent = `Antal: ${item.quantity}`;
            meta.appendChild(quantity);

            const price = document.createElement('span');
            price.textContent = formatCurrency(item.price);
            meta.appendChild(price);

            details.appendChild(meta);
            itemRow.appendChild(details);

            itemsContainer.appendChild(itemRow);
        });

        orderElement.appendChild(itemsContainer);
        return orderElement;
    }

    // Format date in Swedish
    function formatSwedishDate(date) {
        return new Date(date).toLocaleString('sv-SE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Mark order as delivered *Will use later possibly*
    function markAsDelivered(orderId) {
        const orderIndex = state.activeOrders.findIndex(order => order.id === orderId);

        if (orderIndex !== -1) {
            // Remove from active queue
            const orderNumber = state.activeOrders[orderIndex].orderNumber;
            state.activeOrders.splice(orderIndex, 1);

            // Update positions
            state.activeOrders.forEach((order, index) => {
                order.queuePosition = index + 1;
            });

            // Re-render
            renderOrders();

            // Update queue count
            updateQueueCount();

            // Save queue state
            saveQueueState();

            updateStatus(`Order ${orderNumber} markerad som levererad`, 'success');
        }
    }

    // Move order to active queue
    function moveToActiveQueue(orderId) {
        const orderIndex = state.standbyOrders.findIndex(order => order.id === orderId);

        if (orderIndex !== -1) {
            // Remove from standby
            const order = state.standbyOrders.splice(orderIndex, 1)[0];

            // Add to active queue
            order.queuePosition = state.activeOrders.length + 1;
            state.activeOrders.push(order);

            // Re-render
            renderOrders();

            // Save queue state
            saveQueueState();

            updateStatus(`Flyttade ${order.orderNumber} till aktiv kö`, 'success');
        }
    }

    // Update status message
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

    // Format currency in Swedish format
    function formatCurrency(amount) {
        return new Intl.NumberFormat('sv-SE', {
            style: 'currency',
            currency: 'SEK'
        }).format(amount);
    }

    // Save queue state to localStorage
    function saveQueueState() {
        localStorage.setItem('activeQueue', JSON.stringify(state.activeOrders));
        localStorage.setItem('standbyQueue', JSON.stringify(state.standbyOrders));
        localStorage.setItem('queueSaveTime', Date.now());
    }

    // Load queue state from localStorage
    function loadQueueState() {
        const activeQueue = localStorage.getItem('activeQueue');
        const standbyQueue = localStorage.getItem('standbyQueue');

        if (activeQueue) {
            state.activeOrders = JSON.parse(activeQueue);
        }

        if (standbyQueue) {
            state.standbyOrders = JSON.parse(standbyQueue);
        }

        // Get save time
        const saveTime = localStorage.getItem('queueSaveTime');
        if (saveTime) {
            const saveDate = new Date(parseInt(saveTime));
            updateStatus(`Laddade kö från ${new Date(saveDate).toLocaleString('sv-SE')}`, 'info');
        }
    }
    function moveToStandbyQueue(orderId) {
        const orderIndex = state.activeOrders.findIndex(order => order.id === orderId);

        if (orderIndex !== -1) {
            // Remove from active queue
            const order = state.activeOrders.splice(orderIndex, 1)[0];

            // Add to standby queue
            state.standbyOrders.push(order);

            // Update active queue positions
            state.activeOrders.forEach((order, index) => {
                order.queuePosition = index + 1;
            });

            // Re-render
            renderOrders();

            // Update queue count
            updateQueueCount();

            // Save queue state
            saveQueueState();

            updateStatus(`Flyttade ${order.orderNumber} till väntelistan`, 'success');
        }
    }

    // Make some functions globally available for other scripts
    window.moveOrderBetweenQueues = function (orderId, fromQueue, toQueue, newIndex) {
        let order;

        // Remove from source queue
        if (fromQueue === 'active') {
            const index = state.activeOrders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                order = state.activeOrders.splice(index, 1)[0];
            }
        } else {
            const index = state.standbyOrders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                order = state.standbyOrders.splice(index, 1)[0];
            }
        }

        if (!order) return;

        // Add to target queue
        if (toQueue === 'active') {
            if (newIndex !== undefined && newIndex < state.activeOrders.length) {
                state.activeOrders.splice(newIndex, 0, order);
            } else {
                state.activeOrders.push(order);
            }
            updateStatus(`Flyttade ${order.orderNumber} till aktiv kö`, 'success');
        } else {
            if (newIndex !== undefined && newIndex < state.standbyOrders.length) {
                state.standbyOrders.splice(newIndex, 0, order);
            } else {
                state.standbyOrders.push(order);
            }
            updateStatus(`Flyttade ${order.orderNumber} till väntelistan`, 'success');
        }

        // Update queue positions
        updateQueuePositions();

        // Update queue count
        updateQueueCount();

        // Save queue state
        saveQueueState();
    }

    // Make reorderQueue globally available
    window.reorderQueue = function (queueType, oldIndex, newIndex) {
        if (queueType === 'active') {
            const order = state.activeOrders.splice(oldIndex, 1)[0];
            state.activeOrders.splice(newIndex, 0, order);
            updateStatus(`Omordnad: flyttade ${order.orderNumber} till position ${newIndex + 1}`, 'success');
        } else {
            const order = state.standbyOrders.splice(oldIndex, 1)[0];
            state.standbyOrders.splice(newIndex, 0, order);
            updateStatus(`Omordnad väntlista: flyttade ${order.orderNumber}`, 'success');
        }

        // Update queue positions
        updateQueuePositions();

        // Save queue state
        saveQueueState();
    }

    // Make updateQueuePositions globally available
    window.updateQueuePositions = function () {
        // Update active queue positions
        state.activeOrders.forEach((order, index) => {
            order.queuePosition = index + 1;
        });

        // Re-render to reflect changes
        renderOrders();
    }

    // Make renderOrders globally available
    window.renderOrders = renderOrders;

    // Initialize the app
    init();
});