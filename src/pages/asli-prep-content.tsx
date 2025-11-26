import { useState } from 'react';
import { Link } from 'wouter';
import Navigation from '@/components/navigation';
import AsliPrepContent from '@/components/student/asli-prep-content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AsliPrepContentPage() {
  const isMobile = useIsMobile();

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-sky-50 pt-20 pb-12 px-2 sm:px-4 lg:px-6 relative">
        <div className="w-full">
          
          {/* Robot GIF - Fixed at Bottom Left */}
          {!isMobile && (
            <Link href="/ai-tutor">
              <div className="fixed bottom-8 left-4 z-30 cursor-pointer">
                <img 
                  src="/ROBOT.gif" 
                  alt="Robot - Click to chat with Vidya AI" 
                  className="w-32 h-auto rounded-xl shadow-xl opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300"
                />
              </div>
            </Link>
          )}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AP</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AsliLearn Exclusive</h1>
                <p className="text-gray-600">Premium study materials created by Super Admin</p>
              </div>
            </div>
          </div>
          <AsliPrepContent />
        </div>
      </div>
    </>
  );
}

