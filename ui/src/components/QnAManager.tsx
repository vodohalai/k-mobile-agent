import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface QnA {
    id: string;
    question: string;
    answer: string;
    created_at: number;
}

export const QnAManager: React.FC = () => {
    const [qnas, setQnas] = useState<QnA[]>([]);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [adding, setAdding] = useState(false);
    const [isListExpanded, setIsListExpanded] = useState(true);

    const fetchQnAs = async () => {
        try {
            const res = await fetch('/api/admin/qna');
            const data = await res.json();
            setQnas(data);
        } catch (error) {
            console.error('Failed to fetch Q&As', error);
        }
    };

    useEffect(() => {
        fetchQnAs();
    }, []);

    const handleAdd = async () => {
        if (!question.trim() || !answer.trim()) {
            alert('Please enter both question and answer');
            return;
        }

        setAdding(true);
        try {
            await fetch('/api/admin/qna', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, answer }),
            });
            setQuestion('');
            setAnswer('');
            await fetchQnAs();
        } catch (error) {
            console.error('Failed to add Q&A', error);
            alert('Failed to add Q&A');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Q&A?')) return;
        try {
            await fetch(`/api/admin/qna/${id}`, { method: 'DELETE' });
            setQnas(qnas.filter(q => q.id !== id));
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Q&A Management</h2>
                </div>
                <button onClick={fetchQnAs} className="text-gray-500 hover:text-gray-700">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="mb-6 space-y-3 bg-purple-50 p-4 rounded-lg border border-purple-100">
                <h3 className="text-sm font-medium text-purple-800">Add New Q&A Pair</h3>
                <input
                    type="text"
                    placeholder="Question (e.g., What are your business hours?)"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <textarea
                    placeholder="Answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {adding ? 'Adding...' : 'Add Q&A'}
                </button>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Existing Q&A Pairs ({qnas.length})</h3>
                    <button
                        onClick={() => setIsListExpanded(!isListExpanded)}
                        className="text-gray-500 hover:text-purple-600 flex items-center gap-1 text-sm"
                    >
                        {isListExpanded ? (
                            <>
                                <ChevronUp className="w-4 h-4" />
                                Collapse
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4" />
                                Expand
                            </>
                        )}
                    </button>
                </div>

                {isListExpanded && (
                    qnas.length === 0 ? (
                        <p className="text-center text-gray-400 py-4">No Q&A pairs yet.</p>
                    ) : (
                        qnas.map((qna) => (
                            <div key={qna.id} className="p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-800 mb-1">Q: {qna.question}</p>
                                        <p className="text-sm text-gray-600">A: {qna.answer}</p>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(qna.created_at).toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(qna.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
};
