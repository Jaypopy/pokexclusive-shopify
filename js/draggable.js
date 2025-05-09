// Initialize drag and drop functionality
function initializeDragAndDrop() {
    // Initialize active queue
    const activeQueueElement = document.getElementById('active-queue');
    const standbyQueueElement = document.getElementById('standby-queue');

    if (!activeQueueElement || !standbyQueueElement) {
        console.error('Queue elements not found');
        return;
    }

    const activeQueueSortable = new Sortable(activeQueueElement, {
        group: {
            name: 'orders',
            pull: true,
            put: true
        },
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: function (evt) {
            handleDragEnd(evt, 'active');
        }
    });

    // Initialize standby queue
    const standbyQueueSortable = new Sortable(standbyQueueElement, {
        group: {
            name: 'orders',
            pull: true,
            put: true
        },
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: function (evt) {
            handleDragEnd(evt, 'standby');
        }
    });
}

// Handle when drag ends
function handleDragEnd(evt, targetQueueType) {
    const orderId = evt.item.dataset.orderId;
    const fromList = evt.from.dataset.queueType;
    const toList = evt.to.dataset.queueType;

    // If moved to a different queue
    if (fromList !== toList) {
        // Use the global function from app.js
        if (typeof window.moveOrderBetweenQueues === 'function') {
            window.moveOrderBetweenQueues(orderId, fromList, toList, evt.newIndex);
        }
    }
    // If reordered within the same queue
    else {
        // Use the global function from app.js
        if (typeof window.reorderQueue === 'function') {
            window.reorderQueue(fromList, evt.oldIndex, evt.newIndex);
        }
    }
}