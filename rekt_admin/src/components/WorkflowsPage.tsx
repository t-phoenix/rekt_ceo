import { useEffect, useState } from 'react'
import { useWorkflows, type TableName } from '../hooks'
import { WorkflowLauncherModal } from './WorkflowLauncherModal'

const TABLE_TABS: { label: string; value: TableName | 'runs' }[] = [
    { label: 'All Runs', value: 'runs' },
    { label: 'Trend Research', value: 'rekt_meme_trend_research' },
    { label: 'KOL Research', value: 'rekt_kol_research' },
    { label: 'Competition', value: 'rekt_competition_research' },
    { label: 'Content (Text)', value: 'rekt_meme_content_generations' },
    { label: 'Memes', value: 'rekt_meme_generations' },
    { label: 'Twitter Engagement', value: 'rekt_meme_twitter_engagement' },
]

type JsonRendererProps = { data: any }
const JsonRenderer = ({ data }: JsonRendererProps) => {
    if (typeof data === 'string' && data.startsWith('http')) {
        return <a href={data} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all">{data}</a>
    }
    if (typeof data !== 'object' || data === null) {
        return <span className="text-gray-800 dark:text-gray-200">{String(data)}</span>
    }
    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-sm max-h-60 overflow-y-auto w-full">
            <pre className="text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>
        </div>
    )
}

export const getStatusColor = (val: string) => {
    const s = String(val).toLowerCase();
    if (s === 'running') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50';
    if (s === 'failed') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50';

    if (s.includes('competition')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50';
    if (s.includes('kol')) return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50';
    if (s.includes('meme')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50';
    if (s.includes('trend')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50';
    if (s.includes('text')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50';
    if (s.includes('twitter') || s.includes('engagement')) return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50';
    if (s.includes('complete')) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800/50';

    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
}

const IdentifiedKolsSection = ({ data }: { data: any[] }) => {
    const [showRaw, setShowRaw] = useState(false);

    if (!Array.isArray(data)) return <JsonRenderer data={data} />;

    return (
        <div className="flex flex-col gap-3 w-full border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50/20 dark:bg-gray-800/20">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    👥 Identified KOLs ({data.length})
                </span>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    {showRaw ? 'Clean View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <JsonRenderer data={data} />
            ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.map((kol, i) => (
                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <a href={`https://twitter.com/${kol.handle}`} target="_blank" rel="noreferrer" className="text-lg font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline">
                                        @{kol.handle}
                                    </a>
                                    <span className="ml-3 text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                                        {Number(kol.followers).toLocaleString()} followers
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Score</span>
                                    <span className={`text-sm font-bold ${kol.compatibility_score >= 80 ? 'text-green-600' : kol.compatibility_score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                                        {kol.compatibility_score}/100
                                    </span>
                                </div>
                            </div>

                            {kol.bio && <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">{kol.bio}</p>}

                            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg p-3 mb-4 border border-indigo-100 dark:border-indigo-800/30">
                                <p className="text-[10px] uppercase text-indigo-800 dark:text-indigo-400 font-bold mb-1.5 flex items-center gap-1">
                                    <span>🧠</span> AI Strategy Alignment
                                </p>
                                <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed italic">"{kol.alignment_reasoning}"</p>
                            </div>

                            <details className="group">
                                <summary className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
                                    <span className="group-open:rotate-90 transition-transform">▶</span>
                                    View {kol.recent_tweets?.length || 0} Recent Tweets
                                </summary>
                                <div className="mt-3 space-y-2.5 pl-3 border-l-2 border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto custom-scrollbar">
                                    {kol.recent_tweets?.map((tweet: any) => (
                                        <div key={tweet.id} className="text-xs bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                            <p className="text-gray-800 dark:text-gray-200 mb-2 whitespace-pre-wrap">{tweet.text}</p>
                                            <div className="flex justify-between items-center text-[10px] text-gray-500">
                                                <span>❤️ {tweet.likes}</span>
                                                <a href={tweet.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 font-medium">View on X</a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const EngagementPlansSection = ({ data }: { data: any[] }) => {
    const [showRaw, setShowRaw] = useState(false);

    if (!Array.isArray(data)) return <JsonRenderer data={data} />;

    return (
        <div className="flex flex-col gap-3 w-full border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50/20 dark:bg-gray-800/20">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    ✍️ Drafted Engagement Plans ({data.length})
                </span>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    {showRaw ? 'Clean View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <JsonRenderer data={data} />
            ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.map((plan, i) => (
                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                                <a href={`https://twitter.com/${plan.kol?.replace('@', '')}`} target="_blank" rel="noreferrer" className="font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                    {plan.kol}
                                </a>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${plan.compatibility >= 80 ? 'bg-green-100 text-green-700' : plan.compatibility >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                    Score: {plan.compatibility}
                                </span>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="relative pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                                    <span className="absolute -left-[5px] top-0 bg-gray-300 dark:bg-gray-600 w-2 h-2 rounded-full"></span>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Target Post</p>
                                        <a href={plan.post_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline font-medium">Link ↗</a>
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{plan.post}</p>
                                </div>

                                <div className="relative pl-4 border-l-2 border-indigo-500 dark:border-indigo-400">
                                    <span className="absolute -left-[5px] top-0 bg-indigo-500 dark:bg-indigo-400 w-2 h-2 rounded-full ring-4 ring-indigo-50 dark:ring-indigo-900/20"></span>
                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mb-1.5 uppercase tracking-wider font-bold">Drafted Reply</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                                        {plan.reply}
                                    </p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Reply Strategy</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">{plan.strategy}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CompetitorsSection = ({ data }: { data: any[] }) => {
    const [showRaw, setShowRaw] = useState(false);

    if (!Array.isArray(data)) return <JsonRenderer data={data} />;

    return (
        <div className="flex flex-col gap-2 w-full border border-gray-100 dark:border-gray-700 rounded-lg p-3 bg-gray-50/20 dark:bg-gray-800/20">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    🎯 Target Competitors ({data.length})
                </span>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    {showRaw ? 'Clean View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <JsonRenderer data={data} />
            ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                    {data.map((comp, i) => (
                        <a key={i} href={`https://twitter.com/${comp.replace('@', '')}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                            {comp}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

const TweetListSection = ({ data, title }: { data: any[], title: string }) => {
    const [showRaw, setShowRaw] = useState(false);

    if (!Array.isArray(data)) return <JsonRenderer data={data} />;

    return (
        <div className="flex flex-col gap-3 w-full border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50/20 dark:bg-gray-800/20">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    🐦 {title} ({data.length})
                </span>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    {showRaw ? 'Clean View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <JsonRenderer data={data} />
            ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.map((tweet, i) => (
                        <div key={tweet.id || i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                            <div className="flex justify-between items-start mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white text-sm">{tweet.author_name}</span>
                                    <a href={`https://twitter.com/${tweet.author_handle}`} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-blue-500">@{tweet.author_handle}</a>
                                    {tweet.author_verified && <span className="text-blue-500 text-xs" title="Verified">✓</span>}
                                </div>
                                <span className="text-[10px] text-gray-400">{new Date(tweet.created_at).toLocaleDateString()}</span>
                            </div>

                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mb-3">{tweet.text}</p>

                            <div className="flex items-center gap-4 text-[11px] text-gray-500 font-medium bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                <span title="Views">👁️ {Number(tweet.views || 0).toLocaleString()}</span>
                                <span title="Likes">❤️ {Number(tweet.likes || 0).toLocaleString()}</span>
                                <span title="Retweets">🔁 {Number(tweet.retweets || 0).toLocaleString()}</span>
                                <span title="Replies">💬 {Number(tweet.replies || 0).toLocaleString()}</span>
                                <a href={tweet.url} target="_blank" rel="noreferrer" className="ml-auto text-blue-500 hover:underline">View Post</a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TrendsDataSection = ({ data }: { data: any }) => {
    const [showRaw, setShowRaw] = useState(false);

    if (typeof data !== 'object' || data === null) return <JsonRenderer data={data} />;

    return (
        <div className="flex flex-col gap-3 w-full border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50/20 dark:bg-gray-800/20">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    📈 Selected Trend Strategy
                </span>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    {showRaw ? 'Clean View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <JsonRenderer data={data} />
            ) : (
                <div className="space-y-4">
                    {data.selected_topic && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${data.selected_topic.sentiment === 'positive' ? 'bg-green-500' : data.selected_topic.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-400'}`} />
                            <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">{data.selected_topic.topic}</h4>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">{data.selected_topic.domain}</span>
                                <span className="text-gray-500 text-[10px]">&bull;</span>
                                <span className="text-gray-500 text-xs font-medium">Virality: {data.selected_topic.virality_potential}/1.0</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{data.selected_topic.description}</p>

                            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                                <p className="text-[10px] uppercase text-indigo-800 dark:text-indigo-400 font-bold flex items-center gap-1 mb-1"><span>🧠</span> AI Reasoning</p>
                                <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 italic leading-relaxed">{data.selected_topic.reason}</p>
                            </div>

                            {data.selected_topic.meme_angles && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-2">Meme Angles</p>
                                    <div className="flex flex-wrap gap-2">
                                        {data.selected_topic.meme_angles.map((angle: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-[11px] font-medium border border-gray-200 dark:border-gray-600">
                                                💡 {angle}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {data.trending_topics && Array.isArray(data.trending_topics) && data.trending_topics.length > 1 && (
                        <details className="group">
                            <summary className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
                                <span className="group-open:rotate-90 transition-transform">▶</span>
                                View {data.trending_topics.length - 1} Alternate Rejected Trends
                            </summary>
                            <div className="mt-3 grid grid-cols-1 gap-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto custom-scrollbar">
                                {data.trending_topics.filter((t: any) => t.topic !== data.selected_topic?.topic).map((topic: any, i: number) => (
                                    <div key={i} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 opacity-80 hover:opacity-100 transition-opacity">
                                        <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{topic.topic}</p>
                                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{topic.description}</p>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
};

const GeneratedTextSection = ({ data }: { data: any }) => {
    const [showRaw, setShowRaw] = useState(false);

    if (typeof data !== 'object' || data === null) return <JsonRenderer data={data} />;

    const platformsList = Object.keys(data).filter(k => typeof data[k] === 'object');

    if (platformsList.length === 0) return <JsonRenderer data={data} />;

    return (
        <div className="flex flex-col gap-3 w-full border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50/20 dark:bg-gray-800/20">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    📝 Generated Content Drafts
                </span>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    {showRaw ? 'Clean View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <JsonRenderer data={data} />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {platformsList.map(platform => {
                        const content = data[platform];
                        const textBody = content.post || content.text || content.caption || content.content || '';

                        return (
                            <div key={platform} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                                <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200 capitalize flex items-center gap-2">
                                        {platform === 'twitter' || platform === 'x' ? '🐦 ' : ''}
                                        {platform === 'instagram' || platform === 'ig' ? '📸 ' : ''}
                                        {platform === 'linkedin' ? '💼 ' : ''}
                                        {platform}
                                    </span>
                                    {content.character_count && <span className="text-[10px] font-semibold text-gray-500">{content.character_count} chars</span>}
                                </div>
                                <div className="p-4">
                                    <div className="bg-indigo-50/30 dark:bg-indigo-900/5 p-4 rounded-lg border border-indigo-100/50 dark:border-indigo-800/20 mb-3">
                                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                                            {textBody}
                                        </p>
                                    </div>

                                    {content.hashtags && Array.isArray(content.hashtags) && content.hashtags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {content.hashtags.map((tag: string, i: number) => (
                                                <span key={i} className="text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">
                                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const ResultOutputSection = ({ data }: { data: any }) => {
    const [showRaw, setShowRaw] = useState(false);

    if (typeof data !== 'object' || data === null) return <JsonRenderer data={data} />;

    return (
        <div className="flex flex-col gap-3 w-full border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50/20 dark:bg-gray-800/20">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    📊 Analysis Results
                </span>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    {showRaw ? 'Clean View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <JsonRenderer data={data} />
            ) : (
                <div className="space-y-4">
                    {data.high_level_summary && (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h4 className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">High Level Summary</h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{data.high_level_summary}</p>
                        </div>
                    )}

                    {data.tone_analysis && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                            <h4 className="text-[11px] uppercase tracking-wider font-bold text-indigo-800 dark:text-indigo-400 mb-2 flex items-center gap-1">
                                <span>🎭</span> Tone Analysis
                            </h4>
                            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 italic leading-relaxed">{data.tone_analysis}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.top_hooks && Array.isArray(data.top_hooks) && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h4 className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2 flex items-center gap-1">
                                    <span>🪝</span> Top Hooks
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {data.top_hooks.map((hook: string, i: number) => (
                                        <li key={i} className="text-xs text-gray-700 dark:text-gray-300">{hook}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {data.formatting_trends && Array.isArray(data.formatting_trends) && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h4 className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2 flex items-center gap-1">
                                    <span>📝</span> Formatting Trends
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {data.formatting_trends.map((trend: string, i: number) => (
                                        <li key={i} className="text-xs text-gray-700 dark:text-gray-300">{trend}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const DataCard = ({ item }: { item: any }) => {
    const [showRawConfig, setShowRawConfig] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-4">
                {Object.entries(item).map(([key, value]) => {
                    if (key === 'id' || key === 'run_id') {
                        return (
                            <div key={key} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{key}</span>
                                <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400">{String(value)}</span>
                            </div>
                        )
                    }

                    if (key === 'created_at') {
                        const date = new Date(String(value));
                        const formattedDate = isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                        });
                        return (
                            <div key={key} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Created At</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formattedDate}</span>
                            </div>
                        )
                    }

                    if (key === 'configuration' && typeof value === 'object' && value !== null) {
                        const configObj = value as Record<string, any>;
                        const simplifiedConfig: Record<string, any> = {};
                        if (configObj.platforms) simplifiedConfig.platforms = configObj.platforms;

                        Object.entries(configObj).forEach(([k, v]) => {
                            if (typeof v === 'boolean') {
                                simplifiedConfig[k] = v;
                            }
                        });

                        return (
                            <div key={key} className="flex flex-col gap-2 border border-gray-100 dark:border-gray-700 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="flex justify-between items-center pb-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{key}</span>
                                    <button
                                        onClick={() => setShowRawConfig(!showRawConfig)}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                                    >
                                        {showRawConfig ? 'Show Clean View' : 'Show Full JSON'}
                                    </button>
                                </div>

                                {showRawConfig ? (
                                    <JsonRenderer data={value} />
                                ) : (
                                    <div className="space-y-3 mt-1">
                                        {simplifiedConfig.platforms && Array.isArray(simplifiedConfig.platforms) && (
                                            <div className="flex items-start flex-col gap-1.5 border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Platforms</span>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {simplifiedConfig.platforms.map((p: string) => (
                                                        <span key={p} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs capitalize border border-indigo-200 dark:border-indigo-800/60">
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {Object.keys(simplifiedConfig).filter(k => k !== 'platforms').length > 0 && (
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(simplifiedConfig).filter(([k]) => k !== 'platforms').map(([k, v]) => (
                                                    <div key={k} className="flex items-center justify-between bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-md border border-gray-200/60 dark:border-gray-600/60 shadow-sm">
                                                        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate mr-2 capitalize" title={k}>{k.replace(/_/g, ' ')}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-gray-500">{v ? 'Yes' : 'No'}</span>
                                                            <div className={`w-2 h-2 rounded-full ${v ? 'bg-green-500' : 'bg-red-500'}`} title={v ? 'Yes' : 'No'} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    if (key === 'status') {
                        return (
                            <div key={key} className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{key}:</span>
                                <span className={`px-2 py-1.5 rounded-md text-[11px] font-semibold tracking-wide shadow-sm ${getStatusColor(String(value))}`}>
                                    {String(value)}
                                </span>
                            </div>
                        )
                    }

                    if (key === 'image_storage_path' && typeof value === 'string') {
                        // Basic attempt to show image if it's a URL
                        const imgUrl = value.startsWith('http') ? value : `https://your-supabase-url.co/storage/v1/object/public/rekt_media/${value}`
                        return (
                            <div key={key} className="flex flex-col gap-1">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{key}</span>
                                <img src={imgUrl} alt="Meme" className="w-full max-w-sm rounded-lg object-contain bg-gray-100 dark:bg-gray-900" />
                                <span className="text-xs text-gray-400 break-all">{value}</span>
                            </div>
                        )
                    }

                    if (key === 'identified_kols') {
                        return <IdentifiedKolsSection key={key} data={value as any[]} />;
                    }

                    if (key === 'engagement_plans') {
                        return <EngagementPlansSection key={key} data={value as any[]} />;
                    }

                    if (key === 'competitors') {
                        return <CompetitorsSection key={key} data={value as any[]} />;
                    }

                    if (key === 'intermediary_metadata') {
                        return <TweetListSection key={key} data={value as any[]} title="Intermediary Metadata" />;
                    }

                    if (key === 'processed_data' || key === 'scored_tweets' || key === 'scraped_tweets') {
                        // The engagement flow also has lists of tweets under various keys, so TweetListSection is reusable!
                        return <TweetListSection key={key} data={value as any[]} title={key.replace(/_/g, ' ')} />;
                    }

                    if (key === 'result_output') {
                        return <ResultOutputSection key={key} data={value} />;
                    }

                    if (key === 'trends_data') {
                        return <TrendsDataSection key={key} data={value} />;
                    }

                    if (key === 'generated_text' || key === 'generated_content') {
                        return <GeneratedTextSection key={key} data={value} />;
                    }

                    return (
                        <div key={key} className="flex flex-col gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{key}</span>
                            <JsonRenderer data={value} />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const CompactCard = ({ item, isSelected, onClick }: { item: any, isSelected: boolean, onClick: () => void }) => {
    const id = item.id || item.run_id || 'Unknown ID';
    let dateStr = '';
    if (item.created_at) {
        const d = new Date(String(item.created_at));
        if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }
    const status = item.status;

    let platforms: string[] = [];
    if (item.configuration?.platforms && Array.isArray(item.configuration.platforms)) {
        platforms = item.configuration.platforms;
    } else if (item.platforms && Array.isArray(item.platforms)) {
        platforms = item.platforms;
    }

    return (
        <div
            onClick={onClick}
            className={`cursor-pointer border p-3 rounded-xl transition-all duration-200 flex flex-col gap-2 ${isSelected
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm ring-1 ring-indigo-500'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/80 shadow-sm hover:shadow'
                }`}
        >
            <div className="flex justify-between items-start">
                <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[60%]" title={id}>{id}</span>
                {dateStr && <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap ml-2">{dateStr}</span>}
            </div>
            {status ? (
                <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ${getStatusColor(String(status))}`}>
                        {String(status).replace(/_/g, ' ')}
                    </span>
                </div>
            ) : platforms.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {platforms.map(p => (
                        <span key={p} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[9px] uppercase tracking-wider font-bold">
                            {p}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="text-[10px] text-gray-400 truncate">
                    {Object.keys(item).filter(k => k !== 'id' && k !== 'run_id' && k !== 'created_at').slice(0, 3).join(', ')}...
                </div>
            )}
        </div>
    )
}

export const WorkflowsPage = () => {
    const { runs, tableData, isLoadingRuns, isLoadingTable, error, fetchTableData, activeTable } = useWorkflows()
    const [activeTab, setActiveTab] = useState<TableName | 'runs'>('runs')
    const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null)
    const [isLauncherOpen, setIsLauncherOpen] = useState(false)

    useEffect(() => {
        if (activeTab !== 'runs' && activeTab !== activeTable) {
            fetchTableData(activeTab as TableName)
        }
    }, [activeTab, activeTable, fetchTableData])

    // Reset selection when switching tabs
    useEffect(() => {
        setSelectedItemIdx(null);
    }, [activeTab]);

    const isLoading = activeTab === 'runs' ? isLoadingRuns : isLoadingTable
    const currentData = activeTab === 'runs' ? runs : tableData

    // Auto-select first item when loaded
    useEffect(() => {
        if (!isLoading && currentData && currentData.length > 0 && selectedItemIdx === null) {
            setSelectedItemIdx(0);
        }
    }, [isLoading, currentData, selectedItemIdx]);

    const selectedItem = selectedItemIdx !== null && currentData ? currentData[selectedItemIdx] : null;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">AI Workflows</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Browse automation runs and derived analytics</p>
                </div>
                <button
                    onClick={() => setIsLauncherOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap"
                >
                    <span>⚡</span> Run New Workflow
                </button>
            </div>

            {error ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center border border-red-200 dark:border-red-800">
                    ⚠️ <span className="ml-2 font-medium">{error.message}</span>
                </div>
            ) : null}

            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
                {TABLE_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === tab.value
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-6">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12 h-[400px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : !currentData || currentData.length === 0 ? (
                    <div className="text-center flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
                        <span className="text-4xl mb-3">👻</span>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No results found.</p>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)] min-h-[600px]">
                        {/* Left List View */}
                        <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar h-full lg:border-r lg:border-gray-200 lg:dark:border-gray-700 lg:pr-4">
                            {currentData.map((item, idx) => (
                                <CompactCard
                                    key={item.id || item.run_id || idx}
                                    item={item}
                                    isSelected={selectedItemIdx === idx}
                                    onClick={() => setSelectedItemIdx(idx)}
                                />
                            ))}
                        </div>

                        {/* Right Detail View */}
                        <div className="w-full lg:w-2/3 xl:w-3/4 overflow-y-auto pr-2 custom-scrollbar h-full pb-10">
                            {selectedItem ? (
                                <DataCard key={selectedItem.id || selectedItem.run_id || selectedItemIdx} item={selectedItem} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-800 border-dashed min-h-[400px]">
                                    <span className="text-4xl mb-3 mt-10">📄</span>
                                    <p>Select a run from the list to view its details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <WorkflowLauncherModal
                isOpen={isLauncherOpen}
                onClose={() => setIsLauncherOpen(false)}
                onSuccess={() => {
                    // Quick hack to refetch runs if we trigger a new one while on the runs tab
                    if (activeTab === 'runs') {
                        // Triggers the useEffect because activeTable isn't strictly changing, 
                        // but resetting the activeTab state could force a re-render
                        setActiveTab('rekt_kol_research') // bounce state
                        setTimeout(() => setActiveTab('runs'), 50)
                    }
                }}
            />
        </div>
    )
}
