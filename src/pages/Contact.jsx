import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Mail, Phone, MapPin } from "lucide-react"

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" })
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
  e.preventDefault()
  if (!form.name || !form.email || !form.message) { toast.error("Please fill all fields"); return }
 
  try {
    const res = await fetch("https://formspree.io/f/mwvwnnwp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (!res.ok) throw new Error()
    setSent(true)
    toast.success("Message sent! We'll get back to you within 24 hours 💕")
  } catch {
    toast.error("Failed to send. Please try again.")
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-gray-800">Contact Us</h1>
          <p className="text-gray-500 mt-2">We'd love to hear from you 💕</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 flex items-center gap-4"><Mail className="w-6 h-6 text-[#E8907C]" /><div><p className="font-medium text-gray-800">Email</p><p className="text-sm text-gray-500">yourseha@gmail.com</p></div></div>
            <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 flex items-center gap-4"><Phone className="w-6 h-6 text-[#E8907C]" /><div><p className="font-medium text-gray-800">Phone</p><p className="text-sm text-gray-500">+974 4000 0000</p></div></div>
            <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 flex items-center gap-4"><MapPin className="w-6 h-6 text-[#E8907C]" /><div><p className="font-medium text-gray-800">Location</p><p className="text-sm text-gray-500">Doha, Qatar</p></div></div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
            {sent ? (
              <div className="text-center py-8"><p className="text-4xl mb-3">💕</p><p className="font-semibold text-gray-800">Message Sent!</p><p className="text-gray-500 text-sm mt-1">We'll reply within 24 hours</p></div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Your name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="rounded-xl" />
                <Input type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="rounded-xl" />
                <Textarea placeholder="How can we help you?" value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} className="rounded-xl min-h-[120px]" />
                <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">Send Message</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
