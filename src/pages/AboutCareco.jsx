import { Heart, Users, Shield } from "lucide-react"
export default function AboutCareco() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F4A896] to-[#E8907C] flex items-center justify-center mx-auto mb-4 shadow-md"><span className="text-white font-bold text-2xl">Y</span></div>
          <h1 className="text-3xl font-semibold text-gray-800">About YourSeha</h1>
          <p className="text-gray-500 mt-2">A wellness platform built for caregivers of children with ASD in Qatar</p>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
            <div className="flex items-center gap-3 mb-3"><Heart className="w-6 h-6 text-[#E8907C]" /><h2 className="text-xl font-semibold text-gray-800">Our Mission</h2></div>
            <p className="text-gray-600 leading-relaxed">YourSeha exists to support the mental and emotional wellbeing of mothers and caregivers raising children with Autism Spectrum Disorder. We connect families with qualified psychologists, provide evidence-based resources, and create a safe community where caregivers can share, heal, and grow together.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
            <div className="flex items-center gap-3 mb-3"><Users className="w-6 h-6 text-[#E8907C]" /><h2 className="text-xl font-semibold text-gray-800">Who We Serve</h2></div>
            <p className="text-gray-600 leading-relaxed">We serve caregivers, especially mothers, navigating the daily challenges of raising a child with ASD in Qatar. We also partner with licensed psychologists who want to extend their reach and provide accessible mental health services to families who need it most.</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
            <div className="flex items-center gap-3 mb-3"><Shield className="w-6 h-6 text-[#E8907C]" /><h2 className="text-xl font-semibold text-gray-800">Our Values</h2></div>
            <ul className="text-gray-600 space-y-2">
              <li>💕 Compassion — We lead with empathy in everything we build</li>
              <li>🔒 Privacy — Your data and conversations are always protected</li>
              <li>🌍 Inclusivity — Available in Arabic and English, for all backgrounds</li>
              <li>🧪 Evidence-based — All resources are grounded in research</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
