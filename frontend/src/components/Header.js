import React from 'react';
import { Shield } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-white" />
          <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
            GOVERNANCE ENGINE
          </span>
          <span className="text-[10px] font-mono text-neutral-500 border border-white/10 px-1.5 py-0.5">v4.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />FAISS ACTIVE
          </span>
          <span className="text-[10px] font-mono text-neutral-500">998 VECTORS</span>
        </div>
      </div>
    </header>
  );
}
