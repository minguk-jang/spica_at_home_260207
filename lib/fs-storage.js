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
    
    // Helper to check if we are ready
    function isReady() {
        return !!dirHandle;
    }

    return { selectDirectory, ensurePermission, saveJson, restoreHandle, isReady };
})();
