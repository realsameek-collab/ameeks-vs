
import Project from "../models/project.model.js"
import redis from "../../../shared/redis/redis.js"

export const createProject = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { name, description } = req.body

        const project = await Project.create({
            owner: userId,
            name,
            description
        })

        const key = `projects:${userId}`
        await redis.del(key)

        return res.status(201).json(project)

    } catch (error) {
        console.error("Create project error:", error)
        return res.status(500).json({
            message: "Create project error"
        })
    }
}

export const getProjects = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const key = `projects:${userId}`
        const result = await redis.get(key)

        if (result) {
            return res.status(200).json(JSON.parse(result))
        }

        const projects = await Project.find({
            owner: userId
        }).sort({ updatedAt: -1 })

        await redis.set(key, JSON.stringify(projects))

        return res.status(200).json(projects)

    } catch (error) {
        console.error("Get projects error:", error)
        return res.status(500).json({
            message: "Get projects error"
        })
    }
}

export const getProjectById = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { id } = req.params

        const project = await Project.findOne({
            _id: id,
            owner: userId
        })

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            })
        }

        project.lastOpenedAt = new Date()
        await project.save()

        return res.status(200).json(project)

    } catch (error) {
        console.error("Get project by id error:", error)
        return res.status(500).json({
            message: "Get project by id error"
        })
    }
}

export const getStarredProjects = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const key = `starred-projects:${userId}`
        const result = await redis.get(key)

        if (result) {
            return res.status(200).json(JSON.parse(result))
        }

        const projects = await Project.find({
            owner: userId,
            starred: true
        }).sort({ updatedAt: -1 })

        await redis.set(key, JSON.stringify(projects))

        return res.status(200).json(projects)

    } catch (error) {
        console.error("Get starred projects error:", error)
        return res.status(500).json({
            message: "Starred projects error"
        })
    }
}

export const toggleStar = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { id } = req.params

        const project = await Project.findOne({
            _id: id,
            owner: userId
        })

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            })
        }

        project.starred = !project.starred

        await project.save()

        await redis.del(`starred-projects:${userId}`)
        await redis.del(`projects:${userId}`)

        return res.status(200).json(project)

    } catch (error) {
        console.error("Toggle star error:", error)
        return res.status(500).json({
            message: "Toggle starred project error"
        })
    }
}

export const deleteProject = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const { id } = req.params

        const project = await Project.findOneAndDelete({
            _id: id,
            owner: userId
        })

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            })
        }

        await redis.del(`projects:${userId}`)
        await redis.del(`starred-projects:${userId}`)

        return res.status(200).json(project)

    } catch (error) {
        console.error("Delete project error:", error)
        return res.status(500).json({
            message: "Delete project error"
        })
    }
}

