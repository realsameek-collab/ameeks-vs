import express from "express"
import {
    createProject,
    getProjects,
    getStarredProjects,
    getProjectById,
    toggleStar,
    deleteProject,
    linkFolder
} from "../controllers/project.controller.js"
const router = express.Router()



router.post("/",createProject)
router.get("/", getProjects)
router.get("/starred", getStarredProjects)
router.get("/:id", getProjectById)
router.patch("/:id/star", toggleStar)
router.patch("/:id/folder", linkFolder)
router.delete("/:id", deleteProject)

export default router