import { api } from "../utils/axios"

// Chat turns are sent whole so the service can keep context without its own store
export const askAmeekAi = async ({ projectId, messages, attachments }) => {
       try {
        const { data } = await api.post("/api/ai/chat", {
          projectId,
          messages,
          attachments,
        })
        return { reply: data?.reply ?? data?.message ?? data?.content ?? "" }
       } catch (error) {
        console.log(error)
        return { error: error.response?.data?.message || "AmeekAi could not be reached. Check the AI service and try again." }
       }
}
