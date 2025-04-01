// ===== MODEL =====
// Data structures and business logic
const CardModel = {
    state: {
        backgroundColor: '#ffffff',
        backgroundImage: null,
        elements: [],
        selectedElement: null,
        isDragging: false,
        dragOffset: {x: 0, y: 0},
        textSettings: {
            color: '#000000',
            fontSize: 24,
            fontFamily: 'Arial'
        },
        // Batch processing state
        batchMode: false,
        cards: [],
        currentCardIndex: 0,
        isResizing: false,
        resizeHandle: null, // 'nw', 'ne', 'sw', 'se'
        aspectRatioLocked: true, // Default to locked aspect ratio
        originalAspectRatio: 1, // Store original aspect ratio during resize
        originalWidth: 0,      // Store original width when resizing starts
        originalHeight: 0,     // Store original height when resizing starts
    },

    // Model Methods
    addElement(element) {
        this.state.elements.push(element);
        return this.state.elements.length - 1; // Return new element index
    },

    removeElement(index) {
        if (index >= 0 && index < this.state.elements.length) {
            this.state.elements.splice(index, 1);
            
            // Update selected element reference if needed
            if (this.state.selectedElement === index) {
                this.state.selectedElement = null;
            } else if (this.state.selectedElement > index) {
                this.state.selectedElement--;
            }
            return true;
        }
        return false;
    },

    moveElement(fromIndex, toIndex) {
        if (fromIndex >= 0 && fromIndex < this.state.elements.length &&
            toIndex >= 0 && toIndex < this.state.elements.length) {
            const element = this.state.elements.splice(fromIndex, 1)[0];
            this.state.elements.splice(toIndex, 0, element);
            
            // Update selected element reference if needed
            if (this.state.selectedElement === fromIndex) {
                this.state.selectedElement = toIndex;
            } else if (this.state.selectedElement === toIndex) {
                this.state.selectedElement = fromIndex;
            }
            return true;
        }
        return false;
    },

    selectElement(index) {
        if (index === null || (index >= 0 && index < this.state.elements.length)) {
            this.state.selectedElement = index;
            return true;
        }
        return false;
    },

    saveCardState() {
        return {
            backgroundColor: this.state.backgroundColor,
            backgroundImage: this.state.backgroundImage,
            elements: JSON.parse(JSON.stringify(this.state.elements))
        };
    },

    loadCardState(savedState) {
        this.state.backgroundColor = savedState.backgroundColor;
        this.state.backgroundImage = savedState.backgroundImage;
        this.state.elements = JSON.parse(JSON.stringify(savedState.elements));
    },

    processXMLData(xmlDoc) {
        // Start with a clean slate - completely clear the cards array
        this.state.cards = [];
        
        const cardElements = xmlDoc.getElementsByTagName("card");
        
        // If no cards found, return early
        if (cardElements.length === 0) {
            return false;
        }
        
        for (let i = 0; i < cardElements.length; i++) {
            const cardElement = cardElements[i];
            
            // Create a card state with default values
            const cardState = {
                backgroundColor: '#ffffff',
                elements: []
            };
            
            // Process background
            const backgroundElement = cardElement.getElementsByTagName("background")[0];
            if (backgroundElement) {
                if (backgroundElement.getAttribute("color")) {
                    cardState.backgroundColor = backgroundElement.getAttribute("color");
                }
                
                if (backgroundElement.getAttribute("image")) {
                    cardState.bgImagePath = backgroundElement.getAttribute("image");
                }
            }
            
            // Process elements
            const elementsContainer = cardElement.getElementsByTagName("elements")[0];
            if (elementsContainer) {
                // Process image elements
                const imageElements = elementsContainer.getElementsByTagName("image");
                for (let j = 0; j < imageElements.length; j++) {
                    const imageElement = imageElements[j];
                    const src = imageElement.getAttribute("src");
                    
                    if (src) {
                        cardState.elements.push({
                            type: 'image',
                            data: {
                                imagePath: src
                            },
                            position: {
                                x: parseInt(imageElement.getAttribute("x")) || (CanvasView.canvas.width / 2),
                                y: parseInt(imageElement.getAttribute("y")) || (CanvasView.canvas.height / 2)
                            },
                            size: { 
                                w: parseInt(imageElement.getAttribute("width")) || 100,
                                h: parseInt(imageElement.getAttribute("height")) || 100
                            },
                            rotation: parseInt(imageElement.getAttribute("rotation")) || 0
                        });
                    }
                }
                
                // Process text elements
                const textElements = elementsContainer.getElementsByTagName("text");
                for (let j = 0; j < textElements.length; j++) {
                    const textElement = textElements[j];
                    
                    cardState.elements.push({
                        type: 'text',
                        data: {
                            text: textElement.textContent || "",
                            color: textElement.getAttribute("color") || "#000000",
                            fontSize: parseInt(textElement.getAttribute("fontSize")) || 24,
                            fontFamily: textElement.getAttribute("fontFamily") || "Arial"
                        },
                        position: {
                            x: parseInt(textElement.getAttribute("x")) || (CanvasView.canvas.width / 2),
                            y: parseInt(textElement.getAttribute("y")) || (CanvasView.canvas.height / 2)
                        },
                        size: { w: 0, h: 0 },
                        rotation: parseInt(textElement.getAttribute("rotation")) || 0
                    });
                }
            }
            
            this.state.cards.push(cardState);
        }
        
        return this.state.cards.length > 0;
    },

    // Add method to resize an element
    resizeElement(index, newWidth, newHeight) {
        if (index >= 0 && index < this.state.elements.length) {
            // Ensure minimum size
            const minSize = 10;
            newWidth = Math.max(newWidth, minSize);
            newHeight = Math.max(newHeight, minSize);
            
            this.state.elements[index].size.w = newWidth;
            this.state.elements[index].size.h = newHeight;
            return true;
        }
        return false;
    }
};
