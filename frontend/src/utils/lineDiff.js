// Counts added and removed lines between two versions of a file, for the "+12 −3"
// badges on AmeekAi's changes. The editor's diff view shows the lines themselves.

// Above this many line pairs the exact count would be slow; an estimate is enough then
const MAX_CELLS = 4_000_000

const splitLines = (text) => (text ? text.split('\n') : [])

export const countLineChanges = (before, after) => {
    const a = splitLines(before ?? '')
    const b = splitLines(after ?? '')

    // Unchanged lines at both ends need no comparison
    let start = 0
    while (start < a.length && start < b.length && a[start] === b[start]) start++
    let endA = a.length
    let endB = b.length
    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
        endA--
        endB--
    }
    const x = a.slice(start, endA)
    const y = b.slice(start, endB)

    let common
    if (x.length * y.length <= MAX_CELLS) {
        // Longest common subsequence, one row at a time
        let previous = new Uint32Array(y.length + 1)
        let current = new Uint32Array(y.length + 1)
        for (let i = 1; i <= x.length; i++) {
            for (let j = 1; j <= y.length; j++) {
                current[j] = x[i - 1] === y[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1])
            }
            ;[previous, current] = [current, previous]
        }
        common = previous[y.length]
    } else {
        // Estimate: lines present in both, ignoring order
        const counts = new Map()
        for (const line of x) counts.set(line, (counts.get(line) || 0) + 1)
        common = 0
        for (const line of y) {
            const left = counts.get(line)
            if (left) {
                common++
                counts.set(line, left - 1)
            }
        }
    }

    return { added: y.length - common, removed: x.length - common }
}
