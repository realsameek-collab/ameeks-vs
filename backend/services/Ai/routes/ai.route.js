import express from "express"
import { cancel, chat, resume } from "../controller/ai.controller.js"

const router = express.Router()

router.post("/chat", chat)
router.post("/chat/resume", resume)
router.post("/chat/cancel", cancel)

export default router
