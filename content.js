(() => {
    let collecting = false;
    let lastHighlighted = null;
    let statusBar = null;
    let styleElement = null;

    // ------------------------------------------------------------------------
    // UI Helpers
    // ------------------------------------------------------------------------

    function injectStyles() {
        if (document.getElementById('sc-styles')) return;
        
        const css = `
            .__sc-status-bar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                z-index: 2147483647;
                background: linear-gradient(90deg, #58a6ff, #238636, #58a6ff);
                background-size: 200% 100%;
                animation: sc-gradient 2s linear infinite;
                pointer-events: none;
            }
            @keyframes sc-gradient {
                0% { background-position: 100% 0; }
                100% { background-position: -100% 0; }
            }
            .__sc-highlight {
                outline: 3px solid #58a6ff !important;
                outline-offset: 2px;
            }
        `;
        
        styleElement = document.createElement('style');
        styleElement.id = 'sc-styles';
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
    }

    function removeStyles() {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
    }

    function createStatusBar() {
        if (document.querySelector('.__sc-status-bar')) return;
        
        statusBar = document.createElement('div');
        statusBar.className = '__sc-status-bar';
        document.body.appendChild(statusBar);
    }

    function removeStatusBar() {
        if (statusBar) {
            statusBar.remove();
            statusBar = null;
        }
    }

    function clearHighlight() {
        if (lastHighlighted) {
            lastHighlighted.classList.remove('__sc-highlight');
            lastHighlighted = null;
        }
    }

    // ------------------------------------------------------------------------
    // Event Handlers
    // ------------------------------------------------------------------------

    function handleClick(e) {
        if (!collecting) return;
        // Ignore clicks on our own UI
        if (e.target.closest('.__sc-status-bar')) return;

        e.preventDefault();
        e.stopPropagation();

        clearHighlight();

        e.target.classList.add('__sc-highlight');
        lastHighlighted = e.target;

        if (!window.SelectorCore) {
            console.error('SelectorCore not loaded');
            return;
        }

        const selectors = window.SelectorCore.getAllSelectors(e.target);
        const validation = window.SelectorCore.validateAllSelectors(selectors, e.target);

        const elementInfo = {
            tagName: e.target.tagName.toLowerCase(),
            id: e.target.id || '',
            className: (typeof e.target.className === 'string') ? e.target.className : '',
            textContent: (e.target.textContent || '').trim().slice(0, 50),
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        chrome.runtime.sendMessage({
            type: 'SELECTORS_COLLECTED',
            data: { selectors, validation, elementInfo }
        }).catch(err => {
            // Ignore errors if sidepanel is closed or not listening
            // console.debug('Message send failed', err);
        });
    }

    // ------------------------------------------------------------------------
    // Message Listener
    // ------------------------------------------------------------------------

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'PING':
                sendResponse({ alive: true });
                break;

            case 'START_COLLECTING':
                collecting = true;
                injectStyles();
                createStatusBar();
                document.addEventListener('click', handleClick, true);
                break;

            case 'STOP_COLLECTING':
                collecting = false;
                document.removeEventListener('click', handleClick, true);
                clearHighlight();
                removeStatusBar();
                // We keep styles injected to avoid FOUC if re-enabled quickly, 
                // or we can remove them. The plan implies cleaning up fully.
                // "표시 바 제거, 클릭 리스너 해제, 하이라이트 제거"
                // It doesn't explicitly say remove style tag, but it's cleaner to leave it or remove it.
                // Since __sc-highlight is removed, the style tag is harmless. 
                // But let's follow the "clean" approach if we want to be thorough.
                // However, removing style tag might cause layout shift if we had other styles there? 
                // No, it's just our custom styles.
                break;

            case 'VALIDATE_SELECTOR':
                if (!collecting) {
                    // Even if not collecting, we might want to validate? 
                    // The plan says "VALIDATE_SELECTOR -> 해당 셀렉터로 요소 검색 -> { valid: true/false } 응답"
                    // It doesn't strictly require collecting mode.
                }
                
                const { selector, isXPath } = message.data;
                let valid = false;
                try {
                    if (isXPath) {
                        const result = document.evaluate(
                            selector, 
                            document, 
                            null, 
                            XPathResult.FIRST_ORDERED_NODE_TYPE, 
                            null
                        );
                        valid = !!result.singleNodeValue;
                    } else {
                        valid = !!document.querySelector(selector);
                    }
                } catch (e) {
                    valid = false;
                }
                sendResponse({ valid });
                break;
        }
        
        // Return true if we use sendResponse asynchronously (not strictly needed here but good practice if logic changes)
        // ensureContentScript uses PING which needs response.
    });

})();
