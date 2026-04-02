import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UserCircle, Users, BookOpen, PenLine, Bell, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';

const features = [
  {
    nameKey: 'feature_psychologist', descKey: 'feature_psychologist_desc',
    icon: UserCircle, page: 'Psychologists',
    bg: 'bg-[#F0EAFF]', border: 'border-violet-200/60', iconGrad: 'from-violet-300 to-violet-400'
  },
  {
    nameKey: 'feature_community', descKey: 'feature_community_desc',
    icon: Users, page: 'Community',
    bg: 'bg-[#FFECF5]', border: 'border-pink-200/60', iconGrad: 'from-pink-300 to-pink-400'
  },
  {
    nameKey: 'feature_resources', descKey: 'feature_resources_desc',
    icon: BookOpen, page: 'Resources',
    bg: 'bg-[#FEFCE8]', border: 'border-yellow-200/60', iconGrad: 'from-amber-300 to-amber-400'
  },
  {
    nameKey: 'feature_journaling', descKey: 'feature_journaling_desc',
    icon: PenLine, page: 'Journaling',
    bg: 'bg-[#FFF0F0]', border: 'border-rose-200/60', iconGrad: 'from-rose-300 to-rose-400'
  },
  {
    nameKey: 'feature_reminders', descKey: 'feature_reminders_desc',
    icon: Bell, page: 'Reminders',
    bg: 'bg-[#FFF4E6]', border: 'border-orange-200/60', iconGrad: 'from-orange-300 to-orange-400'
  },
  {
    nameKey: 'feature_self_care', descKey: 'feature_self_care_desc',
    icon: Heart, page: 'Resources',
    bg: 'bg-[#ECFDF5]', border: 'border-emerald-200/60', iconGrad: 'from-emerald-300 to-emerald-400'
  }
];

export default function FeatureGrid() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="py-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">{t('features_heading')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.nameKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Link
                to={createPageUrl(feature.page)}
                className={`group block p-5 rounded-3xl ${feature.bg} border ${feature.border} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.iconGrad} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1 text-sm md:text-base">{t(feature.nameKey)}</h3>
                <p className="text-xs text-gray-500">{t(feature.descKey)}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

