import React, { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { parseMarkdown } from '../utils/markdown'
import { highlight, normalizeLanguage, TOKEN_CLASS } from '../utils/highlight'

function Inline({ nodes }) {
    return nodes.map((node, index) => {
        const key = index
        if (node.type === 'text') return <React.Fragment key={key}>{node.text}</React.Fragment>
        if (node.type === 'code') {
            return (
                <code
                    key={key}
                    className='rounded border border-white/[0.07] bg-white/[0.06] px-1 py-[1px] font-mono text-[11.5px] text-sky-300'
                >
                    {node.text}
                </code>
            )
        }
        if (node.type === 'bold') return <strong key={key} className='font-semibold text-white'><Inline nodes={node.children} /></strong>
        if (node.type === 'italic') return <em key={key} className='italic'><Inline nodes={node.children} /></em>
        if (node.type === 'strike') return <s key={key} className='text-zinc-500'><Inline nodes={node.children} /></s>
        if (node.type === 'link') {
            return (
                <a
                    key={key}
                    href={node.href}
                    target='_blank'
                    rel='noreferrer noopener'
                    className='text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-400'
                >
                    <Inline nodes={node.children} />
                </a>
            )
        }
        return null
    })
}

function CodeBlock({ lang, code }) {
    const [copied, setCopied] = useState(false)
    const tokens = useMemo(() => highlight(code, lang), [code, lang])
    const label = normalizeLanguage(lang) || 'code'

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
        } catch {
            setCopied(false)
        }
    }

    return (
        <div className='my-2 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0d0d0f]'>
            <div className='flex h-7 items-center justify-between border-b border-white/[0.05] bg-white/[0.02] px-2'>
                <span className='text-[10px] font-semibold uppercase tracking-wider text-zinc-500'>{label}</span>
                <button
                    type='button'
                    onClick={copy}
                    title='Copy code'
                    className='flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200'
                >
                    {copied ? <Check size={11} className='text-emerald-400' /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre
                className='overflow-x-auto px-2.5 py-2 font-mono text-[11.5px] leading-[1.6] [&::-webkit-scrollbar]:h-1.5
                [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/[0.08]
                hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.15]'
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
                <code>
                    {tokens.map((token, index) => (
                        <span key={index} className={TOKEN_CLASS[token.type] || TOKEN_CLASS.plain}>
                            {token.text}
                        </span>
                    ))}
                </code>
            </pre>
        </div>
    )
}

const HEADING_CLASS = {
    1: 'mt-3 mb-1.5 text-[15px] font-semibold text-white',
    2: 'mt-3 mb-1.5 text-[14px] font-semibold text-white',
    3: 'mt-2.5 mb-1 text-[13px] font-semibold text-zinc-100',
    4: 'mt-2 mb-1 text-[12.5px] font-semibold text-zinc-200',
    5: 'mt-2 mb-1 text-[12px] font-semibold text-zinc-300',
    6: 'mt-2 mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-zinc-400',
}

function Blocks({ blocks }) {
    return blocks.map((block, index) => {
        const key = index

        if (block.type === 'code') return <CodeBlock key={key} lang={block.lang} code={block.code} />

        if (block.type === 'heading') {
            const Tag = `h${block.level}`
            return <Tag key={key} className={HEADING_CLASS[block.level]}><Inline nodes={block.inline} /></Tag>
        }

        if (block.type === 'rule') return <hr key={key} className='my-3 border-white/[0.07]' />

        if (block.type === 'quote') {
            return (
                <blockquote key={key} className='my-2 border-l-2 border-sky-400/40 pl-2.5 text-zinc-400'>
                    <Blocks blocks={block.blocks} />
                </blockquote>
            )
        }

        if (block.type === 'list') {
            const Tag = block.ordered ? 'ol' : 'ul'
            return (
                <Tag
                    key={key}
                    start={block.ordered ? block.start : undefined}
                    className={`my-1.5 space-y-1 pl-4 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-zinc-600`}
                >
                    {block.items.map((item, itemIndex) => (
                        <li key={itemIndex} style={{ marginLeft: item.depth * 12 }} className='pl-0.5'>
                            <Inline nodes={item.inline} />
                        </li>
                    ))}
                </Tag>
            )
        }

        if (block.type === 'table') {
            return (
                <div key={key} className='my-2 overflow-x-auto rounded-lg border border-white/[0.07]'>
                    <table className='w-full border-collapse text-left text-[11.5px]'>
                        <thead className='bg-white/[0.03]'>
                            <tr>
                                {block.head.map((cell, cellIndex) => (
                                    <th key={cellIndex} className='whitespace-nowrap border-b border-white/[0.07] px-2 py-1.5 font-semibold text-zinc-300'>
                                        <Inline nodes={cell} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className='border-b border-white/[0.04] last:border-0'>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} className='px-2 py-1.5 align-top text-zinc-400'>
                                            <Inline nodes={cell} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        }

        return <p key={key} className='my-1.5 first:mt-0 last:mb-0'><Inline nodes={block.inline} /></p>
    })
}

function Markdown({ content }) {
    const blocks = useMemo(() => parseMarkdown(content), [content])

    return (
        <div className='text-[13px] leading-relaxed text-zinc-300 [overflow-wrap:anywhere]'>
            <Blocks blocks={blocks} />
        </div>
    )
}

export default Markdown
