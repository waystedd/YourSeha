import { Heart, Users, Shield } from 'lucide-react'

export default function AboutCareco() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F4A896] to-[#E8907C] flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-white font-bold text-2xl">Y</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-800">About YourSeha</h1>
          <p className="text-gray-500 mt-2">Placeholder brand copy — replace with your final company story and positioning.</p>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
            <div className="flex items-center gap-3 mb-3"><Heart className="w-6 h-6 text-[#E8907C]" /><h2 className="text-xl font-semibold text-gray-800">Mission</h2></div>
            <p className="text-gray-600 leading-relaxed">Use this placeholder section to describe why YourSeha exists, who it supports, and how the platform helps caregivers and psychologists work together.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
            <div className="flex items-center gap-3 mb-3"><Users className="w-6 h-6 text-[#E8907C]" /><h2 className="text-xl font-semibold text-gray-800">Who We Serve</h2></div>
            <p className="text-gray-600 leading-relaxed">Use this placeholder section to define your primary audience, the problems they face, and what makes the platform useful in Qatar.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
            <div className="flex items-center gap-3 mb-3"><Shield className="w-6 h-6 text-[#E8907C]" /><h2 className="text-xl font-semibold text-gray-800">Values</h2></div>
            <ul className="text-gray-600 space-y-2">
              <li>💕 Compassion — replace with your final brand value language</li>
              <li>🔒 Privacy — replace with your approved trust and privacy statement</li>
              <li>🌍 Accessibility — replace with your final bilingual and inclusive messaging</li>
              <li>🧠 Evidence-based support — replace with your final professional positioning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
