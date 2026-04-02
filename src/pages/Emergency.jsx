import React from "react"
import { Phone, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Emergency() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-semibold text-gray-800 mb-2">Emergency Support</h1>
          <p className="text-gray-600">You are not alone. Support is available in Qatar 24/7.</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border-2 border-red-200 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center"><Phone className="w-6 h-6 text-white" /></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">If you're in immediate danger</p>
              <p className="text-gray-600 text-sm">Call Qatar's national emergency services immediately</p>
            </div>
            <a href="tel:999"><Button className="rounded-xl bg-red-500 hover:bg-red-600">Call 999</Button></a>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#FFE5D9]/50 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFF8F6] flex items-center justify-center"><Heart className="w-6 h-6 text-[#E8907C]" /></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">National Mental Health Support - 24/7</p>
              <p className="text-gray-600 text-sm">Confidential mental health support and guidance</p>
              <p className="text-xs text-gray-400">Hamad Medical Corporation</p>
            </div>
            <a href="tel:16000"><Button className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">16000</Button></a>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#FFE5D9]/50 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFF8F6] flex items-center justify-center"><Phone className="w-6 h-6 text-[#E8907C]" /></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">General Medical Assistance</p>
              <p className="text-gray-600 text-sm">Healthcare assistance and guidance</p>
              <p className="text-xs text-gray-400">Hamad Medical Corporation</p>
            </div>
            <a href="tel:16060"><Button className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">16060</Button></a>
          </div>
        </div>
      </div>
    </div>
  )
}

