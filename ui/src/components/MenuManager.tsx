import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, RefreshCw, Folder, FileText, Edit2, Check, X } from 'lucide-react';

interface MenuNode {
    id: string;
    label: string;
    content?: string;
    children: MenuNode[];
}

interface MenuConfig {
    columns: string[];
    tree: MenuNode[];
}

export const MenuManager: React.FC = () => {
    const [config, setConfig] = useState<MenuConfig>({ columns: [], tree: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Track selected node ID for each column level
    const [selectionPath, setSelectionPath] = useState<string[]>([]);

    // Inputs for adding new items
    const [newColumnName, setNewColumnName] = useState('');
    const [newItemNames, setNewItemNames] = useState<Record<number, string>>({});

    // Editing state
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/menu');
            const data = await res.json();
            if (Array.isArray(data.columns) && Array.isArray(data.tree)) {
                setConfig(data);
            } else {
                setConfig({ columns: ['Services', 'Series', 'Models'], tree: [] });
            }
        } catch (error) {
            console.error('Failed to fetch menu config', error);
            setConfig({ columns: ['Services', 'Series', 'Models'], tree: [] });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/admin/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            alert('Menu configuration saved successfully!');
        } catch (error) {
            console.error('Failed to save menu config', error);
            alert('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    // --- Column Management ---

    const addColumn = () => {
        if (!newColumnName.trim()) return;
        setConfig(prev => ({
            ...prev,
            columns: [...prev.columns, newColumnName.trim()]
        }));
        setNewColumnName('');
    };

    const removeColumn = (index: number) => {
        if (confirm('Removing a column will not delete the data, but it might confuse the layout. Continue?')) {
            setConfig(prev => {
                const newCols = [...prev.columns];
                newCols.splice(index, 1);
                return { ...prev, columns: newCols };
            });
        }
    };

    // --- Node Management ---

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const addNode = (level: number, parentId: string | null) => {
        const name = newItemNames[level]?.trim();
        if (!name) return;

        const newNode: MenuNode = {
            id: generateId(),
            label: name,
            children: []
        };

        setConfig(prev => {
            const newTree = JSON.parse(JSON.stringify(prev.tree)); // Deep copy

            if (parentId === null) {
                newTree.push(newNode);
            } else {
                const findAndAdd = (nodes: MenuNode[]): boolean => {
                    for (const node of nodes) {
                        if (node.id === parentId) {
                            node.children.push(newNode);
                            return true;
                        }
                        if (node.children && findAndAdd(node.children)) return true;
                    }
                    return false;
                };
                findAndAdd(newTree);
            }
            return { ...prev, tree: newTree };
        });

        setNewItemNames(prev => ({ ...prev, [level]: '' }));
    };

    const removeNode = (nodeId: string) => {
        if (!confirm('Delete this item and all its children?')) return;

        setConfig(prev => {
            const newTree = JSON.parse(JSON.stringify(prev.tree));

            const removeRecursive = (nodes: MenuNode[]): boolean => {
                const idx = nodes.findIndex(n => n.id === nodeId);
                if (idx !== -1) {
                    nodes.splice(idx, 1);
                    return true;
                }
                for (const node of nodes) {
                    if (removeRecursive(node.children)) return true;
                }
                return false;
            };

            removeRecursive(newTree);
            return { ...prev, tree: newTree };
        });

        if (selectionPath.includes(nodeId)) {
            const idx = selectionPath.indexOf(nodeId);
            setSelectionPath(prev => prev.slice(0, idx));
        }
    };

    const startEditing = (node: MenuNode) => {
        setEditingNodeId(node.id);
        setEditValue(node.label);
    };

    const cancelEditing = () => {
        setEditingNodeId(null);
        setEditValue('');
    };

    const saveNodeLabel = (nodeId: string) => {
        if (!editValue.trim()) return;

        setConfig(prev => {
            const newTree = JSON.parse(JSON.stringify(prev.tree));
            const findAndUpdate = (nodes: MenuNode[]): boolean => {
                for (const node of nodes) {
                    if (node.id === nodeId) {
                        node.label = editValue.trim();
                        return true;
                    }
                    if (findAndUpdate(node.children)) return true;
                }
                return false;
            };
            findAndUpdate(newTree);
            return { ...prev, tree: newTree };
        });

        setEditingNodeId(null);
        setEditValue('');
    };

    const updateNodeContent = (nodeId: string, content: string) => {
        setConfig(prev => {
            const newTree = JSON.parse(JSON.stringify(prev.tree));
            const findAndUpdate = (nodes: MenuNode[]): boolean => {
                for (const node of nodes) {
                    if (node.id === nodeId) {
                        node.content = content;
                        return true;
                    }
                    if (findAndUpdate(node.children)) return true;
                }
                return false;
            };
            findAndUpdate(newTree);
            return { ...prev, tree: newTree };
        });
    };

    // --- Render Helpers ---

    const getNodesAtLevel = (level: number): MenuNode[] => {
        if (level === 0) return config.tree;

        const parentId = selectionPath[level - 1];
        if (!parentId) return [];

        const findNodes = (nodes: MenuNode[]): MenuNode[] | null => {
            for (const node of nodes) {
                if (node.id === parentId) return node.children;
                if (node.children) {
                    const found = findNodes(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findNodes(config.tree) || [];
    };

    const handleSelect = (level: number, nodeId: string) => {
        const newPath = selectionPath.slice(0, level);
        newPath.push(nodeId);
        setSelectionPath(newPath);
    };

    if (loading) return <div className="p-8 text-center">Loading menu configuration...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 h-[800px] flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-800">Menu Management</h2>
                <div className="flex gap-2">
                    <button onClick={fetchConfig} className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Columns Container */}
            <div className="flex-1 overflow-x-auto flex gap-4 pb-4">
                {config.columns.map((colName, level) => {
                    const nodes = getNodesAtLevel(level);
                    const parentId = level === 0 ? null : selectionPath[level - 1];
                    const isActive = level === 0 || !!parentId;

                    return (
                        <div key={level} className={`w-80 flex-shrink-0 flex flex-col border rounded-lg bg-gray-50 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Column Header */}
                            <div className="p-3 border-b bg-white rounded-t-lg flex justify-between items-center">
                                <span className="font-medium text-gray-700">{colName}</span>
                                <button onClick={() => removeColumn(level)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Add Item Input */}
                            <div className="p-2 border-b bg-white flex gap-2">
                                <input
                                    type="text"
                                    placeholder={`New ${colName}...`}
                                    className="flex-1 px-2 py-1 text-sm border rounded"
                                    value={newItemNames[level] || ''}
                                    onChange={e => setNewItemNames(prev => ({ ...prev, [level]: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && addNode(level, parentId)}
                                />
                                <button
                                    onClick={() => addNode(level, parentId)}
                                    className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* List Items */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {nodes.map(node => {
                                    const isSelected = selectionPath[level] === node.id;
                                    const isEditing = editingNodeId === node.id;

                                    return (
                                        <div key={node.id} className="space-y-2">
                                            <div
                                                onClick={() => !isEditing && handleSelect(level, node.id)}
                                                className={`flex items-center justify-between p-2 rounded cursor-pointer border ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-blue-300'
                                                    }`}
                                            >
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="flex-1 px-2 py-1 text-sm border rounded"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveNodeLabel(node.id);
                                                                if (e.key === 'Escape') cancelEditing();
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <button onClick={(e) => { e.stopPropagation(); saveNodeLabel(node.id); }} className="text-green-600 hover:text-green-700">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); cancelEditing(); }} className="text-red-500 hover:text-red-600">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                            {node.children.length > 0 ? <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" /> : <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                                            <span className="truncate text-sm">{node.label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); startEditing(node); }}
                                                                className="text-gray-300 hover:text-blue-500 p-1"
                                                                title="Rename"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                                                                className="text-gray-300 hover:text-red-500 p-1"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Content Editor for Leaf Nodes (or any node if desired) */}
                                            {isSelected && !isEditing && (
                                                <div className="pl-2">
                                                    <textarea
                                                        className="w-full text-xs p-2 border rounded resize-y"
                                                        rows={3}
                                                        placeholder={`Response content for ${node.label}...`}
                                                        value={node.content || ''}
                                                        onChange={e => updateNodeContent(node.id, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {nodes.length === 0 && (
                                    <div className="text-center text-gray-400 text-xs py-4">No items</div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Add New Column Button */}
                <div className="w-64 flex-shrink-0 flex flex-col justify-start pt-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New Column Name..."
                            className="flex-1 px-3 py-2 border rounded shadow-sm"
                            value={newColumnName}
                            onChange={e => setNewColumnName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addColumn()}
                        />
                        <button
                            onClick={addColumn}
                            className="p-2 bg-white border rounded shadow-sm hover:bg-gray-50 text-gray-600"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
