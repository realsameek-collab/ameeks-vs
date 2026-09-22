import { api } from "../utils/axios"

const errorMessage = (error) => error.response?.data?.message || "AmeekAi could not be reached. Check the AI service and try again."

// One chat turn. The AI service pauses at every tool call; the calls are run here in the
// browser (runTool) and their results sent back, until the model answers with text.
// onToolCall(call) and onToolResult(call, result) report progress for the chat panel.
export const runAmeekAi = async ({ projectId, message, history, attachments, context, runTool, onToolCall, onToolResult, signal }) => {
       let threadId = null
       try {
        let { data } = await api.post("/api/ai/chat", { projectId, message, history, attachments, context }, { signal })
        threadId = data.threadId

        while (data.status === "tool_calls") {
               const results = []
               // In order: a batch can create a folder and then files inside it
               for (const call of data.toolCalls) {
                      if (signal?.aborted) throw new DOMException("Stopped", "AbortError")
                      onToolCall?.(call)
                      const result = await runTool(call)
                      onToolResult?.(call, result)
                      results.push({ id: result.id, output: result.output })
               }
               ;({ data } = await api.post("/api/ai/chat/resume", { threadId, results }, { signal }))
        }
        return { reply: data.reply ?? "" }
       } catch (error) {
        if (signal?.aborted || error?.name === "AbortError" || error?.name === "CanceledError") {
               // Frees the paused run on the server; it would expire on its own anyway
               if (threadId) api.post("/api/ai/chat/cancel", { threadId }).catch(() => {})
               return { stopped: true }
        }
        console.log(error)
        return { error: errorMessage(error) }
       }
}
