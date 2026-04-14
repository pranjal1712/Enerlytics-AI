import React from 'react';

export const SidebarSkeleton = () => (
  <div className="p-4 space-y-6 animate-pulse">
    <div className="flex items-center gap-2 mb-8">
      <div className="w-8 h-8 bg-white/5 rounded-full"></div>
      <div className="h-4 w-24 bg-white/5 rounded"></div>
    </div>
    
    <div className="w-full h-10 bg-white/5 rounded-lg mb-8"></div>
    
    <div className="space-y-4">
      <div className="h-3 w-20 bg-white/5 rounded"></div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-12 w-full bg-white/5 rounded-md"></div>
      ))}
    </div>

    <div className="space-y-4 pt-8">
      <div className="h-3 w-20 bg-white/5 rounded"></div>
      {[1, 2].map(i => (
        <div key={i} className="h-12 w-full bg-white/5 rounded-md"></div>
      ))}
    </div>
  </div>
);

export const ChatSkeleton = () => (
  <div className="p-8 space-y-8 animate-pulse w-full max-w-4xl mx-auto">
    <div className="flex justify-center mb-12">
        <div className="h-10 w-48 bg-white/5 rounded-full"></div>
    </div>
    
    <div className="space-y-6">
      <div className="flex justify-start">
        <div className="h-24 w-3/4 bg-white/5 rounded-2xl rounded-tl-none"></div>
      </div>
      <div className="flex justify-end">
        <div className="h-12 w-1/2 bg-white/5 rounded-2xl rounded-tr-none"></div>
      </div>
      <div className="flex justify-start">
        <div className="h-32 w-2/3 bg-white/5 rounded-2xl rounded-tl-none"></div>
      </div>
    </div>
  </div>
);

export default function SkeletonLoader({ type = 'full' }) {
  if (type === 'sidebar') return <SidebarSkeleton />;
  if (type === 'chat') return <ChatSkeleton />;
  
  return (
    <div className="flex h-full w-full">
      <div className="w-72 border-r border-white/5 bg-[#0a0a0b]">
        <SidebarSkeleton />
      </div>
      <div className="flex-1 bg-[#0a0a0b]/50">
        <ChatSkeleton />
      </div>
    </div>
  );
}
