import React from 'react';
import { useIsMobile, useIsTablet, useIsDesktop, useScreenSize } from '@/hooks/use-mobile';

export default function ResponsiveTest() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const screenSize = useScreenSize();

  return (
    <div className="container-responsive py-responsive">
      <div className="bg-white rounded-responsive p-responsive shadow-responsive">
        <h2 className="text-responsive-xl font-bold mb-responsive">Responsive Design Test</h2>
        
        <div className="grid-responsive-3 gap-responsive mb-responsive">
          <div className="bg-blue-100 p-responsive rounded-responsive text-center">
            <h3 className="text-responsive-base font-semibold mb-responsive">Mobile</h3>
            <p className="text-responsive-sm">Screen: {isMobile ? 'Yes' : 'No'}</p>
          </div>
          
          <div className="bg-green-100 p-responsive rounded-responsive text-center">
            <h3 className="text-responsive-base font-semibold mb-responsive">Tablet</h3>
            <p className="text-responsive-sm">Screen: {isTablet ? 'Yes' : 'No'}</p>
          </div>
          
          <div className="bg-purple-100 p-responsive rounded-responsive text-center">
            <h3 className="text-responsive-base font-semibold mb-responsive">Desktop</h3>
            <p className="text-responsive-sm">Screen: {isDesktop ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-responsive-sm text-gray-600">
            Current screen size: <span className="font-semibold">{screenSize}</span>
          </p>
          <p className="text-responsive-xs text-gray-500 mt-responsive">
            Window width: {typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px
          </p>
        </div>

        <div className="mt-responsive">
          <h3 className="text-responsive-lg font-semibold mb-responsive">Responsive Utilities Test</h3>
          <div className="space-responsive">
            <div className="bg-gray-100 p-responsive rounded-responsive">
              <p className="text-responsive-xs">Extra Small Text</p>
              <p className="text-responsive-sm">Small Text</p>
              <p className="text-responsive-base">Base Text</p>
              <p className="text-responsive-lg">Large Text</p>
              <p className="text-responsive-xl">Extra Large Text</p>
              <p className="text-responsive-2xl">2XL Text</p>
              <p className="text-responsive-3xl">3XL Text</p>
            </div>
            
            <div className="grid-responsive-4 gap-responsive">
              <div className="bg-red-100 p-responsive rounded-responsive text-center">1</div>
              <div className="bg-yellow-100 p-responsive rounded-responsive text-center">2</div>
              <div className="bg-green-100 p-responsive rounded-responsive text-center">3</div>
              <div className="bg-blue-100 p-responsive rounded-responsive text-center">4</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






