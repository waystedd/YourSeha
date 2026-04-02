import React, { createContext, useContext, useMemo, useState } from 'react'

const LanguageContext = createContext(null)

const strings = {
  en: {
    lang_switch: 'AR',
    notifications: 'Notifications',
    no_notifications: 'No new notifications',
    nav_home: 'Home',
    nav_dashboard: 'Dashboard',
    nav_community: 'Community',
    nav_psychologists: 'Psychologists',
    nav_resources: 'Resources',
    nav_journaling: 'Journaling',
    nav_reminders: 'Reminders',
    nav_emergency: 'Emergency',
    profile_my_posts: 'My posts',
    profile_appointments: 'Appointments',
    profile_settings: 'Profile',
    profile_logout: 'Logout',
    footer_about: 'About',
    footer_privacy: 'Privacy',
    footer_disclaimer: 'Disclaimer',
    footer_contact: 'Contact',
    footer_terms: 'Terms',
    footer_copyright: `© ${new Date().getFullYear()} YourSeha`,
    features_heading: 'Features',
    feature_psychologist: 'Psychologists',
    feature_psychologist_desc: 'Find licensed support',
    feature_community: 'Community',
    feature_community_desc: 'Connect with other mothers',
    feature_resources: 'Resources',
    feature_resources_desc: 'Guides and exercises',
    feature_journaling: 'Journaling',
    feature_journaling_desc: 'Track your mood and notes',
    feature_reminders: 'Reminders',
    feature_reminders_desc: 'Stay on top of tasks',
    feature_self_care: 'Self-care',
    feature_self_care_desc: 'Tools for wellbeing',
    hero_greeting_morning: 'Good morning',
    hero_greeting_afternoon: 'Good afternoon',
    hero_greeting_evening: 'Good evening',
    hero_tagline: 'Your wellness companion',
    hero_next_appointment: 'Next appointment',
    hero_no_upcoming: 'No upcoming',
    hero_next_reminder: 'Next reminder',
    hero_no_reminders: 'No reminders',
    hero_quick_access: 'Quick access',
    hero_emergency_help: 'Emergency help',
  },
  ar: {
    lang_switch: 'EN',
    notifications: 'الإشعارات',
    no_notifications: 'لا توجد إشعارات جديدة',
    nav_home: 'الرئيسية',
    nav_dashboard: 'لوحة المتابعة',
    nav_community: 'المجتمع',
    nav_psychologists: 'الأخصائيون',
    nav_resources: 'المصادر',
    nav_journaling: 'اليوميات',
    nav_reminders: 'التذكيرات',
    nav_emergency: 'الطوارئ',
    profile_my_posts: 'منشوراتي',
    profile_appointments: 'المواعيد',
    profile_settings: 'الملف الشخصي',
    profile_logout: 'تسجيل الخروج',
    footer_about: 'من نحن',
    footer_privacy: 'الخصوصية',
    footer_disclaimer: 'إخلاء المسؤولية',
    footer_contact: 'تواصل معنا',
    footer_terms: 'الشروط',
    footer_copyright: `© ${new Date().getFullYear()} YourSeha`,
    features_heading: 'الميزات',
    feature_psychologist: 'الأخصائيون',
    feature_psychologist_desc: 'اعثر على دعم مرخّص',
    feature_community: 'المجتمع',
    feature_community_desc: 'تواصلي مع أمهات أخريات',
    feature_resources: 'المصادر',
    feature_resources_desc: 'أدلة وتمارين',
    feature_journaling: 'اليوميات',
    feature_journaling_desc: 'تتبّعي مزاجك وملاحظاتك',
    feature_reminders: 'التذكيرات',
    feature_reminders_desc: 'حافظي على التنظيم',
    feature_self_care: 'العناية الذاتية',
    feature_self_care_desc: 'أدوات للرفاهية',
    hero_greeting_morning: 'صباح الخير',
    hero_greeting_afternoon: 'مساء الخير',
    hero_greeting_evening: 'مساء الخير',
    hero_tagline: 'رفيقك للعافية',
    hero_next_appointment: 'الموعد التالي',
    hero_no_upcoming: 'لا توجد مواعيد قادمة',
    hero_next_reminder: 'التذكير التالي',
    hero_no_reminders: 'لا توجد تذكيرات',
    hero_quick_access: 'وصول سريع',
    hero_emergency_help: 'مساعدة طارئة',
  },
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')

  const value = useMemo(() => {
    const isRTL = language === 'ar'
    const dict = strings[language] ?? strings.en
    const t = (key) => dict[key] ?? key
    return { language, setLanguage, isRTL, t }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}

