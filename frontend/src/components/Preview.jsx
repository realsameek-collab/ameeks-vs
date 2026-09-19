import React, { useMemo, useState } from 'react'
import { RotateCw } from 'lucide-react'

const EMPTY_PAGE = `
<!DOCTYPE html>
<html>
<body style="margin:0; background:#0a0a0c; color:#999; font-family:Arial,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
  <div style="text-align:center;">
    <h3 style="margin:0 0 6px;">No HTML file found</h3>
    <p style="margin:0; font-size:13px; color:#666;">Create an index.html to see the preview</p>
  </div>
</body>
</html>
`

// Flattens the tree into files with their full path, using unsaved drafts when present
const collectFiles = (nodes, drafts, parents = [], out = []) => {
  for (const node of nodes || []) {
    const path = [...parents, node.name]
    if (node.type === 'file') {
      out.push({ ...node, path: path.join('/'), content: drafts[node._id] ?? node.content ?? '' })
    }
    if (node.children?.length) collectFiles(node.children, drafts, path, out)
  }
  return out
}

const dirOf = (path) => path.split('/').slice(0, -1).join('/')

// Finds the project file an href/src points at, relative to the HTML file's folder
const resolveRef = (files, htmlDir, ref) => {
  if (!ref || /^(https?:)?\/\/|^(data|blob):/i.test(ref)) return null
  const clean = ref.split(/[?#]/)[0]
  const parts = clean.startsWith('/') ? [] : htmlDir.split('/').filter(Boolean)
  for (const part of clean.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  const full = parts.join('/')
  const tail = '/' + clean.replace(/^(\.\/|\/)+/, '')
  return files.find(f => f.path === full) || files.find(f => ('/' + f.path).endsWith(tail)) || null
}

// Stops file content from closing the tag it is inlined into
const escapeTag = (content, tag) => content.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`)

const buildDocument = (files, htmlFile) => {
  const htmlDir = dirOf(htmlFile.path)
  let html = htmlFile.content
  let linked = false

  // Inline <link rel="stylesheet" href="..."> pointing at project files
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel=["']?stylesheet/i.test(tag)) return tag
    const file = resolveRef(files, htmlDir, tag.match(/href=["']([^"']+)["']/i)?.[1])
    if (!file) return tag
    linked = true
    return `<style>\n${escapeTag(file.content, 'style')}\n</style>`
  })

  // Inline <script src="..."></script> pointing at project files, keeping attributes like type="module"
  html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, before, src, after) => {
    const file = resolveRef(files, htmlDir, src)
    if (!file) return tag
    linked = true
    return `<script${before}${after}>\n${escapeTag(file.content, 'script')}\n</script>`
  })

  // Nothing linked: fall back to injecting the CSS/JS that sits next to the HTML file
  if (!linked) {
    const siblings = files.filter(f => dirOf(f.path) === htmlDir)
    const css = siblings.filter(f => f.name.endsWith('.css')).map(f => escapeTag(f.content, 'style')).join('\n')
    const js = siblings.filter(f => f.name.endsWith('.js')).map(f => escapeTag(f.content, 'script')).join('\n')
    if (css) {
      const style = `<style>\n${css}\n</style>`
      html = html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : style + html
    }
    if (js) {
      const script = `<script>\n${js}\n</script>`
      html = html.includes('</body>') ? html.replace('</body>', `${script}</body>`) : html + script
    }
  }
  return html
}

function Preview({ tree, drafts = {}, activeTab }) {
  const [reloadKey, setReloadKey] = useState(0)

  const { srcDoc, path } = useMemo(() => {
    const files = collectFiles(tree, drafts)
    const htmlFiles = files.filter(f => /\.html?$/i.test(f.name))
    // Preview the HTML file being edited, otherwise the shallowest index.html, otherwise any HTML file
    const byDepth = (a, b) => a.path.split('/').length - b.path.split('/').length
    const htmlFile = htmlFiles.find(f => f._id === activeTab?._id)
      || htmlFiles.filter(f => f.name.toLowerCase() === 'index.html').sort(byDepth)[0]
      || htmlFiles.sort(byDepth)[0]
    if (!htmlFile) return { srcDoc: EMPTY_PAGE, path: null }
    return { srcDoc: buildDocument(files, htmlFile), path: htmlFile.path }
  }, [tree, drafts, activeTab?._id])

  return (
    <div className='flex h-full w-full min-w-0 flex-col bg-white'>
      {/* Right padding leaves room for the floating Editor/Preview toggle */}
      <div className='flex h-10 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#111113] pl-4 pr-44 sm:pr-64'>
        <div className='flex min-w-0 items-center gap-2'>
          <div className='h-2 w-2 shrink-0 rounded-full bg-emerald-400' />
          <span className='shrink-0 text-xs text-zinc-300'>Preview</span>
          {path && <span className='truncate text-xs text-zinc-500'>{path}</span>}
        </div>
        <button
          type='button'
          onClick={() => setReloadKey(k => k + 1)}
          title='Reload preview'
          className='ml-auto shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white'
        >
          <RotateCw size={13} />
        </button>
      </div>
      <div className='min-h-0 flex-1 bg-white'>
        <iframe
          key={reloadKey}
          title='Project Preview'
          srcDoc={srcDoc}
          sandbox='allow-scripts allow-forms allow-modals'
          className='h-full w-full border-0'
        />
      </div>
    </div>
  )
}

export default Preview
