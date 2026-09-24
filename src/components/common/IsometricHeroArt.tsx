import React from 'react';
import { Sparkles, Shield, Cpu, Award } from 'lucide-react';

export const IsometricHeroArt: React.FC = () => {
  return (
    <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center select-none">
      {/* Outer Glowing Rings */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/20 via-indigo-500/10 to-pink-500/20 blur-2xl animate-pulse" />
      <div className="absolute w-[80%] h-[80%] rounded-full border border-purple-500/20 animate-[spin_20s_linear_infinite]" />
      <div className="absolute w-[95%] h-[95%] rounded-full border border-dashed border-indigo-500/20 animate-[spin_30s_linear_infinite_reverse]" />

      {/* Floating Badges */}
      {/* Top Left AI Badge */}
      <div className="absolute top-6 left-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-purple-500/40 rounded-2xl px-3.5 py-2 shadow-xl shadow-purple-900/30 backdrop-blur-md animate-bounce [animation-duration:4s]">
        <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">AI Generation</p>
          <p className="text-xs font-bold text-white">99.4% Accuracy</p>
        </div>
      </div>

      {/* Top Right Shield Badge */}
      <div className="absolute top-10 right-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-emerald-500/40 rounded-2xl px-3.5 py-2 shadow-xl shadow-emerald-900/30 backdrop-blur-md animate-bounce [animation-duration:5s]">
        <div className="w-7 h-7 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Dual Validation</p>
          <p className="text-xs font-bold text-emerald-400">Rule Verified</p>
        </div>
      </div>

      {/* Bottom Right Floating Badge */}
      <div className="absolute bottom-8 right-6 z-20 flex items-center gap-2 bg-slate-900/90 border border-indigo-500/40 rounded-2xl px-3.5 py-2 shadow-xl shadow-indigo-900/30 backdrop-blur-md animate-bounce [animation-duration:4.5s]">
        <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
          <Award className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Competency</p>
          <p className="text-xs font-bold text-indigo-300">100% Aligned</p>
        </div>
      </div>

      {/* Isometric 3D SVG Graphic */}
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full relative z-10 drop-shadow-[0_20px_50px_rgba(147,51,234,0.3)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pedestalTop" x1="150" y1="280" x2="450" y2="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#2e1065" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="pedestalLeft" x1="150" y1="350" x2="300" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b0764" />
            <stop offset="100%" stopColor="#0f0728" />
          </linearGradient>
          <linearGradient id="pedestalRight" x1="300" y1="350" x2="450" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#581c87" />
            <stop offset="100%" stopColor="#180c38" />
          </linearGradient>
          <linearGradient id="cubeGradient1" x1="200" y1="180" x2="400" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          <linearGradient id="cubeGradient2" x1="200" y1="180" x2="400" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6b21a8" />
          </linearGradient>
          <linearGradient id="cubeGradient3" x1="200" y1="180" x2="400" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>
          <linearGradient id="glowLinear" x1="300" y1="100" x2="300" y2="400" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="centralLight" cx="300" cy="300" r="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0b0914" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center Glow */}
        <circle cx="300" cy="350" r="180" fill="url(#centralLight)" />

        {/* Base Tier 1 (Lowest Platform) */}
        <g transform="translate(0, 40)">
          {/* Top Face */}
          <polygon points="300,320 480,410 300,500 120,410" fill="url(#pedestalTop)" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4" />
          {/* Left Face */}
          <polygon points="120,410 300,500 300,530 120,440" fill="url(#pedestalLeft)" stroke="#9333ea" strokeWidth="1" strokeOpacity="0.3" />
          {/* Right Face */}
          <polygon points="300,500 480,410 480,440 300,530" fill="url(#pedestalRight)" stroke="#9333ea" strokeWidth="1" strokeOpacity="0.3" />
        </g>

        {/* Tier 2 (Middle Platform) */}
        <g transform="translate(0, 0)">
          {/* Top Face */}
          <polygon points="300,280 440,350 300,420 160,350" fill="url(#pedestalTop)" stroke="#c084fc" strokeWidth="1.5" strokeOpacity="0.5" />
          {/* Grid lines on platform */}
          <line x1="230" y1="315" x2="370" y2="385" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="370" y1="315" x2="230" y2="385" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.4" />
          {/* Left Face */}
          <polygon points="160,350 300,420 300,445 160,375" fill="url(#pedestalLeft)" />
          {/* Right Face */}
          <polygon points="300,420 440,350 440,375 300,445" fill="url(#pedestalRight)" />
        </g>

        {/* Vertical Holographic Light Beams */}
        <polygon points="260,120 340,120 380,330 220,330" fill="url(#glowLinear)" opacity="0.4" />

        {/* Central Floating Isometric 3D Hexagonal Node */}
        <g transform="translate(0, -30)">
          {/* Top Face */}
          <polygon points="300,160 370,200 300,240 230,200" fill="url(#cubeGradient1)" stroke="#f3e8ff" strokeWidth="2" />
          {/* Left Face */}
          <polygon points="230,200 300,240 300,310 230,270" fill="url(#cubeGradient3)" stroke="#e9d5ff" strokeWidth="1.5" />
          {/* Right Face */}
          <polygon points="300,240 370,200 370,270 300,310" fill="url(#cubeGradient2)" stroke="#e9d5ff" strokeWidth="1.5" />

          {/* Glowing Center Core */}
          <circle cx="300" cy="220" r="14" fill="#ffffff" filter="drop-shadow(0 0 10px #ec4899)" />
          <circle cx="300" cy="220" r="6" fill="#f43f5e" />
        </g>

        {/* Satellite Floating Cubes */}
        {/* Left Satellite */}
        <g transform="translate(-110, 30)">
          <polygon points="200,210 230,225 200,240 170,225" fill="#a855f7" stroke="#e9d5ff" strokeWidth="1" />
          <polygon points="170,225 200,240 200,265 170,250" fill="#6b21a8" />
          <polygon points="200,240 230,225 230,250 200,265" fill="#7e22ce" />
        </g>

        {/* Right Satellite */}
        <g transform="translate(110, 10)">
          <polygon points="400,200 430,215 400,230 370,215" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1" />
          <polygon points="370,215 400,230 400,255 370,240" fill="#0369a1" />
          <polygon points="400,230 430,215 430,240 400,255" fill="#0284c7" />
        </g>

        {/* Circuit Data Lines */}
        <path d="M 170 375 L 210 395 L 210 430" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
        <path d="M 430 375 L 390 395 L 390 430" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
        <circle cx="210" cy="430" r="3" fill="#c084fc" />
        <circle cx="390" cy="430" r="3" fill="#38bdf8" />
      </svg>
    </div>
  );
};
