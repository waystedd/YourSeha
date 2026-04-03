import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CommunityPreview({ posts, groups }) {
  const isMeetup = (p) => p.post_type === 'meetup' || p.post_type === 'webinar';
  const meetupPost = posts?.find((p) => isMeetup(p));
  const recentPost = posts?.find((p) => !isMeetup(p));

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Community Highlights</h2>
          <Link to={createPageUrl('Community')}>
            <Button variant="ghost" className="text-[#E8907C] hover:text-[#d87a66] hover:bg-[#FFF8F6] rounded-xl transition-colors">
              View Community <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            {meetupPost && (
              <Link
                to={createPageUrl('PostDetail') + `?id=${meetupPost.id}`}
                className="block bg-[#FFE5E8] rounded-2xl p-4 border border-[#F9C6B8]/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD9C0] to-[#F9C6B8] flex items-center justify-center shadow-sm">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-[#E8907C] uppercase">📅 Upcoming Meetup</span>
                    <h3 className="font-semibold text-gray-800 mt-1 line-clamp-1">{meetupPost.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{meetupPost.content}</p>
                  </div>
                </div>
              </Link>
            )}

            {recentPost && (
              <Link
                to={createPageUrl('PostDetail') + `?id=${recentPost.id}`}
                className="block bg-[#FFF4E6] rounded-2xl p-4 border border-[#F9C6B8]/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD9C0] to-[#F9C6B8] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-white/50">
                    {recentPost.author_photo ? (
                      <img src={recentPost.author_photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-medium text-sm">{recentPost.author_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800 text-sm">{recentPost.author_name || 'Anonymous'}</span>
                    <h3 className="font-medium text-gray-800 mt-1 line-clamp-1">{recentPost.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recentPost.content}</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

