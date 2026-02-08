const FsStorage = (() => {
    const DIR_HANDLE_KEY = 'directoryHandle';
    let dirHandle = null;

    async function selectDirectory() {
        try {
            dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            await IdbHelper.set(DIR_HANDLE_KEY, dirHandle);
            return true;
        } catch (err) {
            if (err.name === 'AbortError') return false;  // User cancelled
            throw err;
        }
    }

    async function ensurePermission() {
        if (!dirHandle) {
            dirHandle = await IdbHelper.get(DIR_HANDLE_KEY);
        }
        if (!dirHandle) return false;

        const opts = { mode: 'readwrite' };
        // Check if we already have permission
        if ((await dirHandle.queryPermission(opts)) === 'granted') return true;
        // Request permission if not
        if ((await dirHandle.requestPermission(opts)) === 'granted') return true;
        return false;
    }

    async function saveJson(filename, data) {
        if (!await ensurePermission()) {
            throw new Error('디렉토리 접근 권한이 없습니다 (먼저 디렉토리를 설정해주세요)');
        }
        
        // Create or overwrite file
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    }

    async function restoreHandle() {
        try {
            dirHandle = await IdbHelper.get(DIR_HANDLE_KEY);
            return !!dirHandle;
        } catch {
            return false;
        }
    }
    
    async function listJsonFiles() {
        if (!await ensurePermission()) {
            throw new Error('Directory access permission not granted');
        }
        
        const files = [];
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.startsWith('selectors-') && entry.name.endsWith('.json')) {
                files.push(entry.name);
            }
        }
        return files.sort().reverse(); // Show latest files first
    }

    async function readJson(filename) {
        if (!await ensurePermission()) {
            throw new Error('Directory access permission not granted');
        }

        try {
            const fileHandle = await dirHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);
            // Return metadata along with data
            return {
                filename,
                data,
                lastModified: file.lastModified,
                size: file.size
            };
        } catch (err) {
            console.error(`Error reading ${filename}:`, err);
            throw err;
        }
    }

    async function deleteFile(filename) {
        if (!await ensurePermission()) {
            throw new Error('Directory access permission not granted');
        }
        await dirHandle.removeEntry(filename);
    }

    async function getDirHandle() {
        if (!dirHandle) {
             await restoreHandle();
        }
        return dirHandle;
    }

    // Helper to check if we are ready
    function isReady() {
        return !!dirHandle;
    }

    return { 
        selectDirectory, 
        ensurePermission, 
        saveJson, 
        listJsonFiles, 
        readJson, 
        deleteFile,
        getDirHandle,
        restoreHandle, 
        isReady 
    };
})();
