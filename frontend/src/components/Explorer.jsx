
import React, { useState } from 'react'

import { motion } from 'motion/react'

import { Cloud, FilePlus2, FolderOpen, FolderPlus, FolderTree, RefreshCcw } from 'lucide-react'

import Folder from './Folder'

const PROMPTS = {
  permission: { text: "Click anywhere to open this folder again. In the browser's prompt, choose \"Allow on every visit\" so it stops asking.", action: 'Reconnect folder' },
  missing: { text: "This browser hasn't opened the project's folder yet, for example on a new device.", action: 'Choose folder' },
  unsupported: { text: 'This project uses a folder on your device. Open it in Chrome or Edge.', action: null },
  empty: { text: 'This project has no files yet. Open a folder from your device, or keep the files in the cloud.', action: 'Choose folder' },
}

// Shown instead of the tree when a folder project can't be opened yet
function FolderPrompt({ status, folderName, onConnect }) {
  const prompt = PROMPTS[status] || PROMPTS.missing
  return (
    <div className='flex flex-col items-center gap-3 px-4 py-10 text-center'>
      <FolderOpen size={22} className='text-sky-400' />
      {folderName && <span className='text-[13px] font-medium text-zinc-200'>{folderName}</span>}
      <span className='text-[12px] leading-relaxed text-zinc-500'>{prompt.text}</span>
      {prompt.action && (
        <button
          onClick={() => onConnect()}
          className='rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-900 transition-opacity hover:opacity-90'
        >
          {prompt.action}
        </button>
      )}
      {status === 'permission' && (
        <button onClick={() => onConnect({ chooseAnother: true })} className='text-[11.5px] text-zinc-500 hover:text-zinc-300'>
          Choose a different folder
        </button>
      )}
      {status === 'empty' && (
        <button onClick={() => onConnect({ cloud: true })} className='flex items-center gap-1.5 text-[11.5px] text-zinc-500 hover:text-zinc-300'>
          <Cloud size={12} />
          Start in the cloud
        </button>
      )}
    </div>
  )
}

function HeaderButton({ icon: Icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
    >
      <Icon size={15} />
    </button>
  )
}

function Explorer({ projectId, tree, reloadTree , openFile, folderPrompt }) {
  // Asks the root folder to show its New File / New Folder input; a new object each click
  const [createRequest, setCreateRequest] = useState(null)
  const hasRoot = !folderPrompt && tree.length > 0

  return (

    <motion.div
      initial={{ opacity: 0, x: -16, width: 0 }}
      animate={{ opacity: 1, x: 0, width: 288 }}
      exit={{ opacity: 0, x: -16, width: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col overflow-hidden border-r border-white/[0.06] bg-[#111113]/90 backdrop-blur-xl"
    >

      <div className='flex h-10 w-72 shrink-0 items-center justify-between border-b border-white/[0.06] px-3'>

        <span className='text-[11px] font-semibold tracking-wider text-zinc-500'>
          EXPLORER
        </span>

        <div className='flex items-center gap-0.5'>
        {hasRoot && <HeaderButton icon={FilePlus2} title="New File" onClick={() => setCreateRequest({ kind: 'file' })} />}
        {hasRoot && <HeaderButton icon={FolderPlus} title="New Folder" onClick={() => setCreateRequest({ kind: 'folder' })} />}
        <motion.button
          whileHover={{ rotate: 60 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={reloadTree}
          className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white"
          title="Refresh"
        >

          <RefreshCcw size={15} />

        </motion.button>
        </div>

      </div>

      <div
        className='w-72 flex-1 overflow-y-auto px-1 py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/[0.08]
        hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.15] [&::-webkit-scrollbar-thumb]:transition-colors'
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
      >

        {folderPrompt ? (

          <FolderPrompt {...folderPrompt} />

        ) : tree.length === 0 ? (

          <div className='flex flex-col items-center gap-2 px-3 py-10 text-center'>

            <FolderTree size={22} className='text-zinc-700'/>

            <span className='text-[12px] text-zinc-600'>Empty Workspace</span>

          </div>

        ) : (

          tree.map((node, index) => (

            <Folder
              key={node._id ?? node.name}
              node={node}
              defaultOpen={tree.length === 1}
              createRequest={index === 0 ? createRequest : null}
              projectId={projectId}
              tree={tree}
              reloadTree={reloadTree}
              openFile={openFile}
            />

          ))

        )}

      </div>

    </motion.div>

  )

}

export default Explorer

