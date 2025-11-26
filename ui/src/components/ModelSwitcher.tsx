import { useState, useEffect } from 'react';
import { Save, Cpu } from 'lucide-react';

interface Config {
    activeProvider: 'openai' | 'gemini';
    openaiModel: string;
    geminiModel: string;
    systemPrompt: string;
}

export const ModelSwitcher: React.FC = () => {
    const [config, setConfig] = useState<Config>({
        activeProvider: 'openai',
        openaiModel: '',
        geminiModel: '',
        systemPrompt: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('/api/admin/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => console.error('Failed to load config', err));
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            setMessage('Configuration saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to save configuration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
                <Cpu className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">AI Model Configuration</h2>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Active Provider</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setConfig({ ...config, activeProvider: 'openai' })}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${config.activeProvider === 'openai'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="font-semibold">OpenAI</div>
                            <div className="text-xs opacity-75">GPT Models</div>
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, activeProvider: 'gemini' })}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${config.activeProvider === 'gemini'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="font-semibold">Google Gemini</div>
                            <div className="text-xs opacity-75">Gemini Models</div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI Model Name</label>
                        <input
                            type="text"
                            value={config.openaiModel}
                            onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                            placeholder="e.g. gpt-4o-mini"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty to use server default.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gemini Model Name</label>
                        <input
                            type="text"
                            value={config.geminiModel}
                            onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                            placeholder="e.g. gemini-1.5-flash"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty to use server default.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                    <textarea
                        value={config.systemPrompt}
                        onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                        placeholder="You are K-Mobile Agent, a helpful assistant for phone repair services..."
                        rows={4}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Customize the AI's behavior and personality. Leave empty to use default.</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                        {message}
                    </span>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
