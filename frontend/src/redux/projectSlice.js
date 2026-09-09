import { createSlice } from "@reduxjs/toolkit";
const projectSlice = createSlice({
    name:"project",
    initialState:{
        projects:[],
        starredProjects:[]
    },
    reducers:{
        setProjects:(state,action)=>{
           state.projects=action.payload
        },
        addNewProject:(state,action)=>{
            state.projects.unshift(action.payload)
        },
        setStarredProjects:(state,action)=>{
            state.starredProjects=action.payload
        },
        setProjectStar:(state,action)=>{
            const {id, starred} = action.payload

            const project = state.projects.find(p=>p._id===id)
            if(project) project.starred = starred

            const starredProject = state.starredProjects.find(p=>p._id===id)
            if(starredProject) starredProject.starred = starred

            if(starred){
                if(!state.starredProjects.some(p=>p._id===id)){
                    const source = project || starredProject
                    if(source) state.starredProjects.unshift(source)
                }
            }else{
                state.starredProjects = state.starredProjects.filter(p=>p._id!==id)
            }
        },

    }
})

export const {setProjects, addNewProject, setStarredProjects, setProjectStar} = projectSlice.actions

export default projectSlice.reducer