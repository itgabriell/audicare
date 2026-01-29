import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

export const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, delay = 0 }) => (
    <div className={cn(
        "relative overflow-hidden rounded-3xl bg-white dark:bg-card p-6 shadow-sm border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
        colorClass.border || "border-slate-100 dark:border-slate-800",
        "animate-in fade-in zoom-in-95 duration-500 fill-mode-backwards"
    )} style={{ animationDelay: `${delay}ms` }}>

        {/* Watermark Icon */}
        <div className={cn("absolute -right-4 -bottom-4 p-0 opacity-[0.08] transition-all group-hover:scale-110 group-hover:rotate-6", colorClass.text)}>
            <Icon className="w-24 h-24" />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors", colorClass.bg)}>
                <Icon className={cn("h-5 w-5 transition-colors", colorClass.text)} />
            </div>

            <div className="space-y-0.5">
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
                    {value}
                </h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide opacity-80 text-[10px]">{title}</p>
            </div>

            {subtitle && (
                <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" /> {subtitle}
                    </p>
                </div>
            )}
        </div>
    </div>
);
