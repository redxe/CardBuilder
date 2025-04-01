// ===== VIEW =====
// UI rendering and updates
const CanvasView = {
    canvas: document.getElementById('cardCanvas'),
    ctx: null,
    coordinateDisplay: document.getElementById('coordinateDisplay'),
    
    init() {
        this.ctx = this.canvas.getContext('2d');
    },
    
    // Update coordinate display
    updateCoordinateDisplay(x, y, sizeInfo = '') {
        if (this.coordinateDisplay) {
            let text = `X: ${Math.round(x)} Y: ${Math.round(y)}`;
            if (sizeInfo) {
                text += ` | ${sizeInfo}`;
            }
            this.coordinateDisplay.textContent = text;
        }
    },
    
    render() {
        const state = CardModel.state;
        
        // Clear canvas
        this.ctx.fillStyle = state.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background image if exists
        if (state.backgroundImage) {
            // Center and scale image to fit canvas while maintaining aspect ratio
            const imgRatio = state.backgroundImage.width / state.backgroundImage.height;
            const canvasRatio = this.canvas.width / this.canvas.height;
            let drawWidth, drawHeight, drawX, drawY;
            
            if (imgRatio > canvasRatio) {
                drawHeight = this.canvas.height;
                drawWidth = drawHeight * imgRatio;
                drawX = (this.canvas.width - drawWidth) / 2;
                drawY = 0;
            } else {
                drawWidth = this.canvas.width;
                drawHeight = drawWidth / imgRatio;
                drawX = 0;
                drawY = (this.canvas.height - drawHeight) / 2;
            }
            
            this.ctx.drawImage(state.backgroundImage, drawX, drawY, drawWidth, drawHeight);
        }
        
        // Draw foreground elements
        state.elements.forEach((element, index) => {
            this.ctx.save();
            
            // Apply rotation if needed
            if (element.rotation) {
                this.ctx.translate(
                    element.position.x + (element.size.w / 2), 
                    element.position.y + (element.size.h / 2)
                );
                this.ctx.rotate(element.rotation * Math.PI / 180);
                this.ctx.translate(
                    -(element.position.x + (element.size.w / 2)), 
                    -(element.position.y + (element.size.h / 2))
                );
            }
            
            // Draw based on element type
            if (element.type === 'image' && element.data.src) {
                this.ctx.drawImage(
                    element.data.src, 
                    element.position.x, 
                    element.position.y, 
                    element.size.w, 
                    element.size.h
                );
            } else if (element.type === 'text') {
                this.ctx.font = `${element.data.fontSize}px ${element.data.fontFamily}`;
                this.ctx.fillStyle = element.data.color;
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(element.data.text, element.position.x, element.position.y);
                
                // Update element dimensions based on text metrics
                const metrics = this.ctx.measureText(element.data.text);
                element.size.w = metrics.width;
                element.size.h = element.data.fontSize * 1.2;
            }
            
            // Draw selection border for selected element
            if (index === state.selectedElement) {
                this.ctx.strokeStyle = '#00a8ff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    element.position.x - 2, 
                    element.position.y - 2, 
                    (element.size.w || 100) + 4, 
                    (element.size.h || 30) + 4
                );
                
                // Draw resize handles for images
                if (element.type === 'image') {
                    this.drawResizeHandles(element);
                }
            }
            
            this.ctx.restore();
        });
    },

    // Add new method to draw resize handles
    drawResizeHandles(element) {
        const handleSize = 8;
        const x = element.position.x;
        const y = element.position.y;
        const w = element.size.w;
        const h = element.size.h;
        
        // Define handle positions (corners)
        const handles = [
            { name: 'nw', x: x - handleSize/2, y: y - handleSize/2 },
            { name: 'ne', x: x + w - handleSize/2, y: y - handleSize/2 },
            { name: 'sw', x: x - handleSize/2, y: y + h - handleSize/2 },
            { name: 'se', x: x + w - handleSize/2, y: y + h - handleSize/2 },
        ];
        
        // Draw each handle
        this.ctx.fillStyle = CardModel.state.aspectRatioLocked ? '#ff8c00' : '#00a8ff';
        handles.forEach(handle => {
            this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        });
        
        // Show a visual indicator that aspect ratio is locked
        if (CardModel.state.aspectRatioLocked) {
            // Draw a small chain icon or indicator in the center
            this.ctx.fillStyle = '#ff8c00';
            this.ctx.font = '12px FontAwesome, Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🔒', x + w/2, y + h/2);
        }
    },
    
    // Check if a point is inside a resize handle and return handle name if true
    checkResizeHandles(x, y, element) {
        if (!element || element.type !== 'image') return null;
        
        const handleSize = 8;
        const ex = element.position.x;
        const ey = element.position.y;
        const ew = element.size.w;
        const eh = element.size.h;
        
        // Check each handle
        const handles = [
            { name: 'nw', x: ex - handleSize/2, y: ey - handleSize/2 },
            { name: 'ne', x: ex + ew - handleSize/2, y: ey - handleSize/2 },
            { name: 'sw', x: ex - handleSize/2, y: ey + eh - handleSize/2 },
            { name: 'se', x: ex + ew - handleSize/2, y: ey + eh - handleSize/2 },
        ];
        
        for (const handle of handles) {
            if (x >= handle.x && 
                x <= handle.x + handleSize && 
                y >= handle.y && 
                y <= handle.y + handleSize) {
                return handle.name;
            }
        }
        
        return null;
    }
};

const UIView = {
    elements: {
        // Input elements
        bgColorInput: document.getElementById('bgColor'),
        bgImageInput: document.getElementById('bgImage'),
        bgImageUrlInput: document.getElementById('bgImageUrl'),
        loadBgUrlBtn: document.getElementById('loadBgUrl'),
        fgImageInput: document.getElementById('fgImage'),
        fgImageUrlInput: document.getElementById('fgImageUrl'),
        loadFgUrlBtn: document.getElementById('loadFgUrl'),
        textInput: document.getElementById('textContent'),
        textColorInput: document.getElementById('textColor'),
        fontSizeInput: document.getElementById('fontSize'),
        fontSizeValue: document.getElementById('fontSizeValue'),
        
        // Button elements
        addTextBtn: document.getElementById('addText'),
        copyBtn: document.getElementById('copyToClipboard'),
        downloadBtn: document.getElementById('downloadCard'),
        downloadAllBtn: document.getElementById('downloadAllCards'),
        resetBtn: document.getElementById('resetCard'),
        flipBtn: document.getElementById('flipCard'),
        importXMLBtn: document.getElementById('importXML'),
        xmlFileInput: document.getElementById('xmlFile'),
        exportXMLBtn: document.getElementById('exportXML'),
        exportAllXMLBtn: document.getElementById('exportAllXML'),
        
        // Batch navigation
        prevCardBtn: document.getElementById('prevCard'),
        nextCardBtn: document.getElementById('nextCard'),
        batchControls: document.querySelector('.batch-controls'),
        cardCounter: document.getElementById('cardCounter'),
        
        // Tab navigation
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        
        // Element list
        elementsContainer: document.getElementById('elementsContainer'),
        
        // Text editing panel
        textEditPanel: document.getElementById('textEditPanel'),
        editTextContent: document.getElementById('editTextContent'),
        editTextColor: document.getElementById('editTextColor'),
        editFontSize: document.getElementById('editFontSize'),
        editFontSizeValue: document.getElementById('editFontSizeValue'),
        updateTextBtn: document.getElementById('updateTextBtn'),

        // Grid and frame controls
        showFramesToggle: document.getElementById('showFrames'),
        showGridToggle: document.getElementById('showGrid'),
        frameGuides: document.querySelectorAll('.frame-guide'),

        // Add aspect ratio lock toggle
        lockAspectRatioToggle: document.getElementById('lockAspectRatio'),
    },
    
    // Update the list of elements in the UI
    updateElementsList() {
        const elementsContainer = this.elements.elementsContainer;
        const elements = CardModel.state.elements;
        const selectedElement = CardModel.state.selectedElement;
        
        elementsContainer.innerHTML = '';
        
        if (elements.length === 0) {
            elementsContainer.innerHTML = '<p class="empty-message">No elements added yet</p>';
            return;
        }
        
        // Create element items with drag-and-drop support
        elements.forEach((element, index) => {
            const item = document.createElement('div');
            item.className = 'element-item';
            item.draggable = true; // Make item draggable
            item.setAttribute('data-index', index); // Store original index
            
            let elementName = '';
            if (element.type === 'image') {
                elementName = 'Image';
            } else if (element.type === 'text') {
                const truncatedText = element.data.text.substring(0, 15) + 
                    (element.data.text.length > 15 ? '...' : '');
                elementName = `Text: "${truncatedText}"`;
            }
            
            // Add a drag handle icon
            item.innerHTML = `
                <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
                <span class="element-name">${elementName}</span>
                <div class="element-actions">
                    <button class="move-up-btn" title="Move Up" style="display:none"><i class="fas fa-arrow-up"></i></button>
                    <button class="move-down-btn" title="Move Down" style="display:none"><i class="fas fa-arrow-down"></i></button>
                    <button class="delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            // Highlight the selected element in the list
            if (index === selectedElement) {
                item.classList.add('selected');
            }
            
            // Add event listeners
            const moveUpBtn = item.querySelector('.move-up-btn');
            const moveDownBtn = item.querySelector('.move-down-btn');
            const deleteBtn = item.querySelector('.delete-btn');
            
            // Select element when clicking on it in the list
            item.addEventListener('click', (e) => {
                // Don't select when clicking buttons or drag handle
                if (!e.target.closest('button') && !e.target.closest('.drag-handle')) {
                    CardModel.selectElement(index);
                    CanvasView.render();
                    this.updateElementsList();
                }
            });
            
            // Move element up in the stack
            moveUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (index < elements.length - 1) {
                    CardModel.moveElement(index, index + 1);
                    CanvasView.render();
                    this.updateElementsList();
                }
            });
            
            // Move element down in the stack
            moveDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (index > 0) {
                    CardModel.moveElement(index, index - 1);
                    CanvasView.render();
                    this.updateElementsList();
                }
            });
            
            // Delete element
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                CardModel.removeElement(index);
                CanvasView.render();
                this.updateElementsList();
            });
            
            // === Add drag and drop event handlers ===
            
            // Drag start - set data and add visual feedback
            item.addEventListener('dragstart', (e) => {
                // Set data transfer with original index
                e.dataTransfer.setData('text/plain', index.toString());
                e.dataTransfer.effectAllowed = 'move';
                
                // Add dragging class after a small delay to maintain visibility during drag start
                setTimeout(() => item.classList.add('dragging'), 0);
            });
            
            // Drag end - remove visual feedback
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                
                // Remove drag-over class from all items
                document.querySelectorAll('.element-item').forEach(item => {
                    item.classList.remove('drag-over');
                });
            });
            
            // Drag over - allow dropping
            item.addEventListener('dragover', (e) => {
                e.preventDefault(); // Allow drop
                e.dataTransfer.dropEffect = 'move';
            });
            
            // Drag enter - add visual feedback
            item.addEventListener('dragenter', (e) => {
                e.preventDefault();
                // Only add the drag-over class if this is not the item being dragged
                if (!item.classList.contains('dragging')) {
                    item.classList.add('drag-over');
                }
            });
            
            // Drag leave - remove visual feedback
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            // Drop - handle the reordering
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                
                // Get the dragged element's original index
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                // Get current element's index
                const toIndex = index;
                
                // Only move if the indices are different
                if (fromIndex !== toIndex) {
                    CardModel.moveElement(fromIndex, toIndex);
                    // Update the view
                    CanvasView.render();
                    this.updateElementsList();
                }
                
                // Remove visual feedback
                item.classList.remove('drag-over');
            });
            
            elementsContainer.appendChild(item);
        });

        // Make the entire container a drop zone too
        elementsContainer.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            e.dataTransfer.dropEffect = 'move';
        });

        elementsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            
            // Only process if the target is the container itself (not a child element)
            if (e.target === elementsContainer) {
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                // When dropping directly on the container, move to the end of the list
                if (fromIndex >= 0 && fromIndex < elements.length) {
                    // Move element to the end (top of visual stack)
                    CardModel.moveElement(fromIndex, elements.length - 1);
                    CanvasView.render();
                    this.updateElementsList();
                }
            }
        });
    },
    
    updateBatchControls() {
        const { batchMode, cards, currentCardIndex } = CardModel.state;
        
        if (batchMode && cards.length > 0) {
            this.elements.batchControls.style.display = 'flex';
            this.elements.downloadAllBtn.style.display = 'inline-block';
            this.elements.cardCounter.textContent = `Card ${currentCardIndex + 1} of ${cards.length}`;
            
            // Update navigation buttons
            this.elements.prevCardBtn.disabled = (currentCardIndex === 0);
            this.elements.nextCardBtn.disabled = (currentCardIndex === cards.length - 1);
        } else {
            this.elements.batchControls.style.display = 'none';
            this.elements.downloadAllBtn.style.display = 'none';
        }
    },
    
    switchToTab(tabId) {
        // Find the tab with the specified ID
        const tabContent = document.getElementById(`${tabId}-tab`);
        if (!tabContent) return false;
        
        // Remove active class from all buttons and contents
        this.elements.tabBtns.forEach(btn => btn.classList.remove('active'));
        this.elements.tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to specified tab and its button
        tabContent.classList.add('active');
        
        const tabBtn = Array.from(this.elements.tabBtns).find(
            btn => btn.getAttribute('data-tab') === tabId
        );
        if (tabBtn) tabBtn.classList.add('active');
        
        return true;
    },
    
    // Add method to show text edit panel with current element values
    showTextEditPanel(textElement) {
        if (!textElement || textElement.type !== 'text') return;
        
        // Populate form fields with current values
        this.elements.editTextContent.value = textElement.data.text;
        this.elements.editTextColor.value = textElement.data.color;
        this.elements.editFontSize.value = textElement.data.fontSize;
        this.elements.editFontSizeValue.textContent = `${textElement.data.fontSize}px`;
        
        // Show the panel
        this.elements.textEditPanel.style.display = 'block';
    },
    
    // Hide text edit panel
    hideTextEditPanel() {
        this.elements.textEditPanel.style.display = 'none';
    },

    // Add method to initialize grid
    initGrid() {
        // Create grid overlay if it doesn't exist
        if (!document.getElementById('gridOverlay')) {
            const gridOverlay = document.createElement('div');
            gridOverlay.id = 'gridOverlay';
            gridOverlay.className = 'grid-overlay';
            
            // Add the grid overlay to the front of the card
            const cardFront = document.querySelector('.card .front');
            cardFront.appendChild(gridOverlay);
        }
        
        // Set initial states
        this.toggleGrid(this.elements.showGridToggle.checked);
        this.toggleFrames(this.elements.showFramesToggle.checked);
    },
    
    // Toggle grid visibility
    toggleGrid(show) {
        const gridOverlay = document.getElementById('gridOverlay');
        if (gridOverlay) {
            if (show) {
                gridOverlay.classList.add('visible');
            } else {
                gridOverlay.classList.remove('visible');
            }
        }
    },
    
    // Toggle frames visibility
    toggleFrames(show) {
        this.elements.frameGuides.forEach(frame => {
            frame.style.display = show ? 'block' : 'none';
        });
    }
};