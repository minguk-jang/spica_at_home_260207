document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const moveModeBtn = document.getElementById('move-mode-btn');
    const selectDirBtn = document.getElementById('select-dir-btn');
    const fileList = document.getElementById('file-list');
    const emptyState = document.getElementById('empty-state');
    const mainView = document.getElementById('main-view');
    const detailView = document.getElementById('detail-view');
    const moveView = document.getElementById('move-view');
    const backBtn = document.getElementById('back-btn');
    const saveBtn = document.getElementById('save-btn');
    const currentFilenameEl = document.getElementById('current-filename');
    const entryList = document.getElementById('entry-list');
    
    // Move Mode Elements
    const leftFileSelect = document.getElementById('left-file-select');
    const rightFileSelect = document.getElementById('right-file-select');
    const leftDropZone = document.getElementById('left-drop-zone');
    const rightDropZone = document.getElementById('right-drop-zone');
    const moveSaveBtn = document.getElementById('move-save-btn');
    const moveBackBtn = document.getElementById('move-back-btn');

    // State
    let currentFile = null;
    let currentData = null;
    let moveData = {
        left: { file: null, data: [] },
        right: { file: null, data: [] }
    };
    let draggedItem = null;

    // Initialize
    init();

    async function init() {
        if (FsStorage.isReady()) {
            loadFiles();
        } else {
            // Try to restore handle
            const restored = await FsStorage.restoreHandle();
            if (restored) {
                loadFiles();
            } else {
                showEmptyState();
            }
        }
    }

    // --- Event Listeners ---

    refreshBtn.addEventListener('click', loadFiles);
    
    selectDirBtn.addEventListener('click', async () => {
        try {
            const success = await FsStorage.selectDirectory();
            if (success) {
                loadFiles();
            }
        } catch (err) {
            console.error('Failed to select directory:', err);
            alert('Failed to select directory. Please try again.');
        }
    });

    backBtn.addEventListener('click', showMainView);
    moveBackBtn.addEventListener('click', showMainView);

    saveBtn.addEventListener('click', async () => {
        if (currentFile && currentData) {
            try {
                // Update metadata before saving
                const exportData = {
                    exportedAt: new Date().toISOString(),
                    totalEntries: currentData.length,
                    entries: currentData
                };
                await FsStorage.saveJson(currentFile, exportData);
                alert('Saved successfully!');
                loadFiles(); // Refresh metadata in list
            } catch (err) {
                console.error('Failed to save:', err);
                alert('Failed to save file: ' + err.message);
            }
        }
    });

    moveModeBtn.addEventListener('click', () => {
        showMoveView();
    });

    // Move Mode Selectors
    leftFileSelect.addEventListener('change', (e) => loadMoveFile('left', e.target.value));
    rightFileSelect.addEventListener('change', (e) => loadMoveFile('right', e.target.value));
    
    moveSaveBtn.addEventListener('click', async () => {
        try {
            if (moveData.left.file) {
                await FsStorage.saveJson(moveData.left.file, {
                    exportedAt: new Date().toISOString(),
                    totalEntries: moveData.left.data.length,
                    entries: moveData.left.data
                });
            }
            if (moveData.right.file) {
                await FsStorage.saveJson(moveData.right.file, {
                    exportedAt: new Date().toISOString(),
                    totalEntries: moveData.right.data.length,
                    entries: moveData.right.data
                });
            }
            alert('Saved both files!');
        } catch (err) {
            alert('Error saving files: ' + err.message);
        }
    });

    // --- Core Logic ---

    async function loadFiles() {
        try {
            fileList.innerHTML = '<div class="loading">Loading...</div>';
            emptyState.classList.add('hidden');
            
            const files = await FsStorage.listJsonFiles();
            
            fileList.innerHTML = '';
            
            if (files.length === 0) {
                showEmptyState();
                return;
            }

            // Populate select dropdowns for move mode
            updateFileSelects(files);

            for (const filename of files) {
                const card = await createFileCard(filename);
                fileList.appendChild(card);
            }
        } catch (err) {
            console.error('Error loading files:', err);
            if (err.message.includes('permission') || err.message.includes('granted')) {
                showEmptyState();
            } else {
                fileList.innerHTML = `<div class="error">Error: ${err.message}</div>`;
            }
        }
    }

    function updateFileSelects(files) {
        const options = files.map(f => `<option value="${f}">${f}</option>`).join('');
        leftFileSelect.innerHTML = `<option value="">Select File...</option>${options}`;
        rightFileSelect.innerHTML = `<option value="">Select File...</option>${options}`;
    }

    function showEmptyState() {
        fileList.innerHTML = '';
        emptyState.classList.remove('hidden');
    }

    function showMainView() {
        detailView.classList.add('hidden');
        moveView.classList.add('hidden');
        mainView.classList.remove('hidden');
        loadFiles();
    }

    function showDetailView(filename) {
        mainView.classList.add('hidden');
        moveView.classList.add('hidden');
        detailView.classList.remove('hidden');
        currentFilenameEl.textContent = filename;
        loadFileDetail(filename);
    }

    function showMoveView() {
        mainView.classList.add('hidden');
        detailView.classList.add('hidden');
        moveView.classList.remove('hidden');
    }

    async function createFileCard(filename) {
        const div = document.createElement('div');
        div.className = 'file-card';
        
        let entryCount = '?';
        let size = '? KB';
        let date = '';

        try {
            const fileData = await FsStorage.readJson(filename);
            if (Array.isArray(fileData.data.entries)) {
                entryCount = fileData.data.entries.length;
            } else if (Array.isArray(fileData.data)) {
                 // Backward compatibility if root is array
                entryCount = fileData.data.length;
            }
            size = (fileData.size / 1024).toFixed(1) + ' KB';
            date = new Date(fileData.lastModified).toLocaleString();
        } catch (e) {
            console.warn(`Failed to read metadata for ${filename}`, e);
        }

        div.innerHTML = `
            <div class="card-header">
                <span class="file-name">${filename}</span>
            </div>
            <div class="card-meta">
                <span>${entryCount} entries</span>
                <span>${size}</span>
            </div>
            <div class="card-meta">
                <span>${date}</span>
            </div>
            <div class="card-actions">
                <button class="card-btn delete-btn">Delete</button>
                <button class="card-btn open-btn">Open</button>
            </div>
        `;

        const openBtn = div.querySelector('.open-btn');
        const deleteBtn = div.querySelector('.delete-btn');

        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDetailView(filename);
        });

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete ${filename}?`)) {
                await FsStorage.deleteFile(filename);
                loadFiles();
            }
        });

        div.addEventListener('click', () => {
            showDetailView(filename);
        });

        return div;
    }

    async function loadFileDetail(filename) {
        currentFile = filename;
        entryList.innerHTML = '<div class="loading">Loading entries...</div>';
        
        try {
            const result = await FsStorage.readJson(filename);
            // Handle wrapper object or direct array
            if (result.data.entries && Array.isArray(result.data.entries)) {
                currentData = result.data.entries;
            } else if (Array.isArray(result.data)) {
                currentData = result.data;
            } else {
                currentData = [];
            }
            renderEntries(currentData);
        } catch (err) {
            console.error('Error reading file:', err);
            entryList.innerHTML = `<div class="error">Error loading file: ${err.message}</div>`;
        }
    }

    function renderEntries(data) {
        entryList.innerHTML = '';
        
        if (!Array.isArray(data) || data.length === 0) {
            entryList.innerHTML = '<div class="empty">No entries found in this file.</div>';
            return;
        }

        data.forEach((entry, index) => {
            const el = createEntryElement(entry, index);
            entryList.appendChild(el);
        });
    }

    function createEntryElement(entry, index) {
        const div = document.createElement('div');
        div.className = 'entry-item';
        
        const tag = entry.elementInfo?.tagName || 'UNKNOWN';
        const id = entry.elementInfo?.id ? `#${entry.elementInfo.id}` : '';
        const title = `${tag}${id}`;

        div.innerHTML = `
            <div class="entry-header">
                <span class="entry-title">#${index + 1} ${title}</span>
                <button class="card-btn delete-entry-btn">Remove</button>
            </div>
            <div class="entry-content">
                <div class="entry-section">
                    <h4>Target Element</h4>
                    <div class="info-row">
                        <span class="info-label">Tag:</span>
                        <span class="info-value">${entry.elementInfo?.tagName || '-'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Text:</span>
                        <span class="info-value">${(entry.elementInfo?.textContent || '').substring(0, 50)}...</span>
                    </div>
                     <div class="info-row">
                        <span class="info-label">URL:</span>
                        <span class="info-value">${entry.elementInfo?.url || '-'}</span>
                    </div>
                </div>
                <div class="entry-section">
                    <h4>Selectors</h4>
                    <div class="selectors-container">
                        ${renderSelectors(entry.selectors, index)}
                    </div>
                </div>
            </div>
        `;

        const inputs = div.querySelectorAll('.selector-input');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                const value = e.target.value;
                // Since the object structure is unpredictable (based on keys), we just update the value
                // Wait, existing structure is { selectors: { id: "foo", classes: "bar" } } OR { selectors: { id: {value: "foo", valid: true} } }?
                // Looking at sidepanel.js, it seems `selectors` is key-value map directly from selector-core.js?
                // "selectors" in sidepanel.js seems to be key: value string.
                // BUT sidepanel.js handles `message.data` which has `selectors` and `validation`.
                // When saving history, `addToHistory({ selectors, validation, elementInfo })` is used.
                // So `entry.selectors` is likely `{ id: "#foo", class: ".bar" }`.
                // Wait, in `renderSelectors` below, I check for `obj.valid`.
                // Ah, the saved format includes `selectors` (values) and `validation` (booleans).
                
                // My `renderSelectors` function assumed `selectors[key]` is an object `{value, valid}`.
                // But actually `entry` has `selectors` object and `validation` object separately.
                
                // FIX: update the value in `entry.selectors`
                if (currentData[index].selectors) {
                     currentData[index].selectors[key] = value;
                }
            });
        });

        const deleteBtn = div.querySelector('.delete-entry-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Remove this entry?')) {
                currentData.splice(index, 1);
                renderEntries(currentData);
            }
        });

        return div;
    }

    function renderSelectors(selectors, entryIndex) {
        if (!selectors) return '';
        // We also need validation data to show status, but createEntryElement didn't pass it.
        // Let's retrieve it from currentData.
        const entry = currentData[entryIndex];
        const validation = entry.validation || {};
        
        return Object.entries(selectors).map(([key, value]) => {
            const isValid = validation[key] === true;
            const isInvalid = validation[key] === false;
            const statusIcon = isValid ? '✅' : (isInvalid ? '❌' : '❓');
            
            return `
                <div class="selector-row">
                    <span class="selector-key">${key}:</span>
                    <input type="text" class="selector-input" 
                        value="${value || ''}" 
                        data-key="${key}" 
                        data-entry-index="${entryIndex}">
                    <span class="validation-status" title="Validation Status">${statusIcon}</span>
                </div>
            `;
        }).join('');
    }

    // --- Drag and Drop Logic ---

    async function loadMoveFile(side, filename) {
        if (!filename) {
            moveData[side].file = null;
            moveData[side].data = [];
            renderMoveList(side);
            return;
        }

        try {
            const result = await FsStorage.readJson(filename);
            moveData[side].file = filename;
             if (result.data.entries && Array.isArray(result.data.entries)) {
                moveData[side].data = result.data.entries;
            } else if (Array.isArray(result.data)) {
                moveData[side].data = result.data;
            } else {
                moveData[side].data = [];
            }
            renderMoveList(side);
        } catch (err) {
            console.error(`Error loading ${side} file:`, err);
            alert(`Failed to load ${filename}`);
        }
    }

    function renderMoveList(side) {
        const container = side === 'left' ? leftDropZone : rightDropZone;
        container.innerHTML = '';
        
        const data = moveData[side].data;
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty">Empty</div>';
            // Even if empty, it should be a drop target
        }

        data.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'drag-item';
            div.draggable = true;
            div.dataset.side = side;
            div.dataset.index = index;
            
            const tag = entry.elementInfo?.tagName || 'UNKNOWN';
            const id = entry.elementInfo?.id ? `#${entry.elementInfo.id}` : '';
            
            div.innerHTML = `
                <div class="drag-item-title">${tag}${id}</div>
                <div class="drag-item-details">${(entry.elementInfo?.textContent || '').substring(0, 30)}</div>
            `;

            div.addEventListener('dragstart', handleDragStart);
            container.appendChild(div);
        });

        // Setup drop zone events
        container.ondragover = handleDragOver;
        container.ondrop = (e) => handleDrop(e, side);
        container.ondragleave = handleDragLeave;
    }

    function handleDragStart(e) {
        draggedItem = {
            side: e.target.dataset.side,
            index: parseInt(e.target.dataset.index)
        };
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e, targetSide) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!draggedItem) return;

        const sourceSide = draggedItem.side;
        const sourceIndex = draggedItem.index;

        // Don't do anything if dropped on same list (for now - reordering could be added later)
        if (sourceSide === targetSide) return;

        // Move item
        const item = moveData[sourceSide].data[sourceIndex];
        
        // Remove from source
        moveData[sourceSide].data.splice(sourceIndex, 1);
        
        // Add to target
        moveData[targetSide].data.push(item);

        // Re-render both
        renderMoveList(sourceSide);
        renderMoveList(targetSide);
        
        draggedItem = null;
    }

});
