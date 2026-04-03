import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Calendar, Bell, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';

export default function HeroSection({ user, nextAppointment, nextReminder }) {
  const { t, isRTL, language } = useLanguage();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('hero_greeting_morning');
    if (hour < 18) return t('hero_greeting_afternoon');
    return t('hero_greeting_evening');
  };

  const firstName = user?.full_name?.split(' ')[0] || (language === 'ar' ? 'مرحباً' : 'there');
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <section className="relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-br from-white via-[#FFF8F6] to-[#FFE5D9] py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-1">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-base font-light text-gray-400 tracking-wide">{t('hero_tagline')}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-md border border-gray-200/50 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to={createPageUrl('Appointments')}
                className="group p-4 rounded-2xl bg-[#EEF2FF] border border-indigo-200/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-300 to-indigo-400 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('hero_next_appointment')}</p>
                    {nextAppointment ? (
                      <>
                        <p className="font-medium text-gray-800 truncate text-sm">{nextAppointment.psychologist_name}</p>
                        <p className="text-xs text-gray-600">{format(new Date(nextAppointment.date), 'MMM d')} · {nextAppointment.time}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">{t('hero_no_upcoming')}</p>
                    )}
                  </div>
                  <ChevronIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>

              <Link
                to={createPageUrl('Reminders')}
                className="group p-4 rounded-2xl bg-[#FFF4E6] border border-orange-200/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('hero_next_reminder')}</p>
                    {nextReminder ? (
                      <>
                        <p className="font-medium text-gray-800 truncate text-sm">{nextReminder.title}</p>
                        <p className="text-xs text-gray-600">{format(new Date(nextReminder.date), 'MMM d')} · {nextReminder.time}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">{t('hero_no_reminders')}</p>
                    )}
                  </div>
                  <ChevronIcon className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>

              <Link
                to={createPageUrl('Emergency')}
                className="group p-4 rounded-2xl bg-red-50 border border-red-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-300 to-red-400 flex items-center justify-center shadow-sm flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">{t('hero_quick_access')}</p>
                    <p className="font-medium text-gray-800 text-sm">{t('hero_emergency_help')}</p>
                  </div>
                  <ChevronIcon className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors flex-shrink-0 mt-1" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute top-10 left-10 w-32 h-32 bg-white/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#E8907C]/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </section>
  );
}

