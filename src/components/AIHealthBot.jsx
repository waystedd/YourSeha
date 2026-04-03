import { useMemo, useRef, useState, useEffect } from "react"
import { MessageCircle, X, Send } from "lucide-react"

const WELCOME = "Hello! I'm here to support you. 💕 Whether you have questions about ASD, need resources, or just want to talk, I'm here for you. How can I help?"
const WELCOME_AR = "مرحباً! أنا هنا لدعمك 💕 إذا كان لديك سؤال عن التطبيق أو الموارد أو المجتمع، فأنا هنا لمساعدتك. كيف أساعدك اليوم؟"

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text || "")
}

function respond(text) {
  const q = (text || "").toLowerCase()
  const arabic = isArabic(text)

  const say = (en, ar) => (arabic ? ar : en)

  if (/community|support circle|المجتمع|الدعم/.test(q)) {
    return say(
      "You can find the Community section from the top navigation. There you can create posts, join support groups, and connect with other caregivers or psychologists.",
      "يمكنك الوصول إلى قسم المجتمع من شريط التنقل العلوي. هناك يمكنك إنشاء منشورات والانضمام إلى المجموعات والتواصل مع مقدمي الرعاية أو الأخصائيين."
    )
  }

  if (/resource|guide|article|المصادر|الموارد/.test(q)) {
    return say(
      "Open Resources from the navigation bar to browse articles, exercises, and guides. You can filter content for caregivers or children.",
      "افتحي قسم المصادر من شريط التنقل لتصفح المقالات والتمارين والأدلة. يمكنكِ تصفية المحتوى لمقدمي الرعاية أو للأطفال."
    )
  }

  if (/psychologist|appointment|book|session|أخصائي|موعد|جلسة|حجز/.test(q)) {
    return say(
      "Go to Psychologists to view profiles and book a session. Your booked sessions will appear in Appointments.",
      "اذهبي إلى قسم الأخصائيين لعرض الملفات الشخصية وحجز جلسة. ستظهر الجلسات المحجوزة في قسم المواعيد."
    )
  }

  if (/journal|mood|check.?in|day|يوميات|مزاج|تسجيل/.test(q)) {
    return say(
      "Use Journaling to log your mood and write reflections. The Daily Check-In near the top of the app is the fastest way to log today’s feeling.",
      "استخدمي قسم اليوميات لتسجيل مزاجك وكتابة ملاحظاتك. كما أن تسجيل الحالة اليومي أعلى التطبيق هو أسرع طريقة لتسجيل شعورك اليوم."
    )
  }

  if (/reminder|notification|تذكير|إشعار/.test(q)) {
    return say(
      "Reminders helps you track tasks and appointments, while the bell icon shows notifications and updates.",
      "يساعدك قسم التذكيرات على متابعة المهام والمواعيد، بينما تعرض أيقونة الجرس الإشعارات والتحديثات."
    )
  }

  if (/emergency|hotline|urgent|طوارئ|نجدة|مساعدة/.test(q)) {
    return say(
      "If you need urgent help, please use the Emergency page and contact local services immediately. In Qatar, emergency services are 999 and the mental health helpline is 16000.",
      "إذا كنتِ بحاجة إلى مساعدة عاجلة، استخدمي صفحة الطوارئ واتصلي بالخدمات المحلية فوراً. في قطر رقم الطوارئ هو 999 وخط المساعدة للصحة النفسية هو 16000."
    )
  }

  if (/what is this app|about|ما هذا التطبيق|عن التطبيق/.test(q)) {
    return say(
      "YourSeha is a wellness and support platform for caregivers and psychologists. It brings together community support, appointments, resources, journaling, reminders, and emergency guidance in one place.",
      "يور صحة منصة دعم ورفاهية لمقدمي الرعاية والأخصائيين. تجمع المجتمع والمواعيد والمصادر واليوميات والتذكيرات وإرشادات الطوارئ في مكان واحد."
    )
  }

  return say(
    "I can help you find Community, Psychologists, Resources, Journaling, Reminders, Appointments, or Emergency support inside the app. Tell me what you want to do.",
    "يمكنني مساعدتك في الوصول إلى المجتمع أو الأخصائيين أو المصادر أو اليوميات أو التذكيرات أو المواعيد أو الطوارئ داخل التطبيق. أخبريني بما تريدين فعله."
  )
}

export default function AIHealthBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }])
  const [input, setInput] = useState("")
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  const title = useMemo(() => (messages.some((m) => isArabic(m.content)) ? "مساعد YourSeha" : "YourSeha Assistant"), [messages])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const userMsg = { role: "user", content: text }
    const reply = { role: "assistant", content: respond(text) }
    setMessages((m) => {
      const next = m.length === 1 && m[0].content === WELCOME && isArabic(text)
        ? [{ role: "assistant", content: WELCOME_AR }, userMsg, reply]
        : [...m, userMsg, reply]
      return next.slice(-14)
    })
    setInput("")
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 sm:w-96 rounded-3xl border border-[#FFE5D9] bg-white shadow-2xl overflow-hidden flex flex-col" style={{ height: 480 }}>
          <div className="px-4 py-3 flex items-center gap-3 bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-lg">💕</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-white/80 text-xs">Help with app navigation and support</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-[#FFF8F6] to-white">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white"
                      : "bg-white border border-[#FFE5D9]/80 text-gray-700 shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-2 border-t border-[#FFE5D9]/50 flex gap-2 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Ask me anything..."
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-[#FFE5D9] outline-none focus:border-[#F4A896] bg-[#FFFDFB]"
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-[#F4A896] to-[#E8907C] flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>
    </div>
  )
}
