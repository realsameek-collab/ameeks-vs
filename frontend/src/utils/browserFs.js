// A folder on the user's device, opened in the browser with the File System Access API
// (Chrome and Edge). The page never learns the folder's full path, only its name.
// Nodes use the same shape as the files service, with ids "fsa:<projectId>:<path/inside/folder>",
// so the Explorer, Editor, Preview and terminal work on it through features/file.js.

export const supported = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

// Listed in the tree but never read into it, like VS Code's defaults
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'coverage', '.venv', '__pycache__'])
const MAX_FILE_BYTES = 1024 * 1024
const MAX_NODES = 5000

// Folders the user has granted access to in this session, by project id
const roots = new Map()

// ---------- remembering folders (IndexedDB keeps handles across visits) ----------

const DB_NAME = 'ameek-folders'
const STORE = 'handles'

const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
})

const idb = async (mode, action) => {
    const db = await openDb()
    try {
        return await new Promise((resolve, reject) => {
            const request = action(db.transaction(STORE, mode).objectStore(STORE))
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    } finally {
        db.close()
    }
}

const saveHandle = (projectId, handle) => idb('readwrite', store => store.put(handle, projectId))
const loadHandle = (projectId) => idb('readonly', store => store.get(projectId)).catch(() => null)

// ---------- choosing and connecting ----------

// Resolves with the chosen folder, or null if the user cancelled
export const pickFolder = async () => {
    try {
        return await window.showDirectoryPicker({ id: 'ameek-project', mode: 'readwrite' })
    } catch (error) {
        if (error?.name === 'AbortError') return null
        throw error
    }
}

export const linkFolder = async (projectId, handle) => {
    roots.set(projectId, handle)
    await saveHandle(projectId, handle)
}

// 'ready' when the folder can be used; 'permission' when the browser needs the user to
// allow access again (only a click can do that, so pass request: true from a click);
// 'missing' when this browser has never had the folder, e.g. on another device
export const connect = async (projectId, { request = false } = {}) => {
    if (!supported) return 'unsupported'
    const handle = roots.get(projectId) || await loadHandle(projectId)
    if (!handle) return 'missing'
    let state = await handle.queryPermission({ mode: 'readwrite' })
    if (state === 'prompt' && request) state = await handle.requestPermission({ mode: 'readwrite' })
    if (state !== 'granted') return 'permission'
    roots.set(projectId, handle)
    return 'ready'
}

export const isConnected = (projectId) => roots.has(projectId)

// ---------- ids and lookups ----------

const makeId = (projectId, segments) => `fsa:${projectId}:${segments.join('/')}`

export const isBrowserId = (id) => typeof id === 'string' && id.startsWith('fsa:')

const parseId = (id) => {
    const rest = id.slice(4)
    const colon = rest.indexOf(':')
    const projectId = rest.slice(0, colon)
    const path = rest.slice(colon + 1)
    const root = roots.get(projectId)
    if (!root) throw new Error('The project folder is not connected')
    return { projectId, root, segments: path ? path.split('/') : [] }
}

const checkName = (name) => {
    const value = typeof name === 'string' ? name.trim() : ''
    if (!value || /[\\/:*?"<>|]/.test(value) || value === '.' || value === '..') throw new Error('Invalid name')
    return value
}

const getDir = async (root, segments) => {
    let dir = root
    for (const part of segments) dir = await dir.getDirectoryHandle(part)
    return dir
}

// The handle for an id, plus its parent folder (null for the project folder itself)
const resolve = async (id) => {
    const { projectId, root, segments } = parseId(id)
    if (!segments.length) return { projectId, segments, handle: root, parent: null }
    const parent = await getDir(root, segments.slice(0, -1))
    const name = segments[segments.length - 1]
    let handle
    try {
        handle = await parent.getFileHandle(name)
    } catch (error) {
        if (error?.name !== 'TypeMismatchError') throw error
        handle = await parent.getDirectoryHandle(name)
    }
    return { projectId, segments, handle, parent }
}

const exists = async (dir, name) => {
    try {
        await dir.getFileHandle(name)
        return true
    } catch (error) {
        return error?.name === 'TypeMismatchError'
    }
}

// ---------- nodes ----------

const extension = (name) => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '')

// Text files only: a NUL byte in the first 8 KB means binary
const fileNode = async (handle, projectId, segments) => {
    const file = await handle.getFile()
    let content = ''
    let skipped
    if (file.size > MAX_FILE_BYTES) skipped = 'too large'
    else {
        const head = new Uint8Array(await file.slice(0, 8192).arrayBuffer())
        if (head.includes(0)) skipped = 'binary'
        else content = await file.text()
    }
    return {
        _id: makeId(projectId, segments),
        parentId: makeId(projectId, segments.slice(0, -1)),
        name: handle.name,
        type: 'file',
        extension: extension(handle.name),
        content,
        size: file.size,
        updatedAt: new Date(file.lastModified).toISOString(),
        ...(skipped && { skipped }),
    }
}

const folderNode = (handle, projectId, segments, children = []) => ({
    _id: makeId(projectId, segments),
    parentId: segments.length ? makeId(projectId, segments.slice(0, -1)) : null,
    name: handle.name,
    type: 'folder',
    children,
})

const sortNodes = (a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1)

export const tree = async (projectId) => {
    const root = roots.get(projectId)
    if (!root) return []
    let count = 0
    const walk = async (dir, segments, node) => {
        for await (const entry of dir.values()) {
            if (count++ >= MAX_NODES) break
            const childSegments = [...segments, entry.name]
            if (entry.kind === 'directory') {
                const child = folderNode(entry, projectId, childSegments)
                if (!SKIP_DIRS.has(entry.name)) await walk(entry, childSegments, child)
                node.children.push(child)
            } else {
                try {
                    node.children.push(await fileNode(entry, projectId, childSegments))
                } catch {
                    // Removed or locked while reading
                }
            }
        }
        node.children.sort(sortNodes)
    }
    const top = folderNode(root, projectId, [])
    await walk(root, [], top)
    return [top]
}

// ---------- operations ----------

export const read = async (id) => {
    const { projectId, segments, handle } = await resolve(id)
    if (handle.kind !== 'file') throw new Error('Not a file')
    return fileNode(handle, projectId, segments)
}

export const write = async (id, content) => {
    const { projectId, segments, handle } = await resolve(id)
    if (handle.kind !== 'file') throw new Error('Not a file')
    const writable = await handle.createWritable()
    await writable.write(String(content ?? ''))
    await writable.close()
    return fileNode(handle, projectId, segments)
}

export const create = async ({ parentId, name, type, content = '' }) => {
    const { projectId, segments, handle: dir } = await resolve(parentId)
    if (dir.kind !== 'directory') throw new Error('Not a folder')
    const safe = checkName(name)
    if (await exists(dir, safe)) throw new Error(`"${safe}" already exists`)
    const childSegments = [...segments, safe]
    if (type === 'folder') return folderNode(await dir.getDirectoryHandle(safe, { create: true }), projectId, childSegments)
    const handle = await dir.getFileHandle(safe, { create: true })
    const writable = await handle.createWritable()
    await writable.write(String(content))
    await writable.close()
    return fileNode(handle, projectId, childSegments)
}

// Copies a file or a whole folder into `dir` under `name`
const copyInto = async (handle, dir, name) => {
    if (handle.kind === 'file') {
        const target = await dir.getFileHandle(name, { create: true })
        const writable = await target.createWritable()
        await writable.write(await handle.getFile())
        await writable.close()
        return
    }
    const folder = await dir.getDirectoryHandle(name, { create: true })
    for await (const entry of handle.values()) await copyInto(entry, folder, entry.name)
}

export const rename = async (id, name) => {
    const { projectId, segments, handle, parent } = await resolve(id)
    if (!parent) throw new Error('Cannot rename the project folder')
    const safe = checkName(name)
    if (safe !== handle.name) {
        if (await exists(parent, safe)) throw new Error(`"${safe}" already exists`)
        // move() is newer and not available for every kind of handle, so fall back to copy + delete
        let moved = false
        if (typeof handle.move === 'function') {
            try {
                await handle.move(safe)
                moved = true
            } catch {
                moved = false
            }
        }
        if (!moved) {
            await copyInto(handle, parent, safe)
            await parent.removeEntry(handle.name, { recursive: true })
        }
    }
    return { _id: makeId(projectId, [...segments.slice(0, -1), safe]), name: safe }
}

// Permanent: the browser has no access to the Recycle Bin
export const remove = async (id) => {
    const { handle, parent } = await resolve(id)
    if (!parent) throw new Error('Cannot delete the project folder')
    await parent.removeEntry(handle.name, { recursive: true })
    return { _id: id }
}

// Calls back when files change outside the app (another editor, a git pull). Only newer
// Chrome and Edge have FileSystemObserver; elsewhere the Explorer's refresh button does it.
export const watch = (projectId, callback) => {
    const root = roots.get(projectId)
    if (!root || typeof window.FileSystemObserver !== 'function') return () => {}
    let timer = null
    const observer = new window.FileSystemObserver(() => {
        clearTimeout(timer)
        timer = setTimeout(callback, 300)
    })
    observer.observe(root, { recursive: true }).catch(() => {})
    return () => {
        clearTimeout(timer)
        observer.disconnect()
    }
}
