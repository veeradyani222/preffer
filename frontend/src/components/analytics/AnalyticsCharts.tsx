'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { Smile, Meh, Frown } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface DailyViews { date: string; views: number; }
interface DailyMessages { date: string; messages: number; }

interface ViewsChartProps {
    viewsData: DailyViews[];
    messagesData: DailyMessages[];
}

interface SentimentChartProps {
    sentiment: { positive: number; neutral: number; negative: number };
}

// ============================================
// COMPONENTS
// ============================================

export function ViewsChart({ viewsData, messagesData }: ViewsChartProps) {
    if (viewsData.length === 0) return null;

    // Merge data for the chart
    const data = viewsData.map((v, i) => ({
        date: v.date,
        views: v.views,
        messages: messagesData[i]?.messages || 0,
    }));

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#37352f" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#37352f" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9E9E7" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(str) => {
                            const date = new Date(str);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9B9A97', fontSize: 11 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9B9A97', fontSize: 11 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #E9E9E7',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            fontSize: '12px'
                        }}
                        labelStyle={{ color: '#9B9A97', marginBottom: '4px' }}
                        itemStyle={{ padding: 0 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#37352f"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorViews)"
                        name="Views"
                    />
                    <Area
                        type="monotone"
                        dataKey="messages"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorMessages)"
                        name="Messages"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function SentimentChart({ sentiment }: SentimentChartProps) {
    const total = sentiment.positive + sentiment.neutral + sentiment.negative;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-[160px] text-xs text-[#9B9A97]">
                No sentiment data yet
            </div>
        );
    }

    const data = [
        { name: 'Positive', value: sentiment.positive, color: '#22C55E' },
        { name: 'Neutral', value: sentiment.neutral, color: '#9B9A97' },
        { name: 'Negative', value: sentiment.negative, color: '#EF4444' },
    ].filter(d => d.value > 0);

    return (
        <div className="flex items-center gap-6">
            <div className="h-[140px] w-[140px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={60}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-[#37352f]">{total}</span>
                    <span className="text-[10px] text-[#9B9A97] uppercase tracking-wider">Total</span>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                    <Smile size={16} className="text-green-500" />
                    <span className="text-[#37352f] font-medium">{Math.round((sentiment.positive / total) * 100)}%</span>
                    <span className="text-xs text-[#9B9A97]">Positive</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Meh size={16} className="text-[#9B9A97]" />
                    <span className="text-[#37352f] font-medium">{Math.round((sentiment.neutral / total) * 100)}%</span>
                    <span className="text-xs text-[#9B9A97]">Neutral</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Frown size={16} className="text-red-500" />
                    <span className="text-[#37352f] font-medium">{Math.round((sentiment.negative / total) * 100)}%</span>
                    <span className="text-xs text-[#9B9A97]">Negative</span>
                </div>
            </div>
        </div>
    );
}
