import { api } from "../utils/axios"
import { getLanguage } from "../utils/language"
import * as browserFs from "../utils/browserFs"

// Files of folder projects live on the user's device instead of the files service.
// Their ids start with "fsa:", so every function below can tell the two kinds apart.
const localFs = (id) => browserFs.isBrowserId(id) ? browserFs : null

const localError = (error) => String(error?.message || error)

const withLanguage = (node) => node.type === "file" ? { ...node, language: getLanguage(node.name).id } : node

const addLanguages = (nodes) => nodes.map(node => node.type === "folder"
       ? { ...node, children: addLanguages(node.children || []) }
       : withLanguage(node))

export const createRootFolder = async ({ projectId, projectName }) => {
       try {
        const { data } = await api.post("/api/files/create-root-folder", {
          projectId,
          projectName,
        })
        return data
       } catch (error) {
        console.log(error)
              return { error: error.response?.data?.message || "Unable to create folder" }
       }
}

export const createFolder = async ({ projectId, name, parentId }) => {
       if (localFs(parentId)) {
              try {
                     return await localFs(parentId).create({ parentId, name, type: "folder" })
              } catch (error) {
                     return { error: localError(error) }
              }
       }
       try {
        const { data } = await api.post("/api/files/create-folder", {
          projectId,
          name,
          parentId,
        })
        return data
       } catch (error) {
        console.log(error)
        return { error: error.response?.data?.message || "Unable to create folder" }
       }
}

export const createFile = async ({ projectId, name, parentId, content, language }) => {
       if (localFs(parentId)) {
              try {
                     return withLanguage(await localFs(parentId).create({ parentId, name, type: "file", content: content ?? "" }))
              } catch (error) {
                     return { error: localError(error) }
              }
       }
       try {
        const { data } = await api.post("/api/files/create-file", {
          projectId,
          name,
          parentId,
          content,
          language,
        })
        return data
       } catch (error) {
        console.log(error)
              return { error: error.response?.data?.message || "Unable to create file" }
       }
}

export const updateFile = async (id, { name, content }) => {
       const fs = localFs(id)
       if (fs) {
              try {
                     // A rename changes the path and so the id; content is written to the new path
                     let target = id
                     const current = id.split(/[/:]/).pop()
                     if (name && name !== current) target = (await fs.rename(id, name))._id
                     if (content === undefined) return { _id: target, name }
                     return withLanguage(await fs.write(target, content))
              } catch (error) {
                     console.log(localError(error))
                     return null
              }
       }
       try {
        const { data } = await api.post(`/api/files/update/${id}`, { name, content })
        return data
       } catch (error) {
        console.log(error)
        return null
       }
}

export const deleteFile = async (id) => {
       if (localFs(id)) {
              try {
                     return await localFs(id).remove(id)
              } catch (error) {
                     console.log(localError(error))
                     return null
              }
       }
       try {
        const { data } = await api.delete(`/api/files/${id}`)
        return data
       } catch (error) {
        console.log(error)
        return null
       }
}

export const getFile = async (id) => {
       if (localFs(id)) {
              try {
                     return withLanguage(await localFs(id).read(id))
              } catch (error) {
                     console.log(localError(error))
                     return null
              }
       }
       try {
        const { data } = await api.get(`/api/files/${id}`)
        return data
       } catch (error) {
        console.log(error)
        return null
       }
}

export const getTree = async (projectId) => {
       if (browserFs.isConnected(projectId)) {
              try {
                     return addLanguages(await browserFs.tree(projectId))
              } catch (error) {
                     console.log(error)
                     return []
              }
       }
       try {
        const { data } = await api.get(`/api/files/tree/${projectId}`)
        return data
       } catch (error) {
        console.log(error)
        return null
       }
}
