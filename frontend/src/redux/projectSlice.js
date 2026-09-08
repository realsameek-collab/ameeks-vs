import { createSlice } from "@reduxjs/toolkit";
const projectSlice = createSlice({
    name:"project",
    initialState:{
        projects:[]
    },
    reducers:{
        setProjects:(state,action)=>{
           state.projects=action.payload
        },
        addNewProject:(state,action)=>{
            state.projects.unshift(action.payload)
        },
        
    }
})

export const {setProjects, addNewProject, setStarredProjects} = projectSlice.actions

export default projectSlice.reducer