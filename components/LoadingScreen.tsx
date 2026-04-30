import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Blur Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-white/40 backdrop-blur-md"
      />
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <div className="w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center border border-slate-100 relative overflow-hidden group">
          <Loader2 className="animate-spin text-brand-blue" size={28} />
          <motion.div 
            animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-brand-blue/5"
          />
        </div>
        
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-[0.3em]">Sincronizando</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Atualizando dados da paróquia...</p>
        </div>
      </motion.div>
    </div>
  );
};
