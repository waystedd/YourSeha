import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"

const WELCOME = "Hello! I'm here to support you. 💕 Whether you have questions about ASD, need resources, or just want to talk, I'm here for you. How can I help?"

async function askClaude(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You are a compassionate AI assistant for YourSeha, a wellness platform for mothers and caregivers of children with ASD in Qatar. You provide emotional support, answer questions about the app features (Community, Journaling, Reminders, Psychologists, Resources, Emergency contacts), and give evidence-based wellness advice. Be warm, supportive, and brief. Never diagnose medical conditions. For emergencies always refer to 999 or 16000 (Qatar mental health hotline). Respond in the same language the user writes in (Arabic or English).",
      messages,
    }),
  })
  if (!res.ok) throw new Error("AI unavailable")
  const data = await res.json()
  return data.content?.map((b) => b.text || "").join("") || "I'm here for you! Please try again."
}

export default function AIHealthBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: "assistant", content: WELCOME }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg = { role: "user", content: text }
    setMessages((m) => [...m, userMsg])
    setInput("")
    setLoading(true)
    try {
      const history = [...messages, userMsg].slice(-10)
      const reply = await askClaude(history)
      setMessages((m) => [...m, { role: "assistant", content: reply }])
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I'm having trouble connecting right now. For urgent support please call 16000. 💕" }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 sm:w-96 rounded-3xl border border-[#FFE5D9] bg-white shadow-2xl overflow-hidden flex flex-col" style={{ height: 480 }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-lg">💕</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">YourSeha Assistant</p>
              <p className="text-white/80 text-xs">Here to support you</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-[#FFF8F6] to-white">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white"
                    : "bg-white border border-[#FFE5D9]/80 text-gray-700 shadow-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#FFE5D9] rounded-2xl px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E8907C]" />
                  <span className="text-xs text-gray-400">Typing...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-[#FFE5D9]/50 flex gap-2 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask me anything..."
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-[#FFE5D9] outline-none focus:border-[#F4A896] bg-[#FFFDFB]"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-[#F4A896] to-[#E8907C] flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>
    </div>
  )
}
