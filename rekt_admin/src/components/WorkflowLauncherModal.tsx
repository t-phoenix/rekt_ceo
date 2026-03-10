import { useState, useEffect } from 'react';
import { workflowsApi } from '../services/workflowsApi';

type WorkflowOption = {
    id: string;
    label: string;
    endpoint: string;
    icon: string;
};

const WORKFLOW_OPTIONS: WorkflowOption[] = [
    { id: 'trend', label: 'Trend Research', endpoint: 'trend-research', icon: '📈' },
    { id: 'kol', label: 'KOL Discovery', endpoint: 'kol-research', icon: '👥' },
    { id: 'competition', label: 'Competition Analysis', endpoint: 'competition-research', icon: '🎯' },
    { id: 'text', label: 'Text Content Gen', endpoint: 'text-content', icon: '📝' },
    { id: 'meme', label: 'Meme Generation', endpoint: 'meme-generation', icon: '🖼️' },
    { id: 'engagement', label: 'Twitter Engagement', endpoint: 'twitter-engagement', icon: '🐦' },
];

const PLATFORMS = ['twitter', 'instagram', 'linkedin'];

export const WorkflowLauncherModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) => {
    const [processState, setProcessState] = useState<'idle' | 'triggering' | 'polling' | 'success'>('idle');
    const [runId, setRunId] = useState<string>('');
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>('trend');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setProcessState('idle');
            setErrorMsg('');
            setRunId('');
        }
    }, [isOpen]);

    // Shared Fields
    const [platforms, setPlatforms] = useState<string[]>(['twitter']);

    // Trend Fields
    const [limit, setLimit] = useState(5);
    const [timeframe, setTimeframe] = useState('7d');
    const [trendKeywords, setTrendKeywords] = useState('');

    // KOL Fields
    const [targetNiche, setTargetNiche] = useState('');
    const [minFollowers, setMinFollowers] = useState<string>('');
    const [maxFollowers, setMaxFollowers] = useState<string>('');

    // Competition Fields
    const [competitorHandles, setCompetitorHandles] = useState('');
    const [analysisDepth, setAnalysisDepth] = useState('basic');

    // Text Content Fields
    const [businessContext, setBusinessContext] = useState('');
    const [tone, setTone] = useState('');

    // Meme Fields
    const [theme, setTheme] = useState('');
    const [templatePreference, setTemplatePreference] = useState('');
    const [memeTone, setMemeTone] = useState('');
    const [memeUserText, setMemeUserText] = useState('');
    const [memeTargetPlatform, setMemeTargetPlatform] = useState('');

    // Engagement Fields
    const [targetAccounts, setTargetAccounts] = useState('');
    const [replyTone, setReplyTone] = useState('');

    if (!isOpen) return null;

    const togglePlatform = (p: string) => {
        setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    };

    const parseCommaSeparated = (str: string) => {
        const arr = str.split(',').map(s => s.trim()).filter(s => s.length > 0);
        return arr.length > 0 ? arr : undefined;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessState('triggering');
        setErrorMsg('');

        try {
            const w = WORKFLOW_OPTIONS.find(opt => opt.id === selectedWorkflow);
            if (!w) throw new Error('Invalid workflow selected');

            let payload: any = { platforms: platforms.length > 0 ? platforms : undefined };

            if (selectedWorkflow === 'trend') {
                payload = { ...payload, limit, timeframe, custom_keywords: parseCommaSeparated(trendKeywords) };
            } else if (selectedWorkflow === 'kol') {
                payload = {
                    ...payload,
                    target_niche: targetNiche || undefined,
                    min_followers: minFollowers ? parseInt(minFollowers) : undefined,
                    max_followers: maxFollowers ? parseInt(maxFollowers) : undefined
                };
            } else if (selectedWorkflow === 'competition') {
                payload = {
                    ...payload,
                    competitor_handles: parseCommaSeparated(competitorHandles),
                    analysis_depth: analysisDepth
                };
            } else if (selectedWorkflow === 'text') {
                payload = {
                    ...payload,
                    business_context: businessContext || undefined,
                    tone: tone || undefined
                };
            } else if (selectedWorkflow === 'meme') {
                payload = {
                    ...payload,
                    user_text: memeUserText || undefined,
                    platform: memeTargetPlatform || undefined,
                    theme: theme || undefined,
                    template_preference: templatePreference || undefined,
                    tone: memeTone || undefined
                };
            } else if (selectedWorkflow === 'engagement') {
                payload = {
                    ...payload,
                    target_accounts: parseCommaSeparated(targetAccounts),
                    reply_tone: replyTone || undefined
                };
            }

            // Clean up undefined top levels
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            const { run_id } = await workflowsApi.triggerWorkflow(w.endpoint, payload);
            setRunId(run_id);
            setProcessState('polling');

            // Inform parent so it updates the run list on the left side to show the "running" state immediately
            onSuccess();

            let attempts = 0;
            let finalRun = null;
            while (attempts < 60) {
                await new Promise(r => setTimeout(r, 3000)); // poll every 3 seconds for 3 minutes

                const runs = await workflowsApi.getRuns({ limit: 50 });
                const myRun = runs.find(r => r.id === run_id);
                if (myRun && myRun.status !== 'running') {
                    finalRun = myRun;
                    break;
                }
                attempts++;
            }

            if (!finalRun) {
                throw new Error("Workflow is taking longer than expected. You can close this window and check back later.");
            }

            setProcessState('success');
            onSuccess(); // Update list again with final fully-completed status

        } catch (err: any) {
            setErrorMsg(err.message || 'An unknown error occurred.');
            setProcessState('idle');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>⚡</span> Run AI Workflow
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                    {errorMsg && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    {processState === 'idle' && (
                        <form id="workflow-form" onSubmit={handleSubmit} className="space-y-6">

                            {/* Workflow Selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select Pipeline</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {WORKFLOW_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSelectedWorkflow(opt.id)}
                                            className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${selectedWorkflow === opt.id
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-200 dark:hover:border-indigo-700'
                                                }`}
                                        >
                                            <span className="text-lg">{opt.icon}</span>
                                            <span className="font-medium text-sm">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-gray-700" />

                            {/* Dynamic Forms */}
                            <div className="space-y-4">

                                {/* Trend Research */}
                                {selectedWorkflow === 'trend' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Limit (Focus Size)</label>
                                                <input type="range" min="1" max="20" value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="w-full accent-indigo-600" />
                                                <div className="text-right text-xs text-gray-500 font-mono mt-1">{limit} Trends</div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Timeframe</label>
                                                <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                                    <option value="24h">Last 24 Hours</option>
                                                    <option value="3d">Last 3 Days</option>
                                                    <option value="7d">Last 7 Days</option>
                                                    <option value="30d">Last 30 Days</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Forced Custom Keywords (Optional)</label>
                                            <input type="text" placeholder="e.g. $REKT, memecoin, AI" value={trendKeywords} onChange={e => setTrendKeywords(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                        </div>
                                    </>
                                )}

                                {/* KOL Research */}
                                {selectedWorkflow === 'kol' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Target Niche Override (Optional)</label>
                                            <input type="text" placeholder="e.g. pumpfun degens, solana validators" value={targetNiche} onChange={e => setTargetNiche(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Min Followers</label>
                                                <input type="number" placeholder="1000" value={minFollowers} onChange={e => setMinFollowers(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Max Followers</label>
                                                <input type="number" placeholder="500000" value={maxFollowers} onChange={e => setMaxFollowers(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Competition Research */}
                                {selectedWorkflow === 'competition' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Specific Handles (Comma separated, overrides DB)</label>
                                            <input type="text" placeholder="e.g. @elonmusk, @blknoiz06" value={competitorHandles} onChange={e => setCompetitorHandles(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Analysis Depth</label>
                                            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg w-fit">
                                                <button type="button" onClick={() => setAnalysisDepth('basic')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisDepth === 'basic' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>Basic</button>
                                                <button type="button" onClick={() => setAnalysisDepth('deep')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisDepth === 'deep' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>Deep Analysis</button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Text Content */}
                                {selectedWorkflow === 'text' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Context / Manual Knowledge (Optional)</label>
                                            <textarea rows={3} placeholder="Inject explicit knowledge to strictly dictate the content of the post..." value={businessContext} onChange={e => setBusinessContext(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Voice / Tone</label>
                                            <input type="text" placeholder="e.g. savage, professional, unhinged, informative" value={tone} onChange={e => setTone(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                        </div>
                                    </>
                                )}

                                {/* Meme Generation */}
                                {selectedWorkflow === 'meme' && (
                                    <>
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/40">
                                            <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1">Direct User Text (Overrides Trending/Theme)</label>
                                            <textarea rows={2} placeholder="e.g. Just bought the top again, someone take my phone away." value={memeUserText} onChange={e => setMemeUserText(e.target.value)} className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-700/50 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"></textarea>

                                            <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400/80 mb-1">Mock Platform for User Text Format</label>
                                            <select value={memeTargetPlatform} onChange={e => setMemeTargetPlatform(e.target.value)} className="w-full p-2 text-sm border border-indigo-200 dark:border-indigo-700/50 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                                <option value="">None (Auto-detect)</option>
                                                <option value="twitter">Twitter</option>
                                                <option value="linkedin">LinkedIn</option>
                                                <option value="instagram">Instagram</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-4 my-2">
                                            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Or Generate via Theme</span>
                                            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Meme Theme Prompt (Optional)</label>
                                            <input type="text" placeholder="e.g. 'when the dev rugs', 'bull market vibes'" value={theme} onChange={e => setTheme(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Tone</label>
                                                <input type="text" placeholder="e.g. sarcastic, dark" value={memeTone} onChange={e => setMemeTone(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Template Category</label>
                                                <select value={templatePreference} onChange={e => setTemplatePreference(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                                    <option value="">Auto-Select (AI Choice)</option>
                                                    <option value="reaction_memes">Reaction Memes</option>
                                                    <option value="success_failure">Success/Failure</option>
                                                    <option value="two_buttons">Two Buttons/Choices</option>
                                                    <option value="comparison">Comparisons</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Engagement */}
                                {selectedWorkflow === 'engagement' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Target Account Handles (Comma separated, overrides organic search)</label>
                                            <input type="text" placeholder="e.g. @cobie, @vitalikbuterin" value={targetAccounts} onChange={e => setTargetAccounts(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Reply Tone / Persona Override</label>
                                            <input type="text" placeholder="e.g. grim reaper, overly supportive, shill" value={replyTone} onChange={e => setReplyTone(e.target.value)} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                        </div>
                                    </>
                                )}

                            </div>

                            {/* Shared Platforms */}
                            {selectedWorkflow !== 'competition' && selectedWorkflow !== 'kol' && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <label className="block text-xs font-semibold text-gray-500 mb-2">Target Platforms</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PLATFORMS.map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => togglePlatform(p)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors flex items-center gap-1.5 ${platforms.includes(p)
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                                    }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${platforms.includes(p) ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </form>
                    )}

                    {(processState === 'triggering' || processState === 'polling') && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-6"></div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {processState === 'triggering' ? 'Igniting Workflow...' : 'Executing AI Agents...'}
                            </h4>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                {processState === 'polling'
                                    ? `Polling for completion (Run ID: ${runId.slice(0, 8)}...). The LangChain graph takes around 15-45 seconds to finish processing.`
                                    : 'Submitting configuration to API...'}
                            </p>
                        </div>
                    )}

                    {processState === 'success' && (
                        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center text-4xl mb-6 ring-8 ring-green-50 dark:ring-green-900/20">
                                ✓
                            </div>
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Workflow Completed!</h4>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                                Run ID <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{runId}</span> has successfully finished executing.
                                The output has been safely recorded to the database.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                    {processState === 'idle' && (
                        <>
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="workflow-form"
                                disabled={selectedWorkflow !== 'competition' && selectedWorkflow !== 'kol' && platforms.length === 0}
                                className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition-all bg-indigo-600 hover:bg-indigo-700 hover:shadow-md`}
                            >
                                Run Workflow 🚀
                            </button>
                        </>
                    )}

                    {(processState === 'triggering' || processState === 'polling') && (
                        <button type="button" disabled className="px-6 py-2 text-sm font-bold text-white rounded-lg bg-indigo-400 cursor-not-allowed">
                            Processing...
                        </button>
                    )}

                    {processState === 'success' && (
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-white rounded-lg transition-all bg-green-600 hover:bg-green-700 hover:shadow-md">
                            Close & View Results
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};
