
import React from 'react';
import { SeoAnalysis } from '../types';
import { CheckCircle, AlertTriangle, XCircle, Gauge, Type, Clock, Hash } from 'lucide-react';

interface Props {
  analysis: SeoAnalysis;
}

export const SeoScorecard: React.FC<Props> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500 border-green-500';
    if (score >= 50) return 'text-orange-500 border-orange-500';
    return 'text-red-500 border-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 50) return 'bg-orange-50';
    return 'bg-red-50';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
      {/* Header with Score */}
      <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${getScoreBg(analysis.score)}`}>
        <div className="flex items-center gap-2">
           <Gauge size={20} className={getScoreColor(analysis.score).split(' ')[0]} />
           <h3 className="font-display font-bold text-slate-700">SEO Score</h3>
        </div>
        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-sm bg-white ${getScoreColor(analysis.score)}`}>
           {analysis.score}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="p-3 text-center">
            <Type size={16} className="mx-auto text-slate-400 mb-1" />
            <div className="text-sm font-bold text-slate-700">{analysis.wordCount}</div>
            <div className="text-[10px] uppercase text-slate-400">Woorden</div>
        </div>
        <div className="p-3 text-center">
            <Clock size={16} className="mx-auto text-slate-400 mb-1" />
            <div className="text-sm font-bold text-slate-700">{analysis.readingTime} min</div>
            <div className="text-[10px] uppercase text-slate-400">Leestijd</div>
        </div>
        <div className="p-3 text-center">
            <Hash size={16} className="mx-auto text-slate-400 mb-1" />
            <div className="text-sm font-bold text-slate-700">{analysis.keywordDensity}%</div>
            <div className="text-[10px] uppercase text-slate-400">Dichtheid</div>
        </div>
      </div>

      {/* Issues List */}
      <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
         {analysis.issues.critical.length > 0 && (
             <div className="mb-4">
                 <h4 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                     <XCircle size={12} /> Kritiek
                 </h4>
                 <ul className="space-y-2">
                     {analysis.issues.critical.map((issue, i) => (
                         <li key={i} className="text-xs text-slate-600 leading-snug pl-3 border-l-2 border-red-200">
                             {issue}
                         </li>
                     ))}
                 </ul>
             </div>
         )}

         {analysis.issues.warning.length > 0 && (
             <div className="mb-4">
                 <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                     <AlertTriangle size={12} /> Verbeterpunten
                 </h4>
                 <ul className="space-y-2">
                     {analysis.issues.warning.map((issue, i) => (
                         <li key={i} className="text-xs text-slate-600 leading-snug pl-3 border-l-2 border-orange-200">
                             {issue}
                         </li>
                     ))}
                 </ul>
             </div>
         )}

         {analysis.issues.good.length > 0 && (
             <div>
                 <h4 className="text-xs font-bold text-green-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                     <CheckCircle size={12} /> Goed bezig
                 </h4>
                 <ul className="space-y-2">
                     {analysis.issues.good.map((issue, i) => (
                         <li key={i} className="text-xs text-slate-500 leading-snug pl-3 border-l-2 border-green-200">
                             {issue}
                         </li>
                     ))}
                 </ul>
             </div>
         )}
         
         {analysis.issues.critical.length === 0 && analysis.issues.warning.length === 0 && (
             <div className="text-center py-4 text-green-600 bg-green-50 rounded-lg">
                 <p className="font-bold text-sm">Geweldig! 🎉</p>
                 <p className="text-xs">Je content is perfect geoptimaliseerd.</p>
             </div>
         )}
      </div>
    </div>
  );
};
