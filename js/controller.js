// ===== CONTROLLER =====
// Logic connecting model and view
const Controller = {
    init() {
        // Initialize views
        CanvasView.init();
        
        this.setupEventListeners();
        this.setupElementsList(); // Add this new function call
        
        // Initialize grid and frame guides
        UIView.initGrid();
        
        // Initial render
        CanvasView.render();
        UIView.updateElementsList();
    },
    
    setupEventListeners() {
        const elements = UIView.elements;
        
        // Tab navigation
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                UIView.switchToTab(btn.getAttribute('data-tab'));
            });
        });
        
        // Background controls
        elements.bgColorInput.addEventListener('input', () => {
            CardModel.state.backgroundColor = elements.bgColorInput.value;
            CanvasView.render();
        });
        
        elements.bgImageInput.addEventListener('change', () => {
            if (elements.bgImageInput.files && elements.bgImageInput.files[0]) {
                this.loadImageFromInput(elements.bgImageInput.files[0], (img) => {
                    CardModel.state.backgroundImage = img;
                    CanvasView.render();
                });
            }
        });
        
        // Add background image URL handling
        if (elements.loadBgUrlBtn) {
            elements.loadBgUrlBtn.addEventListener('click', () => {
                const url = elements.bgImageUrlInput?.value?.trim();
                if (url) {
                    this.loadImageFromUrl(url)
                        .then(img => {
                            CardModel.state.backgroundImage = img;
                            CanvasView.render();
                        })
                        .catch(error => {
                            alert('Failed to load image from URL: ' + error.message);
                        });
                } else {
                    alert('Please enter a valid image URL');
                }
            });
        }
        
        // Foreground image control
        elements.fgImageInput.addEventListener('change', () => {
            if (elements.fgImageInput.files && elements.fgImageInput.files[0]) {
                this.loadImageFromInput(elements.fgImageInput.files[0], (img) => {
                    this.addImageElement(img);
                });
            }
        });
        
        // Add foreground image URL handling
        if (elements.loadFgUrlBtn) {
            elements.loadFgUrlBtn.addEventListener('click', () => {
                const url = elements.fgImageUrlInput?.value?.trim();
                if (url) {
                    this.loadImageFromUrl(url)
                        .then(img => {
                            this.addImageElement(img);
                        })
                        .catch(error => {
                            alert('Failed to load image from URL: ' + error.message);
                        });
                } else {
                    alert('Please enter a valid image URL');
                }
            });
        }
        
        // Text controls
        elements.textColorInput.addEventListener('input', () => {
            CardModel.state.textSettings.color = elements.textColorInput.value;
        });
        
        elements.fontSizeInput.addEventListener('input', () => {
            const fontSize = parseInt(elements.fontSizeInput.value);
            CardModel.state.textSettings.fontSize = fontSize;
            elements.fontSizeValue.textContent = `${fontSize}px`;
        });
        
        // Add text button
        elements.addTextBtn.addEventListener('click', () => {
            const text = elements.textInput.value.trim();
            if (text) {
                // Add element to card
                const element = {
                    type: 'text',
                    data: { 
                        text: text,
                        color: CardModel.state.textSettings.color,
                        fontSize: CardModel.state.textSettings.fontSize,
                        fontFamily: CardModel.state.textSettings.fontFamily
                    },
                    position: { x: CanvasView.canvas.width / 2, y: CanvasView.canvas.height / 2 },
                    size: { w: 0, h: 0 }, // Will be calculated during render
                    rotation: 0
                };
                
                CardModel.addElement(element);
                CanvasView.render();
                UIView.updateElementsList();
                elements.textInput.value = '';
                UIView.switchToTab('layers'); // Switch to layers tab
            }
        });
        
        // Add missing event listener for Update Text button
        if (elements.updateTextBtn) {
            elements.updateTextBtn.addEventListener('click', () => {
                this.updateSelectedText();
            });
        }
        
        // Enter key in text input
        elements.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent default (new line)
                elements.addTextBtn.click();
            }
        });
        
        // Copy to clipboard
        elements.copyBtn.addEventListener('click', () => {
            CanvasView.canvas.toBlob((blob) => {
                // Create a ClipboardItem
                const item = new ClipboardItem({ 'image/png': blob });
                
                // Write to clipboard
                navigator.clipboard.write([item]).then(
                    () => alert('Card copied to clipboard!'),
                    (err) => {
                        console.error('Could not copy image: ', err);
                        alert('Failed to copy to clipboard. Please try again or use download instead.');
                    }
                );
            });
        });
        
        // Download card
        elements.downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'card.png';
            link.href = CanvasView.canvas.toDataURL('image/png');
            link.click();
        });
        
        // Reset card
        elements.resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset the card? All elements will be removed.')) {
                CardModel.state.backgroundImage = null;
                CardModel.state.backgroundColor = '#ffffff';
                CardModel.state.elements = [];
                elements.bgColorInput.value = '#ffffff';
                CanvasView.render();
                UIView.updateElementsList();
            }
        });
        
        // Card flip button
        elements.flipBtn.addEventListener('click', () => {
            const card = document.querySelector('.card');
            card.classList.toggle('flipped');
        });
        
        // Import XML
        elements.importXMLBtn.addEventListener('click', () => {
            if (!elements.xmlFileInput.files || !elements.xmlFileInput.files[0]) {
                alert('Please select an XML file first.');
                return;
            }
            
            const file = elements.xmlFileInput.files[0];
            const reader = new FileReader();
            
            // Show loading bar
            this.showLoadingBar('Reading XML file...');
            
            reader.onload = (e) => {
                try {
                    this.updateLoadingProgress(30, 'Parsing XML...');
                    
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
                    
                    // Check for parse errors
                    const parseError = xmlDoc.getElementsByTagName("parsererror");
                    if (parseError.length > 0) {
                        throw new Error("XML parsing error");
                    }
                    
                    this.updateLoadingProgress(60, 'Resetting current state...');
                    
                    // Reset state before processing new XML
                    this.resetBatchState();
                    
                    this.updateLoadingProgress(80, 'Processing card data...');
                    
                    const success = CardModel.processXMLData(xmlDoc);
                    
                    this.updateLoadingProgress(95, 'Loading first card...');
                    
                    if (success) {
                        // Set batch mode after XML is processed and cards are loaded
                        CardModel.state.batchMode = true;
                        CardModel.state.currentCardIndex = 0;
                        
                        // Use special direct load for first import to avoid saving current state
                        this.directLoadCardFromBatch(0);
                        
                        // Show export all XML button when in batch mode
                        elements.exportAllXMLBtn.style.display = 'inline-block';
                        
                        this.updateLoadingProgress(100, 'Complete!');
                        
                        // Short delay to show 100% completion before hiding
                        setTimeout(() => {
                            this.hideLoadingBar();
                        }, 500);
                    } else {
                        this.hideLoadingBar();
                        alert('No cards found in the XML file.');
                    }
                } catch (error) {
                    console.error("XML parsing error:", error);
                    this.hideLoadingBar();
                    alert('Error parsing XML file. Please check the file format.');
                }
            };
            
            reader.onerror = () => {
                this.hideLoadingBar();
                alert('Error reading the XML file.');
            };
            
            reader.readAsText(file);
        });
        
        // Batch navigation
        elements.prevCardBtn.addEventListener('click', () => {
            const { currentCardIndex } = CardModel.state;
            if (currentCardIndex > 0) {
                // Save current card before navigating
                this.saveCurrentCardToBatch();
                this.loadCardFromBatch(currentCardIndex - 1);
            }
        });
        
        elements.nextCardBtn.addEventListener('click', () => {
            const { currentCardIndex, cards } = CardModel.state;
            if (currentCardIndex < cards.length - 1) {
                // Save current card before navigating
                this.saveCurrentCardToBatch();
                this.loadCardFromBatch(currentCardIndex + 1);
            }
        });
        
        // Download all cards
        elements.downloadAllBtn.addEventListener('click', async () => {
            if (!CardModel.state.batchMode || CardModel.state.cards.length === 0) {
                alert('No batch cards available to download.');
                return;
            }
            
            await this.downloadAllCards();
        });
        
        // Export XML button
        elements.exportXMLBtn.addEventListener('click', () => {
            this.exportCardAsXML();
        });
        
        // Export All XML button (if you want to implement this later)
        elements.exportAllXMLBtn.addEventListener('click', async () => {
            if (!CardModel.state.batchMode || CardModel.state.cards.length === 0) {
                alert('No batch cards available to export.');
                return;
            }
            
            // Save current card before exporting all
            this.saveCurrentCardToBatch();
            
            // Export all cards as XML
            this.exportAllCardsAsXML();
        });
        
        // Canvas events for dragging elements
        this.setupCanvasDragAndDrop();
        
        // Add keyboard event listener for Escape key to deselect elements
        document.addEventListener('keydown', (e) => {
            // Check if Escape key was pressed
            if (e.key === 'Escape' || e.key === 'Esc') {
                // If there's a selected element, deselect it
                if (CardModel.state.selectedElement !== null) {
                    CardModel.state.selectedElement = null;
                    CardModel.state.isDragging = false;
                    CardModel.state.isResizing = false;
                    
                    // Hide text edit panel
                    UIView.hideTextEditPanel();
                    
                    // Reset cursor to default
                    CanvasView.canvas.style.cursor = 'default';
                    
                    // Re-render the canvas and update elements list
                    CanvasView.render();
                    UIView.updateElementsList();
                } else if (document.getElementById('hotkeysModal').style.display === 'flex') {
                    // If hotkeys modal is open, close it
                    this.toggleHotkeysModal(false);
                }
            }
            
            // Only handle shortcuts if no text input is focused
            if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                // H key to show/hide hotkeys modal
                if (e.key === 'h' || e.key === 'H') {
                    this.toggleHotkeysModal();
                }
                
                // Delete/Backspace to remove selected element
                if ((e.key === 'Delete' || e.key === 'Backspace') && 
                    CardModel.state.selectedElement !== null) {
                    CardModel.removeElement(CardModel.state.selectedElement);
                    CanvasView.render();
                    UIView.updateElementsList();
                }
                
                // Arrow keys to move selected element
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && 
                    CardModel.state.selectedElement !== null) {
                    
                    // Get the selected element
                    const element = CardModel.state.elements[CardModel.state.selectedElement];
                    const moveStep = e.shiftKey ? 10 : 1; // Larger step with Shift key
                    
                    // Adjust position based on key
                    switch(e.key) {
                        case 'ArrowUp':
                            element.position.y -= moveStep;
                            break;
                        case 'ArrowDown':
                            element.position.y += moveStep;
                            break;
                        case 'ArrowLeft':
                            element.position.x -= moveStep;
                            break;
                        case 'ArrowRight':
                            element.position.x += moveStep;
                            break;
                    }
                    
                    // Update coordinate display with new position
                    CanvasView.updateCoordinateDisplay(element.position.x, element.position.y);
                    
                    // Prevent scrolling the page with arrow keys
                    e.preventDefault();
                    
                    // Re-render the canvas
                    CanvasView.render();
                }
                
                // // F key to flip card
                // if ((e.key === 'f' || e.key === 'F') && UIView.elements.flipBtn) {
                //     UIView.elements.flipBtn.click();
                //     e.preventDefault();
                // }
                
                // C key for copy to clipboard when element selected
                if ((e.key === 'c' || e.key === 'C') && e.ctrlKey) {
                    UIView.elements.copyBtn.click();
                    e.preventDefault();
                }
                
                // D key for download
                if ((e.key === 'd' || e.key === 'D') && e.ctrlKey) {
                    UIView.elements.downloadBtn.click();
                    e.preventDefault();
                }

                // PageUp/PageDown or Ctrl+Up/Down for layer movement
                if (CardModel.state.selectedElement !== null) {
                    const selectedIndex = CardModel.state.selectedElement;
                    const totalElements = CardModel.state.elements.length;
                    
                    // Move layer forward (up in visual stack)
                    if (((e.key === 'PageUp' || (e.ctrlKey && e.key === 'ArrowUp')) || 
                         (e.shiftKey && (e.key === ']' || e.key === '}'))) && 
                        selectedIndex < totalElements - 1) {
                        CardModel.moveElement(selectedIndex, selectedIndex + 1);
                        CanvasView.render();
                        UIView.updateElementsList();
                        e.preventDefault();
                    }
                    
                    // Move layer backward (down in visual stack)
                    if (((e.key === 'PageDown' || (e.ctrlKey && e.key === 'ArrowDown')) || 
                         (e.shiftKey && (e.key === '[' || e.key === '{'))) && 
                        selectedIndex > 0) {
                        CardModel.moveElement(selectedIndex, selectedIndex - 1);
                        CanvasView.render();
                        UIView.updateElementsList();
                        e.preventDefault();
                    }
                }
            }
        });

        // Add a hotkeys button to show the shortcuts
        if (UIView.elements.hotkeysBtn) {
            UIView.elements.hotkeysBtn.addEventListener('click', () => {
                this.toggleHotkeysModal();
            });
        }

        // Add click handler for the modal close button
        document.getElementById('closeHotkeysModal').addEventListener('click', () => {
            this.toggleHotkeysModal(false);
        });
        
        // Close modal when clicking outside
        document.getElementById('hotkeysModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('hotkeysModal')) {
                this.toggleHotkeysModal(false);
            }
        });

        // Grid and frame guide toggles
        if (elements.showGridToggle) {
            elements.showGridToggle.addEventListener('change', (e) => {
                UIView.toggleGrid(e.target.checked);
                // Optionally save preference to localStorage
                localStorage.setItem('showGrid', e.target.checked);
            });
            
            // Initialize from saved preference if available
            const savedGridPreference = localStorage.getItem('showGrid');
            if (savedGridPreference !== null) {
                elements.showGridToggle.checked = savedGridPreference === 'true';
                UIView.toggleGrid(elements.showGridToggle.checked);
            }
        }
        
        if (elements.showFramesToggle) {
            elements.showFramesToggle.addEventListener('change', (e) => {
                UIView.toggleFrames(e.target.checked);
                // Optionally save preference to localStorage
                localStorage.setItem('showFrames', e.target.checked);
            });
            
            // Initialize from saved preference if available
            const savedFramesPreference = localStorage.getItem('showFrames');
            if (savedFramesPreference !== null) {
                elements.showFramesToggle.checked = savedFramesPreference === 'true';
                UIView.toggleFrames(elements.showFramesToggle.checked);
            }
        }

        // Add aspect ratio lock toggle handler
        if (elements.lockAspectRatioToggle) {
            elements.lockAspectRatioToggle.addEventListener('change', (e) => {
                CardModel.state.aspectRatioLocked = e.target.checked;
                // Save preference to localStorage
                localStorage.setItem('aspectRatioLocked', e.target.checked);
            });
            
            // Initialize from saved preference if available
            const savedAspectRatioSetting = localStorage.getItem('aspectRatioLocked');
            if (savedAspectRatioSetting !== null) {
                elements.lockAspectRatioToggle.checked = savedAspectRatioSetting === 'true';
                CardModel.state.aspectRatioLocked = elements.lockAspectRatioToggle.checked;
            }
        }
    },
    
    setupCanvasDragAndDrop() {
        const canvas = CanvasView.canvas;
        
        // Track mouse movement over canvas to update coordinates
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            
            // Update cursor based on resize handles
            if (CardModel.state.selectedElement !== null) {
                const selectedElement = CardModel.state.elements[CardModel.state.selectedElement];
                if (selectedElement && selectedElement.type === 'image') {
                    const handle = CanvasView.checkResizeHandles(x, y, selectedElement);
                    if (handle) {
                        canvas.style.cursor = handle + '-resize';
                    } else if (!CardModel.state.isResizing) {
                        canvas.style.cursor = 'move';
                    }
                } else {
                    canvas.style.cursor = 'move';
                }
            } else {
                canvas.style.cursor = 'default';
            }
            
            // Update the coordinate display
            CanvasView.updateCoordinateDisplay(x, y);
            
            // Handle dragging (element movement)
            if (CardModel.state.isDragging && CardModel.state.selectedElement !== null && !CardModel.state.isResizing) {
                const selectedIndex = CardModel.state.selectedElement;
                const dragOffset = CardModel.state.dragOffset;
                
                if (selectedIndex !== null && selectedIndex >= 0 && 
                    selectedIndex < CardModel.state.elements.length) {
                    // Calculate new position
                    const newX = x - dragOffset.x;
                    const newY = y - dragOffset.y;
                    
                    // Update element position
                    CardModel.state.elements[selectedIndex].position = {
                        x: newX,
                        y: newY
                    };
                    
                    // Also update coordinate display to show element position
                    CanvasView.updateCoordinateDisplay(newX, newY);
                    
                    CanvasView.render();
                }
            }
            
            // Handle resizing
            if (CardModel.state.isResizing && CardModel.state.selectedElement !== null) {
                const element = CardModel.state.elements[CardModel.state.selectedElement];
                const handle = CardModel.state.resizeHandle;
                
                if (element && element.type === 'image') {
                    let newWidth, newHeight;
                    
                    // Calculate new dimensions based on handle
                    switch(handle) {
                        case 'se': // Bottom-right
                            newWidth = x - element.position.x;
                            newHeight = y - element.position.y;
                            
                            // Maintain aspect ratio if locked
                            if (CardModel.state.aspectRatioLocked) {
                                // Use the original aspect ratio to ensure consistent proportions
                                const aspectRatio = CardModel.state.originalAspectRatio;
                                
                                // Determine which dimension to adjust based on mouse movement
                                const widthChange = Math.abs(newWidth - CardModel.state.originalWidth);
                                const heightChange = Math.abs(newHeight - CardModel.state.originalHeight);
                                
                                if (widthChange > heightChange) {
                                    // Width is changing more, adjust height accordingly
                                    newHeight = newWidth / aspectRatio;
                                } else {
                                    // Height is changing more, adjust width accordingly
                                    newWidth = newHeight * aspectRatio;
                                }
                            }
                            break;
                            
                        case 'sw': // Bottom-left
                            newWidth = element.position.x + element.size.w - x;
                            newHeight = y - element.position.y;
                            
                            // Maintain aspect ratio if locked
                            if (CardModel.state.aspectRatioLocked) {
                                // Use the original aspect ratio to ensure consistent proportions
                                const aspectRatio = CardModel.state.originalAspectRatio;
                                
                                // Determine which dimension to adjust based on mouse movement
                                const widthChange = Math.abs(newWidth - CardModel.state.originalWidth);
                                const heightChange = Math.abs(newHeight - CardModel.state.originalHeight);
                                
                                if (widthChange > heightChange) {
                                    // Width is changing more, adjust height accordingly
                                    newHeight = newWidth / aspectRatio;
                                } else {
                                    // Height is changing more, adjust width accordingly
                                    newWidth = newHeight * aspectRatio;
                                }
                            }
                            
                            // Update position for left handle
                            if (newWidth > 10) {
                                element.position.x = element.position.x + element.size.w - newWidth;
                            }
                            break;
                            
                        case 'ne': // Top-right
                            newWidth = x - element.position.x;
                            newHeight = element.position.y + element.size.h - y;
                            
                            // Maintain aspect ratio if locked
                            if (CardModel.state.aspectRatioLocked) {
                                // Use the original aspect ratio to ensure consistent proportions
                                const aspectRatio = CardModel.state.originalAspectRatio;
                                
                                // Determine which dimension to adjust based on mouse movement
                                const widthChange = Math.abs(newWidth - CardModel.state.originalWidth);
                                const heightChange = Math.abs(newHeight - CardModel.state.originalHeight);
                                
                                if (widthChange > heightChange) {
                                    // Width is changing more, adjust height accordingly
                                    newHeight = newWidth / aspectRatio;
                                } else {
                                    // Height is changing more, adjust width accordingly
                                    newWidth = newHeight * aspectRatio;
                                }
                            }
                            
                            // Update position for top handle
                            if (newHeight > 10) {
                                element.position.y = element.position.y + element.size.h - newHeight;
                            }
                            break;
                            
                        case 'nw': // Top-left
                            newWidth = element.position.x + element.size.w - x;
                            newHeight = element.position.y + element.size.h - y;
                            
                            // Maintain aspect ratio if locked
                            if (CardModel.state.aspectRatioLocked) {
                                // Use the original aspect ratio to ensure consistent proportions
                                const aspectRatio = CardModel.state.originalAspectRatio;
                                
                                // Determine which dimension to adjust based on mouse movement
                                const widthChange = Math.abs(newWidth - CardModel.state.originalWidth);
                                const heightChange = Math.abs(newHeight - CardModel.state.originalHeight);
                                
                                if (widthChange > heightChange) {
                                    // Width is changing more, adjust height accordingly
                                    newHeight = newWidth / aspectRatio;
                                } else {
                                    // Height is changing more, adjust width accordingly
                                    newWidth = newHeight * aspectRatio;
                                }
                            }
                            
                            // Update position for top-left handle
                            const oldWidth = element.size.w;
                            const oldHeight = element.size.h;
                            
                            if (newWidth > 10) {
                                element.position.x = element.position.x + oldWidth - newWidth;
                            }
                            if (newHeight > 10) {
                                element.position.y = element.position.y + oldHeight - newHeight;
                            }
                            break;
                    }
                    
                    // Apply the resize with minimum size check
                    if (newWidth > 10 && newHeight > 10) {
                        element.size.w = newWidth;
                        element.size.h = newHeight;
                    }
                    
                    // Update coordinate display with size info
                    CanvasView.updateCoordinateDisplay(
                        element.position.x, 
                        element.position.y, 
                        `W: ${Math.round(element.size.w)} H: ${Math.round(element.size.h)}`
                    );
                    
                    CanvasView.render();
                }
            }
        });
        
        // Add resize handling to mousedown
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            
            // First, check if clicked on a resize handle
            if (CardModel.state.selectedElement !== null) {
                const element = CardModel.state.elements[CardModel.state.selectedElement];
                if (element && element.type === 'image') {
                    const handle = CanvasView.checkResizeHandles(x, y, element);
                    if (handle) {
                        CardModel.state.isResizing = true;
                        CardModel.state.resizeHandle = handle;
                        
                        // Always store original dimensions before resizing
                        CardModel.state.originalWidth = element.size.w;
                        CardModel.state.originalHeight = element.size.h;
                        CardModel.state.originalAspectRatio = element.size.w / element.size.h;
                        
                        e.preventDefault();
                        return;
                    }
                }
            }
            
            // If not a resize handle, check for element selection (existing code)
            // ...existing element selection code...
            
            // Check if clicked on an element (in reverse order to select top elements first)
            const elements = CardModel.state.elements;
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i];
                
                // Simple bounding box check
                if (x >= el.position.x && 
                    x <= el.position.x + (el.size.w || 100) && 
                    y >= el.position.y && 
                    y <= el.position.y + (el.size.h || 30)) {
                    
                    CardModel.state.selectedElement = i;
                    CardModel.state.isDragging = true;
                    CardModel.state.dragOffset = {
                        x: x - el.position.x,
                        y: y - el.position.y
                    };
                    
                    // Bring element to front
                    const selectedEl = elements.splice(i, 1)[0];
                    elements.push(selectedEl);
                    CardModel.state.selectedElement = elements.length - 1;
                    
                    // Show text edit panel if this is a text element
                    if (selectedEl.type === 'text') {
                        UIView.showTextEditPanel(selectedEl);
                        UIView.switchToTab('layers'); // Switch to layers tab
                    } else {
                        UIView.hideTextEditPanel();
                    }
                    
                    // When element is selected, update coordinate to show element position
                    if (el.type === 'image') {
                        CanvasView.updateCoordinateDisplay(
                            el.position.x, 
                            el.position.y, 
                            `W: ${Math.round(el.size.w)} H: ${Math.round(el.size.h)}`
                        );
                    } else {
                        CanvasView.updateCoordinateDisplay(el.position.x, el.position.y);
                    }
                    
                    CanvasView.render();
                    UIView.updateElementsList();
                    break;
                }
            }
            
            // If clicked outside of any element, hide text edit panel
            if (CardModel.state.selectedElement === null) {
                UIView.hideTextEditPanel();
            }
        });
        
        // Update mouseup to handle resize end
        canvas.addEventListener('mouseup', () => {
            CardModel.state.isDragging = false;
            CardModel.state.isResizing = false;
            CardModel.state.resizeHandle = null;
            canvas.style.cursor = 'default';
        });
        
        canvas.addEventListener('mouseleave', () => {
            CardModel.state.isDragging = false;
            CardModel.state.isResizing = false;
            CardModel.state.resizeHandle = null;
            canvas.style.cursor = 'default';
        });
    },
    
    loadImageFromInput(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => callback(img);
            img.onerror = () => alert('Error loading image. Please try another file.');
            img.src = e.target.result;
        };
        reader.onerror = () => alert('Error reading file. Please try again.');
        reader.readAsDataURL(file);
    },
    
    // Load remote image with proper error handling
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // Set up proper load/error handlers
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image from: ${src}`));
            
            // Set crossOrigin to anonymous for all images to allow CORS when possible
            // This helps with security restrictions during canvas operations
            if (src.startsWith('http')) {
                img.crossOrigin = "anonymous";
            }
            
            // Set the source
            img.src = src;
            
            // Set a timeout to avoid indefinite waiting
            setTimeout(() => {
                if (!img.complete) {
                    reject(new Error('Image load timed out'));
                }
            }, 30_000);
        });
    },
    
    async loadCardFromBatch(index) {
        if (index < 0 || index >= CardModel.state.cards.length) return false;
        
        // If we're already in batch mode, save the current card first
        if (CardModel.state.batchMode && CardModel.state.currentCardIndex >= 0 && 
            CardModel.state.currentCardIndex < CardModel.state.cards.length) {
            this.saveCurrentCardToBatch();
        }
        
        // Now perform the actual card loading
        return this.directLoadCardFromBatch(index);
    },
    
    // New method that loads a card without saving the current one first
    // Used for initial load during XML import to prevent overwriting
    async directLoadCardFromBatch(index) {
        if (index < 0 || index >= CardModel.state.cards.length) return false;
        
        CardModel.state.currentCardIndex = index;
        const cardState = CardModel.state.cards[index];
        
        // Load the card state
        CardModel.state.backgroundColor = cardState.backgroundColor;
        CardModel.state.elements = []; // Clear elements first
        
        // Clear background image
        CardModel.state.backgroundImage = null;
        
        try {
            // Load background image if exists
            if (cardState.bgImagePath) {
                try {
                    CardModel.state.backgroundImage = await this.loadImage(cardState.bgImagePath);
                } catch (error) {
                    console.error('Failed to load background image:', error);
                    // Continue without the background image
                }
            }
            
            // Process and load all elements
            for (const element of cardState.elements) {
                if (element.type === 'text') {
                    // Text elements can be added directly
                    CardModel.state.elements.push(JSON.parse(JSON.stringify(element)));
                } 
                else if (element.type === 'image' && element.data.imagePath) {
                    try {
                        // Load the image
                        const img = await this.loadImage(element.data.imagePath);
                        
                        // Create a new element with the loaded image
                        CardModel.state.elements.push({
                            type: 'image',
                            data: { src: img, name: element.data.name },
                            position: element.position,
                            size: element.size,
                            rotation: element.rotation
                        });
                    } catch (error) {
                        console.error('Failed to load element image:', error);
                        // Skip this element
                    }
                }
            }
            
            // Update UI controls
            UIView.elements.bgColorInput.value = CardModel.state.backgroundColor;
            
            // Update batch controls
            UIView.updateBatchControls();
            
            // Render the card and update elements list
            CanvasView.render();
            UIView.updateElementsList();
            
            return true;
        } catch (error) {
            console.error("Error loading card:", error);
            return false;
        }
    },

    // Add new method to save the current card state back to batch
    saveCurrentCardToBatch() {
        if (!CardModel.state.batchMode || CardModel.state.currentCardIndex < 0) return;
        
        const cardState = {
            backgroundColor: CardModel.state.backgroundColor,
            elements: []
        };
        
        // Save background image if exists
        if (CardModel.state.backgroundImage) {
            if (CardModel.state.backgroundImage.src) {
                cardState.bgImagePath = CardModel.state.backgroundImage.src;
            }
        }
        
        // Save all elements with correct format for batch storage
        CardModel.state.elements.forEach(element => {
            if (element.type === 'text') {
                // Text elements can be directly stored
                cardState.elements.push(JSON.parse(JSON.stringify(element)));
            }
            else if (element.type === 'image' && element.data.src) {
                // Image elements need to store their source path
                const imageSrc = element.data.src.src || element.data.src;
                cardState.elements.push({
                    type: 'image',
                    data: { 
                        imagePath: imageSrc,
                        name: element.data.name || 'Image'
                    },
                    position: { 
                        x: element.position.x, 
                        y: element.position.y 
                    },
                    size: { 
                        w: element.size.w, 
                        h: element.size.h 
                    },
                    rotation: element.rotation
                });
            }
        });
        
        // Save the current state back to the cards array
        CardModel.state.cards[CardModel.state.currentCardIndex] = cardState;
    },
    
    async downloadAllCards() {
        // Show loading bar with initial message
        this.showLoadingBar('Preparing to export all cards...');
        
        // Save current state for restoration later
        const currentIndex = CardModel.state.currentCardIndex;
        
        // Save the current card before processing all cards
        this.saveCurrentCardToBatch();
        
        try {
            // Dynamic loading of JSZip library
            if (!window.JSZip) {
                this.updateLoadingProgress(5, 'Loading JSZip library...');
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                document.head.appendChild(script);
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }
            
            // Create zip file with all cards
            const zip = new JSZip();
            const folder = zip.folder("cards");
            
            const totalCards = CardModel.state.cards.length;
            this.updateLoadingProgress(10, `Preparing ${totalCards} cards...`);
            
            for (let i = 0; i < totalCards; i++) {
                try {
                    // Calculate progress percentage (allocate 10-80% of the progress bar for processing cards)
                    const progress = 10 + Math.round((i / totalCards) * 70);
                    this.updateLoadingProgress(progress, `Processing card ${i+1} of ${totalCards}`);
                    
                    // Load each card and render
                    await this.directLoadCardFromBatch(i);
                    
                    // Use toDataURL which creates a new image that's safe to use
                    const imageData = CanvasView.canvas.toDataURL('image/png').split(',')[1];
                    folder.file(`card_${i+1}.png`, imageData, {base64: true});
                } catch (cardError) {
                    console.error(`Error processing card ${i+1}:`, cardError);
                    // Continue with other cards instead of failing completely
                }
            }
            
            // Generate and trigger download
            this.updateLoadingProgress(85, 'Creating ZIP file...');
            try {
                const content = await zip.generateAsync({
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: { level: 6 }
                });
                
                this.updateLoadingProgress(95, 'Download starting...');
                
                const link = document.createElement('a');
                link.download = 'cards.zip';
                link.href = URL.createObjectURL(content);
                link.click();
                URL.revokeObjectURL(link.href); // Clean up
                
                // FIXED: Completely reload the original card instead of restoring from state
                // This ensures all images are properly reloaded
                this.updateLoadingProgress(98, 'Reloading current card...');
                await this.directLoadCardFromBatch(currentIndex);
                
                this.updateLoadingProgress(100, 'Complete!');
                
                // Short delay to show 100% completion before hiding
                setTimeout(() => {
                    this.hideLoadingBar();
                    alert('Cards have been successfully exported to a ZIP file.');
                }, 500);
                
            } catch (zipError) {
                throw new Error('Failed to create ZIP file: ' + zipError.message);
            }
            
        } catch (error) {
            console.error('Error creating zip file:', error);
            this.hideLoadingBar();
            alert('Failed to download all cards: ' + error.message + '\nPlease try downloading them individually.');
            
            // Restore original card by reloading it completely
            await this.directLoadCardFromBatch(currentIndex);
        }
    },
    
    // Generate XML from card data and trigger download
    exportCardAsXML() {
        // Show loading bar for export
        this.showLoadingBar('Generating XML...');
        
        // Use setTimeout to allow UI to update before processing
        setTimeout(() => {
            try {
                // Create XML Document
                const xmlDoc = document.implementation.createDocument(null, "cards", null);
                const rootElement = xmlDoc.documentElement;
                
                // Add the current card to the XML
                const cardElement = xmlDoc.createElement("card");
                
                // Add background information
                const backgroundElement = xmlDoc.createElement("background");
                backgroundElement.setAttribute("color", CardModel.state.backgroundColor);
                
                // Add background image if it exists
                if (CardModel.state.backgroundImage && CardModel.state.backgroundImage.src) {
                    // Use the complete src data URI or URL
                    backgroundElement.setAttribute("image", CardModel.state.backgroundImage.src);
                }
                
                // Add elements container
                const elementsContainer = xmlDoc.createElement("elements");
                
                // Process and add each element
                CardModel.state.elements.forEach(element => {
                    if (element.type === 'text') {
                        const textElement = xmlDoc.createElement("text");
                        
                        // Set attributes
                        textElement.setAttribute("x", Math.round(element.position.x));
                        textElement.setAttribute("y", Math.round(element.position.y));
                        textElement.setAttribute("color", element.data.color);
                        textElement.setAttribute("fontSize", element.data.fontSize);
                        textElement.setAttribute("fontFamily", element.data.fontFamily);
                        
                        if (element.rotation) {
                            textElement.setAttribute("rotation", element.rotation);
                        }
                        
                        // Set text content
                        textElement.textContent = element.data.text;
                        
                        elementsContainer.appendChild(textElement);
                    } 
                    else if (element.type === 'image' && element.data.src) {
                        const imageElement = xmlDoc.createElement("image");
                        
                        // Set attributes
                        imageElement.setAttribute("x", Math.round(element.position.x));
                        imageElement.setAttribute("y", Math.round(element.position.y));
                        imageElement.setAttribute("width", Math.round(element.size.w));
                        imageElement.setAttribute("height", Math.round(element.size.h));
                        
                        // Add the name attribute
                        if (element.data.name) {
                            imageElement.setAttribute("name", element.data.name);
                        }
                        
                        // Preserve the complete image data URI or URL
                        // Handle both object structure possibilities
                        if (element.data.src.src) {
                            // If src is nested (e.g., element.data.src.src)
                            imageElement.setAttribute("src", element.data.src.src);
                        } else {
                            // Direct src value
                            imageElement.setAttribute("src", element.data.src);
                        }
                        
                        if (element.rotation) {
                            imageElement.setAttribute("rotation", element.rotation);
                        }
                        
                        elementsContainer.appendChild(imageElement);
                    }
                });
                
                cardElement.appendChild(elementsContainer);
                rootElement.appendChild(cardElement);
                
                // Serialize XML to string with proper formatting
                const serializer = new XMLSerializer();
                let xmlString = serializer.serializeToString(xmlDoc);
                
                // Pretty print XML with indentation
                xmlString = this.formatXML(xmlString);
                
                // Trigger download
                this.downloadFile(xmlString, "card.xml", "application/xml");
                
                // Hide loading when done
                this.hideLoadingBar();
                
            } catch (error) {
                console.error('Error exporting XML:', error);
                this.hideLoadingBar();
                alert('Failed to export XML: ' + error.message);
            }
        }, 100); // Small delay to ensure UI updates
    },
    
    // Helper function to format XML with indentation
    formatXML(xml) {
        // First check if we have a valid XML string
        if (!xml) return '';
        
        let formatted = '';
        let indent = '';
        const tab = '  '; // 2 spaces
        
        // Add XML declaration if it doesn't exist
        if (!xml.trim().startsWith('<?xml')) {
            formatted = '<?xml version="1.0" encoding="UTF-8"?>\r\n';
        }
        
        // Split the XML by tags but preserve brackets
        const parts = xml.replace(/>\s*</g, '>\r\n<').split('\r\n');
        
        // Process each part
        parts.forEach(part => {
            if (!part.trim()) return; // Skip empty lines
            
            // Handle indentation
            if (part.match(/<\/\w/)) { // Closing tag
                indent = indent.substring(tab.length);
            }
            
            // Add the indented line
            formatted += indent + part + '\r\n';
            
            // Increase indent after opening tag if not self-closing or declaration
            if (part.match(/<[^\/!?]([^>]*)>/) && 
                !part.match(/<([^>]*)\/>/g) && 
                !part.startsWith('<?xml')) {
                indent += tab;
            }
        });
        
        // Clean up the formatted XML
        return formatted
            .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
            .replace(/<([\w:-]+)([^>]*)><\/\1>/g, '<$1$2/>') // Convert empty elements to self-closing
            .replace(/\r\n\r\n\r\n+/g, '\r\n\r\n'); // Remove excessive blank lines
    },

    // Helper function to trigger a file download
    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const link = document.createElement('a');
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href); // Clean up
    },
    
    // Add method for exporting all cards as XML with loading bar
    exportAllCardsAsXML() {
        // Show loading bar
        this.showLoadingBar('Preparing to export all cards as XML...');
        
        // Use setTimeout to allow UI to update before processing
        setTimeout(() => {
            try {
                // Create XML Document
                const xmlDoc = document.implementation.createDocument(null, "cards", null);
                const rootElement = xmlDoc.documentElement;
                
                const totalCards = CardModel.state.cards.length;
                
                // Process each card in the batch
                CardModel.state.cards.forEach((cardState, index) => {
                    // Update progress
                    const progress = Math.round((index / totalCards) * 80);
                    this.updateLoadingProgress(progress, `Processing card ${index+1} of ${totalCards}`);
                    
                    // Add a card element
                    const cardElement = xmlDoc.createElement("card");
                    
                    // Add background information
                    const backgroundElement = xmlDoc.createElement("background");
                    backgroundElement.setAttribute("color", cardState.backgroundColor);
                    
                    // Add background image if exists
                    if (cardState.bgImagePath) {
                        backgroundElement.setAttribute("image", cardState.bgImagePath);
                    }
                    
                    cardElement.appendChild(backgroundElement);
                    
                    // Add elements container
                    const elementsContainer = xmlDoc.createElement("elements");
                    
                    // Process and add each element
                    cardState.elements.forEach(element => {
                        if (element.type === 'text') {
                            const textElement = xmlDoc.createElement("text");
                            
                            // Set attributes
                            textElement.setAttribute("x", Math.round(element.position.x));
                            textElement.setAttribute("y", Math.round(element.position.y));
                            textElement.setAttribute("color", element.data.color);
                            textElement.setAttribute("fontSize", element.data.fontSize);
                            textElement.setAttribute("fontFamily", element.data.fontFamily);
                            
                            if (element.rotation) {
                                textElement.setAttribute("rotation", element.rotation);
                            }
                            
                            // Set text content
                            textElement.textContent = element.data.text;
                            
                            elementsContainer.appendChild(textElement);
                        } 
                        else if (element.type === 'image') {
                            const imageElement = xmlDoc.createElement("image");
                            
                            // Set attributes
                            imageElement.setAttribute("x", Math.round(element.position.x));
                            imageElement.setAttribute("y", Math.round(element.position.y));
                            imageElement.setAttribute("width", Math.round(element.size.w));
                            imageElement.setAttribute("height", Math.round(element.size.h));
                            
                            // Add the name attribute
                            if (element.data.name) {
                                imageElement.setAttribute("name", element.data.name);
                            }
                            
                            // Use the imagePath from batch data
                            const imgSrc = element.data.imagePath || 
                                        (element.data.src && element.data.src.src) || 
                                        element.data.src;
                            
                            if (imgSrc) {
                                imageElement.setAttribute("src", imgSrc);
                            }
                            
                            if (element.rotation) {
                                imageElement.setAttribute("rotation", element.rotation);
                            }
                            
                            elementsContainer.appendChild(imageElement);
                        }
                    });
                    
                    cardElement.appendChild(elementsContainer);
                    rootElement.appendChild(cardElement);
                });
                
                this.updateLoadingProgress(85, 'Formatting XML...');
                
                // Serialize XML to string with proper formatting
                const serializer = new XMLSerializer();
                let xmlString = serializer.serializeToString(xmlDoc);
                
                // Pretty print XML with indentation
                xmlString = this.formatXML(xmlString);
                
                this.updateLoadingProgress(95, 'Starting download...');
                
                // Trigger download
                this.downloadFile(xmlString, "all_cards.xml", "application/xml");
                
                this.updateLoadingProgress(100, 'Complete!');
                
                // Short delay to show 100% completion before hiding
                setTimeout(() => {
                    this.hideLoadingBar();
                }, 500);
                
            } catch (error) {
                console.error('Error exporting all cards as XML:', error);
                this.hideLoadingBar();
                alert('Failed to export all cards as XML: ' + error.message);
            }
        }, 100);
    },

    // Update the function to also display element coordinates when clicked in the element list
    setupElementsList() {
        // When an element is selected from the list, update coordinate display
        const updateElementDisplay = (index) => {
            if (index != null && index >= 0 && index < CardModel.state.elements.length) {
                const element = CardModel.state.elements[index];
                CanvasView.updateCoordinateDisplay(element.position.x, element.position.y);
            }
        };
        
        // Hook this into UIView's updateElementsList function
        const originalUpdateElementsList = UIView.updateElementsList;
        UIView.updateElementsList = function() {
            originalUpdateElementsList.call(this);
            
            // Add click handlers to elements that update coordinates
            const items = document.querySelectorAll('.element-item');
            items.forEach((item, index) => {
                item.addEventListener('click', () => {
                    updateElementDisplay(index);
                });
            });
        };
    },

    // Add helper method to create image element
    addImageElement(img) {
        // Calculate proportional size
        let width = img.width;
        let height = img.height;
        const maxSize = 200;
        
        if (width > height && width > maxSize) {
            height = (height / width) * maxSize;
            width = maxSize;
        } else if (height > maxSize) {
            width = (width / height) * maxSize;
            height = maxSize;
        }
        
        // Add element to card
        const element = {
            type: 'image',
            data: { 
                src: img,
                name: 'Image ' + (CardModel.state.elements.filter(el => el.type === 'image').length + 1)
            },
            position: { 
                x: CanvasView.canvas.width / 2 - width / 2, 
                y: CanvasView.canvas.height / 2 - height / 2 
            },
            size: { w: width, h: height },
            rotation: 0
        };
        
        CardModel.addElement(element);
        CanvasView.render();
        UIView.updateElementsList();
        UIView.switchToTab('layers'); // Switch to layers tab
    },

    // Add a method to rename an image element
    renameImageElement(index, newName) {
        if (index >= 0 && index < CardModel.state.elements.length) {
            const element = CardModel.state.elements[index];
            if (element.type === 'image') {
                // Update the name
                element.data.name = newName.trim() || 'Image';
                // Re-render the elements list
                UIView.updateElementsList();
            }
        }
    },
    
    // New method to load image from URL
    loadImageFromUrl(url) {
        return new Promise((resolve, reject) => {
            if (!url) {
                reject(new Error('Invalid URL'));
                return;
            }

            const img = new Image();
            
            // Set up proper load/error handlers
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image from: ${url}`));
            
            // Set crossOrigin to anonymous to avoid CORS issues when possible
            img.crossOrigin = "anonymous";
            
            // Set the image source
            img.src = url;
            
            // Set a timeout to avoid indefinite waiting
            setTimeout(() => {
                if (!img.complete) {
                    reject(new Error('Image load timed out'));
                }
            }, 30_000);
        });
    },

    // Add a method to update the text of a selected element
    updateSelectedText() {
        const elements = UIView.elements;
        const selectedIndex = CardModel.state.selectedElement;
        
        if (selectedIndex !== null && selectedIndex >= 0 && 
            selectedIndex < CardModel.state.elements.length) {
            
            const element = CardModel.state.elements[selectedIndex];
            
            if (element.type === 'text') {
                // Update text element with edited values
                element.data.text = elements.editTextContent.value;
                element.data.color = elements.editTextColor.value;
                element.data.fontSize = parseInt(elements.editFontSize.value);
                
                // Re-render the canvas
                CanvasView.render();
                UIView.updateElementsList();
            }
        }
    },

    // Reset batch state before importing new XML
    resetBatchState() {
        // Reset batch-related state
        CardModel.state.batchMode = false;
        CardModel.state.cards = [];
        CardModel.state.currentCardIndex = 0;
        
        // Reset current card
        CardModel.state.backgroundImage = null;
        CardModel.state.backgroundColor = '#ffffff';
        CardModel.state.elements = [];
        
        // Reset selection state
        CardModel.state.selectedElement = null;
        CardModel.state.isDragging = false;
        CardModel.state.isResizing = false;
        
        // Update UI controls
        UIView.elements.bgColorInput.value = '#ffffff';
        UIView.elements.exportAllXMLBtn.style.display = 'none';
        UIView.hideTextEditPanel();
        
        // Re-render everything
        CanvasView.render();
        UIView.updateElementsList();
        UIView.updateBatchControls();
    },
    
    // Toggle hotkeys modal visibility
    toggleHotkeysModal(show) {
        const modal = document.getElementById('hotkeysModal');
        if (show === undefined) {
            // Toggle if no parameter provided
            modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
        } else {
            // Otherwise set to the specified state
            modal.style.display = show ? 'flex' : 'none';
        }
    },

    // Add loading bar management methods
    showLoadingBar(message = 'Processing...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const loadingProgressBar = document.getElementById('loadingProgressBar');
        const loadingStatus = document.getElementById('loadingStatus');
        
        // Reset progress bar and status
        loadingProgressBar.style.width = '0%';
        loadingStatus.textContent = '';
        loadingText.textContent = message;
        
        // Show the loading overlay
        loadingOverlay.style.display = 'flex';
    },
    
    updateLoadingProgress(percent, status = '') {
        const loadingProgressBar = document.getElementById('loadingProgressBar');
        const loadingStatus = document.getElementById('loadingStatus');
        
        // Update progress bar
        loadingProgressBar.style.width = `${percent}%`;
        
        // Update status if provided
        if (status) {
            loadingStatus.textContent = status;
        }
    },
    
    hideLoadingBar() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = 'none';
    },
};
