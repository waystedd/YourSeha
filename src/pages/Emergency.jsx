import React from 'react'
import { AlertTriangle, Heart, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { qatarEmergencyContacts, qatarEmergencyDisclaimer } from '@/lib/qatarSupport'

export default function Emergency() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-gray-800 mb-2">Emergency Support</h1>
          <p className="text-gray-600">Important Qatar mental health and emergency contacts in one place.</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex gap-4 items-start">
          <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-red-900">If there is immediate danger or a medical emergency</p>
            <p className="text-red-800 text-sm mt-1">{qatarEmergencyDisclaimer}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {qatarEmergencyContacts.map((contact, index) => {
            const Icon = index === 1 ? Heart : Phone
            const primaryStyles = index === 0
              ? 'from-red-500 to-red-600'
              : 'from-[#F4A896] to-[#E8907C]'

            return (
              <div key={contact.id} className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${primaryStyles} flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{contact.title}</p>
                    <p className="text-gray-600 text-sm mt-1">{contact.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{contact.note}</p>
                  </div>
                  <a href={contact.href}>
                    <Button className={`rounded-2xl bg-gradient-to-r ${primaryStyles}`}>
                      {contact.number}
                    </Button>
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">What to do right now</h2>
          <ul className="space-y-2 text-sm text-gray-600 list-disc pl-5">
            <li>If someone may harm themselves or others, call 999 immediately.</li>
            <li>For urgent emotional support or mental health guidance, call 16000 and choose the mental health option.</li>
            <li>If you need general healthcare guidance or help navigating HMC services, call 16060.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
