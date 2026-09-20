import dotenv from "dotenv"
import axios from "axios"
dotenv.config()

const file_url = process.env.FILE_SERVICE_URL
export const createFolder = async ({projectId,parentId,name,userId}) => {
    try {
        const {data} = await axios.post(`${file_url}/create-folder`,
            {projectId,parentId,name,userId} , 
            {headers:{
                "x-user-id":String(userId)
            }}

        )
        return data
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}

export const createFile = async ( {projectId,
            name,
            parentId,
            content = "",
            language = "plaintext",userId}) => {
    try {
        const {data} = await axios.post(`${file_url}/create-file`,
            { projectId,
            name,
            parentId,
            content,
            language,} , 
            {headers:{
                "x-user-id":String(userId)
            }}

        )
        return data
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}


export const updateFile = async ( {name,content = "",userId , id}) => {
    try {
        const {data} = await axios.post(`${file_url}/update-file/${id}`,
            {name,content} , 
            {headers:{
                "x-user-id":String(userId)
            }}

        )
        return data
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}


export const deleteFile = async ( {userId , id}) => {
    try {
        const {data} = await axios.delete(`${file_url}/${id}`,
            {headers:{
                "x-user-id":String(userId)
            }}

        )
        return data
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}


export const getTree = async ( {userId , projectId}) => {
    try {
        const {data} = await axios.get(`${file_url}/tree/${projectId}`,
            {headers:{
                "x-user-id":String(userId)
            }}

        )
        return data
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}


export const getFile = async ( {userId , id}) => {
    try {
        const {data} = await axios.get(`${file_url}${id}`,
            {headers:{
                "x-user-id":String(userId)
            }}

        )
        return data
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}