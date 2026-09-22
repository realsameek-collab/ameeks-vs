import React from 'react'
import MonacoEditor, { DiffEditor } from '@monaco-editor/react'

const THEME = 'ameek-dark'

const options = {
    fontSize: 13.5,
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
    fontLigatures: true,
    lineHeight: 22,
    padding: { top: 14, bottom: 14 },
    tabSize: 2,
    minimap: { enabled: true, renderCharacters: false, showSlider: 'mouseover', maxColumn: 80 },
    stickyScroll: { enabled: true },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: 'active', indentation: true },
    renderLineHighlight: 'all',
    scrollBeyondLastLine: false,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    fixedOverflowWidgets: true,
    automaticLayout: true,
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
}

// Runs once before the first editor is created
let configured = false
const configure = (monaco) => {
    if (configured) return
    configured = true

    monaco.editor.defineTheme(THEME, {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        ],
        colors: {
            'editor.background': '#0a0a0c',
            'editor.foreground': '#e4e4e7',
            'editorGutter.background': '#0a0a0c',
            'minimap.background': '#0a0a0c',
            'editorLineNumber.foreground': '#3f3f46',
            'editorLineNumber.activeForeground': '#a1a1aa',
            'editor.lineHighlightBackground': '#ffffff07',
            'editor.lineHighlightBorder': '#00000000',
            'editorCursor.foreground': '#38bdf8',
            'editor.selectionBackground': '#0ea5e940',
            'editor.inactiveSelectionBackground': '#0ea5e920',
            'editor.selectionHighlightBackground': '#0ea5e91a',
            'editor.wordHighlightBackground': '#ffffff0f',
            'editorBracketMatch.background': '#0ea5e91a',
            'editorBracketMatch.border': '#0ea5e966',
            'editorIndentGuide.background1': '#ffffff0a',
            'editorIndentGuide.activeBackground1': '#ffffff26',
            'editorWidget.background': '#161618',
            'editorWidget.border': '#ffffff1a',
            'editorSuggestWidget.background': '#161618',
            'editorSuggestWidget.border': '#ffffff1a',
            'editorSuggestWidget.selectedBackground': '#0ea5e926',
            'editorHoverWidget.background': '#161618',
            'editorHoverWidget.border': '#ffffff1a',
            'editorStickyScroll.background': '#0d0d10',
            'editorStickyScrollHover.background': '#16161a',
            'scrollbarSlider.background': '#ffffff12',
            'scrollbarSlider.hoverBackground': '#ffffff22',
            'scrollbarSlider.activeBackground': '#ffffff30',
            'focusBorder': '#00000000',
            // AmeekAi's changes: added lines green, removed lines red
            'diffEditor.insertedLineBackground': '#22c55e1a',
            'diffEditor.insertedTextBackground': '#22c55e38',
            'diffEditor.removedLineBackground': '#ef44441a',
            'diffEditor.removedTextBackground': '#ef444438',
            'diffEditorGutter.insertedLineBackground': '#22c55e30',
            'diffEditorGutter.removedLineBackground': '#ef444430',
        },
    })

    // No type info for imported packages exists here, so only report syntax errors
    for (const defaults of [monaco.languages.typescript.javascriptDefaults, monaco.languages.typescript.typescriptDefaults]) {
        defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false })
        defaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            jsx: monaco.languages.typescript.JsxEmit.Preserve,
            allowJs: true,
            allowNonTsExtensions: true,
        })
    }
}

const Loading = () => (
    <div className='flex h-full w-full flex-col gap-2.5 px-6 pt-5'>
        {[62, 40, 78, 30, 55, 68, 24].map((width, i) => (
            <div key={i} className='flex items-center gap-5'>
                <div className='h-2.5 w-4 rounded bg-white/[0.04]' />
                <div style={{ width: `${width}%` }} className='h-2.5 animate-pulse rounded bg-white/[0.05]' />
            </div>
        ))}
    </div>
)

function CodeEditor({ path, language, defaultValue, onChange, onCursorChange }) {
    const onMount = (editor, monaco) => {
        editor.focus()

        const report = () => {
            const position = editor.getPosition()
            const selection = editor.getSelection()
            const selected = selection && !selection.isEmpty() ? editor.getModel()?.getValueInRange(selection).length : 0
            onCursorChange?.({ line: position?.lineNumber ?? 1, column: position?.column ?? 1, selected })
        }
        editor.onDidChangeCursorSelection(report)
        editor.onDidChangeModel(report)
        report()

        // Re-measure once web fonts finish loading so the cursor lines up with the text
        document.fonts?.ready.then(() => monaco.editor.remeasureFonts())
    }

    return (
        <MonacoEditor
            path={path}
            language={language}
            defaultValue={defaultValue}
            onChange={(value) => onChange?.(value ?? '')}
            beforeMount={configure}
            onMount={onMount}
            theme={THEME}
            options={options}
            loading={<Loading />}
        />
    )
}

export default CodeEditor

const diffOptions = {
    ...options,
    readOnly: true,
    originalEditable: false,
    // One column, removed lines shown above the lines that replaced them
    renderSideBySide: false,
    renderIndicators: true,
    renderOverviewRuler: true,
    ignoreTrimWhitespace: false,
    minimap: { enabled: false },
    stickyScroll: { enabled: false },
}

// Read-only inline diff of one file, e.g. before and after AmeekAi changed it
export function DiffView({ path, language, original, modified }) {
    return (
        <DiffEditor
            original={original}
            modified={modified}
            language={language}
            // Separate from the tab's own model so the diff never touches its undo history
            originalModelPath={`ameek-diff://original/${path}`}
            modifiedModelPath={`ameek-diff://modified/${path}`}
            beforeMount={configure}
            theme={THEME}
            options={diffOptions}
            loading={<Loading />}
        />
    )
}
