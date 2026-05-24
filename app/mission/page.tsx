"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Users, Trophy, Lightbulb, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function MissionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col font-sans overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <header className="py-20 px-6 text-center relative max-w-4xl mx-auto w-full">
        <button 
          onClick={() => router.push("/")}
          className="absolute left-6 top-20 flex items-center gap-2 text-zinc-500 hover:text-cyan-400 font-mono text-xs uppercase tracking-widest transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          [ Back to Terminal ]
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-12"
        >
          <span className="text-cyan-500 font-mono text-[10px] uppercase tracking-[0.4em]">Corporate Protocol // Vision 2026</span>
          <h1 className="text-6xl font-black italic tracking-tighter uppercase text-white mt-2">
            Our <span className="text-cyan-500">Mission</span>
          </h1>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] mt-4 max-w-xl mx-auto">
            Architecting collective flow states and high-performance workplace culture through play.
          </p>
        </motion.div>
      </header>

      {/* MISSION CONTAINER */}
      <main className="flex-grow max-w-4xl mx-auto px-6 pb-20 w-full">
        <div className="grid gap-8">
          
          {/* Mission 1 */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-8 bg-zinc-900/50 border border-white/5 rounded-[2.5rem] hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest text-white leading-tight">
                1. Synchronized Synergy: Elevating Team Bonding for Unstoppable Productivity
              </h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed font-medium pl-2 md:pl-16">
              Our primary core mission is to cultivate deep, authentic connections within workplaces by transforming how teams interact. 
              We believe that a team that plays together stays together, and by breaking down communication silos through shared multiplayer 
              experiences, we naturally elevate trust, morale, and cross-functional synergy. Ultimately, our games aren't just an escape 
              from work; they are a catalyst for building the underlying psychological safety and team bonding that directly drives long-term 
              workplace productivity.
            </p>
          </motion.div>

          {/* Mission 2 */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-8 bg-zinc-900/50 border border-white/5 rounded-[2.5rem] hover:border-purple-500/30 transition-all duration-300 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl">
                <Lightbulb size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest text-white leading-tight">
                2. Intelligent Arenas: Harnessing AI to Engineer the Future of Casual Play
              </h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed font-medium pl-2 md:pl-16">
              To achieve this at scale, we are completely reimagining game development by placing cutting-edge Artificial Intelligence at 
              the absolute heart of our engineering pipeline. By leveraging AI, our platform dynamically designs, balances, and adapts games 
              to match the unique rhythms of different teams in real-time. This commitment to intelligent automation allows us to build richer, 
              highly personalized gaming mechanics rapidly, ensuring that every room session feels fresh, intelligent, and tailored to the 
              players involved.
            </p>
          </motion.div>

          {/* Mission 3 */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-8 bg-zinc-900/50 border border-white/5 rounded-[2.5rem] hover:border-amber-500/30 transition-all duration-300 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
                <Trophy size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest text-white leading-tight">
                3. Boundless Entertainment: Redefining Social Fun with Next-Gen Party Protocols
              </h3>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed font-medium pl-2 md:pl-16">
              At the end of the day, our guiding star is to inject pure, unadulterated fun back into the weekly routine while relentlessly 
              expanding our entertainment horizon. We are actively moving beyond traditional formats to introduce a massive, diverse library 
              of interactive experiences—ranging from lightning-fast trivia and brain-teasing fun quizzes to high-stakes team Jeopardy and 
              casual battle royales. We want to ensure there is always a new arena for friendly competition, giving every single colleague a 
              reason to look forward to Friday.
            </p>
          </motion.div>

        </div>
      </main>

      {/* MINI FOOTER */}
      <footer className="py-8 border-t border-white/5 bg-black/40 backdrop-blur-md text-center">
        <p className="text-zinc-600 text-[9px] font-mono uppercase tracking-[0.3em]">
          © 2026 FUNFRIDAY LABS. ALL MISSION MANIFESTOS VERIFIED.
        </p>
      </footer>
    </div>
  );
}