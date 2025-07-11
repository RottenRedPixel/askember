import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Code, Plus, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilmSlate } from 'phosphor-react';

export default function StoryCutStudio() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [blocks, setBlocks] = useState([]);
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [viewMode, setViewMode] = useState('visual'); // 'visual' or 'code'
    const [selectedEffects, setSelectedEffects] = useState({}); // Track selected checkboxes (can be multiple per block)
    const [effectDirections, setEffectDirections] = useState({}); // Track effect directions (in/out, left/right)

    // Mock story cut data
    const [storyCut] = useState({
        id: 1,
        title: "A Moment of Unexpected Laughter",
        style: "narrative",
        duration: 45,
        word_count: 89
    });

    // Mock data for testing - matches existing script
    useEffect(() => {
        const initialBlocks = [
            {
                id: 1,
                type: 'start',
                title: 'Start Story'
            },
            {
                id: 2,
                type: 'voice',
                voiceTag: 'Ember Voice (Lily)',
                content: 'In an unexpected corner of the parking lot, laughter echoed around the washing machines.',
                voiceType: 'ember',
                avatarUrl: 'https://i.pravatar.cc/40?img=2', // Mock avatar URL
                messageType: 'AI Voice'
            },
            {
                id: 3,
                type: 'media',
                mediaName: 'Ember Image',
                mediaUrl: 'https://picsum.photos/400/300?random=1', // Same ember image
                effect: null,
                duration: 0
            },
            {
                id: 4,
                type: 'voice',
                voiceTag: 'Narrator (George)',
                content: 'It was a moment that defied explanation but brought joy.',
                voiceType: 'narrator',
                avatarUrl: 'https://i.pravatar.cc/40?img=3', // Mock avatar URL
                messageType: 'AI Voice'
            },

            {
                id: 6,
                type: 'voice',
                voiceTag: 'Amado',
                content: 'We really have no idea what it was, but it was funny.',
                voiceType: 'contributor',
                avatarUrl: 'https://i.pravatar.cc/40?img=1', // Mock avatar URL
                messageType: 'Audio Message' // Can be 'Audio Message' or 'Text Message'
            },
            {
                id: 7,
                type: 'hold',
                effect: 'COLOR:#000000',
                duration: 4.0,
                color: '#000000'
            },
            {
                id: 8,
                type: 'end',
                title: 'End Story'
            }
        ];

        setBlocks(initialBlocks);

        // Initialize selected effects for blocks that have effects by default
        const initialEffects = {};
        const initialDirections = {};
        initialBlocks.forEach(block => {
            if (block.type === 'hold') {
                initialEffects[`hold-${block.id}`] = ['fade'];
            }
            // Set default directions for all effects
            initialDirections[`fade-${block.id}`] = 'in';
            initialDirections[`pan-${block.id}`] = 'left';
            initialDirections[`zoom-${block.id}`] = 'in';
        });
        setSelectedEffects(initialEffects);
        setEffectDirections(initialDirections);
    }, []);

    const generateScript = () => {
        return blocks.map(block => {
            switch (block.type) {
                case 'media':
                    let mediaLine = `[[MEDIA]] <name="${block.mediaName}">`;
                    if (block.effect && block.duration > 0) {
                        mediaLine += ` <${block.effect}:duration=${block.duration}>`;
                    }
                    return mediaLine;
                case 'voice':
                    return `[${block.voiceTag}] ${block.content}`;
                case 'hold':
                    return `[[HOLD]] <${block.effect},duration=${block.duration}>`;
                default:
                    return '';
            }
        }).join('\n\n');
    };

    // Helper functions
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return `${secs}s`;
    };

    const getStyleDisplayName = (style) => {
        const styleMap = {
            'narrative': 'Narrative',
            'documentary': 'Documentary',
            'conversational': 'Conversational',
            'dramatic': 'Dramatic',
            'humorous': 'Humorous'
        };
        return styleMap[style] || style;
    };

    // Group blocks by type for display
    const mediaBlocks = blocks.filter(block => block.type === 'media');
    const voiceBlocks = blocks.filter(block => block.type === 'voice');
    const holdBlocks = blocks.filter(block => block.type === 'hold');

    return (
        <div className="min-h-screen bg-white">
            {/* Header - matches EmberDetail style */}
            <div className="bg-white sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/embers/${id}`)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode('visual')}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${viewMode === 'visual'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                <Eye className="w-4 h-4 inline mr-1" />
                                Visual
                            </button>
                            <button
                                onClick={() => setViewMode('code')}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${viewMode === 'code'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                <Code className="w-4 h-4 inline mr-1" />
                                Code
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - matches StoryCutDetailContent layout */}
            <div className="max-w-4xl mx-auto px-4 pb-6">
                {viewMode === 'visual' ? (
                    <div className="space-y-4">
                        {/* Timeline Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <FilmSlate size={20} className="text-blue-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">{storyCut.title}</h3>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {getStyleDisplayName(storyCut.style)}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {formatDuration(storyCut.duration)}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {storyCut.word_count} words
                                        </Badge>
                                    </div>
                                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                        <Plus className="w-4 h-4" />
                                        Add Block
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* All Blocks in Chronological Order */}
                        <div className="space-y-3">
                            {blocks.map((block, index) => {
                                // Determine styling based on block type
                                let bgColor, borderColor, textColor, ringColor, hoverColor;

                                if (block.type === 'media') {
                                    bgColor = 'bg-blue-50';
                                    borderColor = 'border-blue-200';
                                    textColor = 'text-blue-600';
                                    ringColor = 'ring-blue-500';
                                    hoverColor = 'hover:bg-blue-100';
                                } else if (block.type === 'voice') {
                                    if (block.voiceType === 'ember') {
                                        bgColor = 'bg-purple-50';
                                        borderColor = 'border-purple-200';
                                        textColor = 'text-purple-600';
                                        ringColor = 'ring-purple-500';
                                        hoverColor = 'hover:bg-purple-100';
                                    } else if (block.voiceType === 'narrator') {
                                        bgColor = 'bg-yellow-50';
                                        borderColor = 'border-yellow-200';
                                        textColor = 'text-yellow-600';
                                        ringColor = 'ring-yellow-500';
                                        hoverColor = 'hover:bg-yellow-100';
                                    } else if (block.voiceType === 'contributor') {
                                        bgColor = 'bg-green-50';
                                        borderColor = 'border-green-200';
                                        textColor = 'text-green-600';
                                        ringColor = 'ring-green-500';
                                        hoverColor = 'hover:bg-green-100';
                                    }
                                } else if (block.type === 'hold') {
                                    bgColor = 'bg-gray-50';
                                    borderColor = 'border-gray-200';
                                    textColor = 'text-gray-600';
                                    ringColor = 'ring-gray-500';
                                    hoverColor = 'hover:bg-gray-100';
                                } else if (block.type === 'start' || block.type === 'end') {
                                    bgColor = 'bg-gray-200';
                                    borderColor = 'border-gray-400';
                                    textColor = 'text-gray-800';
                                    ringColor = 'ring-gray-500';
                                    hoverColor = 'hover:bg-gray-300';
                                }

                                return (
                                    <div
                                        key={block.id}
                                        className={`p-3 ${bgColor} rounded-lg border ${borderColor} cursor-pointer transition-all ${selectedBlock?.id === block.id ? `ring-2 ${ringColor}` : hoverColor}`}
                                        onClick={() => setSelectedBlock(block)}
                                    >
                                        {block.type === 'media' && (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />

                                                        {/* Media Thumbnail */}
                                                        {block.mediaUrl && (
                                                            <div className="flex-shrink-0">
                                                                <img
                                                                    src={block.mediaUrl}
                                                                    alt={block.mediaName}
                                                                    className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                    }}
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-semibold ${textColor}`}>{block.mediaName}</span>
                                                            {block.effect && (
                                                                <span className={`text-xs ${bgColor.replace('50', '100')} ${textColor.replace('600', '800')} px-2 py-1 rounded`}>
                                                                    {block.effect} {block.duration > 0 ? `${block.duration}s` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                        Media File
                                                    </span>
                                                </div>

                                                {/* Visual Effect Radio Buttons */}
                                                <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                value="fade"
                                                                defaultChecked={block.effect && block.effect.includes('FADE')}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                                                onChange={(e) => {
                                                                    setSelectedEffects(prev => {
                                                                        const blockKey = `effect-${block.id}`;
                                                                        const currentEffects = prev[blockKey] || [];

                                                                        if (e.target.checked) {
                                                                            return {
                                                                                ...prev,
                                                                                [blockKey]: [...currentEffects, 'fade']
                                                                            };
                                                                        } else {
                                                                            return {
                                                                                ...prev,
                                                                                [blockKey]: currentEffects.filter(effect => effect !== 'fade')
                                                                            };
                                                                        }
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-sm text-blue-700">Fade</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                value="pan"
                                                                defaultChecked={block.effect && block.effect.includes('PAN')}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                                                onChange={(e) => {
                                                                    setSelectedEffects(prev => {
                                                                        const blockKey = `effect-${block.id}`;
                                                                        const currentEffects = prev[blockKey] || [];

                                                                        if (e.target.checked) {
                                                                            return {
                                                                                ...prev,
                                                                                [blockKey]: [...currentEffects, 'pan']
                                                                            };
                                                                        } else {
                                                                            return {
                                                                                ...prev,
                                                                                [blockKey]: currentEffects.filter(effect => effect !== 'pan')
                                                                            };
                                                                        }
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-sm text-blue-700">Pan</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                value="zoom"
                                                                defaultChecked={block.effect && block.effect.includes('ZOOM')}
                                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                                                onChange={(e) => {
                                                                    setSelectedEffects(prev => {
                                                                        const blockKey = `effect-${block.id}`;
                                                                        const currentEffects = prev[blockKey] || [];

                                                                        if (e.target.checked) {
                                                                            return {
                                                                                ...prev,
                                                                                [blockKey]: [...currentEffects, 'zoom']
                                                                            };
                                                                        } else {
                                                                            return {
                                                                                ...prev,
                                                                                [blockKey]: currentEffects.filter(effect => effect !== 'zoom')
                                                                            };
                                                                        }
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-sm text-blue-700">Zoom</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Effect Duration Sliders */}
                                                {selectedEffects[`effect-${block.id}`] && selectedEffects[`effect-${block.id}`].length > 0 && (
                                                    <div className="mt-3 space-y-3">
                                                        {selectedEffects[`effect-${block.id}`].includes('fade') && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700">Fade Duration</span>
                                                                        <span className="text-sm text-blue-700">3.0s</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max="5"
                                                                        step="0.1"
                                                                        defaultValue="3.0"
                                                                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                                <div className="flex-shrink-0 flex flex-col items-end">
                                                                    <div className="text-xs text-blue-700 mb-1">
                                                                        {effectDirections[`fade-${block.id}`] === 'out' ? 'OUT' : 'IN'}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEffectDirections(prev => ({
                                                                                ...prev,
                                                                                [`fade-${block.id}`]: prev[`fade-${block.id}`] === 'out' ? 'in' : 'out'
                                                                            }));
                                                                        }}
                                                                        className="w-12 h-6 rounded-full transition-colors duration-200 relative bg-blue-600"
                                                                    >
                                                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${effectDirections[`fade-${block.id}`] === 'out'
                                                                            ? 'translate-x-6'
                                                                            : 'translate-x-0.5'
                                                                            }`} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedEffects[`effect-${block.id}`].includes('pan') && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700">Pan Duration</span>
                                                                        <span className="text-sm text-blue-700">4.0s</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max="5"
                                                                        step="0.1"
                                                                        defaultValue="4.0"
                                                                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                                <div className="flex-shrink-0 flex flex-col items-end">
                                                                    <div className="text-xs text-blue-700 mb-1">
                                                                        {effectDirections[`pan-${block.id}`] === 'right' ? 'RIGHT' : 'LEFT'}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEffectDirections(prev => ({
                                                                                ...prev,
                                                                                [`pan-${block.id}`]: prev[`pan-${block.id}`] === 'right' ? 'left' : 'right'
                                                                            }));
                                                                        }}
                                                                        className="w-12 h-6 rounded-full transition-colors duration-200 relative bg-blue-600"
                                                                    >
                                                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${effectDirections[`pan-${block.id}`] === 'right'
                                                                            ? 'translate-x-6'
                                                                            : 'translate-x-0.5'
                                                                            }`} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedEffects[`effect-${block.id}`].includes('zoom') && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700">Zoom Duration</span>
                                                                        <span className="text-sm text-blue-700">3.5s</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max="5"
                                                                        step="0.1"
                                                                        defaultValue="3.5"
                                                                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                                <div className="flex-shrink-0 flex flex-col items-end">
                                                                    <div className="text-xs text-blue-700 mb-1">
                                                                        {effectDirections[`zoom-${block.id}`] === 'out' ? 'OUT' : 'IN'}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEffectDirections(prev => ({
                                                                                ...prev,
                                                                                [`zoom-${block.id}`]: prev[`zoom-${block.id}`] === 'out' ? 'in' : 'out'
                                                                            }));
                                                                        }}
                                                                        className="w-12 h-6 rounded-full transition-colors duration-200 relative bg-blue-600"
                                                                    >
                                                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${effectDirections[`zoom-${block.id}`] === 'out'
                                                                            ? 'translate-x-6'
                                                                            : 'translate-x-0.5'
                                                                            }`} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {block.type === 'voice' && (
                                            <>
                                                {block.avatarUrl ? (
                                                    <>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                                                                <div className="flex items-center gap-2">
                                                                    <img
                                                                        src={block.avatarUrl}
                                                                        alt={block.voiceTag}
                                                                        className={`w-8 h-8 rounded-full object-cover border-2 ${block.voiceType === 'contributor'
                                                                            ? 'border-green-300'
                                                                            : block.voiceType === 'narrator'
                                                                                ? 'border-yellow-300'
                                                                                : 'border-purple-300'
                                                                            }`}
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                        }}
                                                                    />
                                                                    <span className={`font-semibold ${textColor}`}>{block.voiceTag}</span>
                                                                </div>
                                                            </div>
                                                            {block.messageType && (
                                                                <span className={`text-xs px-2 py-1 rounded-full ${block.voiceType === 'contributor'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : block.voiceType === 'narrator'
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : 'bg-purple-100 text-purple-800'
                                                                    }`}>
                                                                    {block.messageType}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`${textColor.replace('600', '700')} text-left`} style={{ marginLeft: '24px' }}>{block.content}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                                                            <span className={`font-semibold ${textColor}`}>[{block.voiceTag}]</span>
                                                        </div>
                                                        <p className={`${textColor.replace('600', '700')} ml-6`}>{block.content}</p>
                                                    </>
                                                )}

                                                {block.voiceType === 'contributor' && (
                                                    <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                        <div className="flex items-center gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`audio-${block.id}`}
                                                                    value="recorded"
                                                                    defaultChecked={true}
                                                                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                                />
                                                                <span className="text-sm text-green-700">Recorded</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`audio-${block.id}`}
                                                                    value="synth"
                                                                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                                />
                                                                <span className="text-sm text-green-700">Synth</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`audio-${block.id}`}
                                                                    value="text"
                                                                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                                />
                                                                <span className="text-sm text-green-700">Text Response</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {block.type === 'hold' && (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                                                        <div
                                                            className="w-8 h-8 rounded border border-gray-300"
                                                            style={{ backgroundColor: block.color }}
                                                        />
                                                        <span className={`font-semibold ${textColor}`}>Hold Color (FF6600)</span>
                                                    </div>
                                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                                        Screen Effect
                                                    </span>
                                                </div>

                                                {/* Fade Radio Button */}
                                                <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                value="fade"
                                                                defaultChecked={true}
                                                                className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500 rounded"
                                                                onChange={(e) => {
                                                                    setSelectedEffects(prev => {
                                                                        const blockKey = `hold-${block.id}`;
                                                                        const currentEffects = prev[blockKey] || [];

                                                                        if (e.target.checked) {
                                                                            return {
                                                                                ...prev,
                                                                                [blockKey]: [...currentEffects, 'fade']
                                                                            };
                                                                        } else {
                                                                            return {
                                                                                ...prev,
                                                                                [blockKey]: currentEffects.filter(effect => effect !== 'fade')
                                                                            };
                                                                        }
                                                                    });
                                                                }}
                                                            />
                                                            <span className="text-sm text-gray-700">Fade</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Hold Fade Duration Slider */}
                                                {selectedEffects[`hold-${block.id}`] && selectedEffects[`hold-${block.id}`].includes('fade') && (
                                                    <div className="mt-3" style={{ marginLeft: '24px', marginRight: '24px' }}>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm text-gray-700">Fade Duration</span>
                                                                <span className="text-sm text-gray-700">4.0s</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="5"
                                                                step="0.1"
                                                                defaultValue="4.0"
                                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {(block.type === 'start' || block.type === 'end') && (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-semibold ${textColor}`}>{block.title}</span>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${block.type === 'start' ? 'bg-gray-300 text-gray-900' : 'bg-gray-300 text-gray-900'}`}>
                                                        {block.type === 'start' ? 'Story Start' : 'Story End'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 flex justify-center gap-3">
                            <Button
                                onClick={() => navigate(`/embers/${id}`)}
                                variant="outline"
                                size="lg"
                                className="px-6 py-3 h-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    // TODO: Implement update functionality
                                    console.log('Update story cut with:', generateScript());
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 h-auto"
                                size="lg"
                            >
                                <Save className="w-5 h-5 mr-2" />
                                Update Story Cut
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Code View - matches Complete Script styling */
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900">Generated Script</h3>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="text-gray-700 leading-relaxed font-mono text-sm">
                                <pre className="whitespace-pre-wrap">{generateScript()}</pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 