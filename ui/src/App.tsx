
import { ModelSwitcher } from './components/ModelSwitcher';
import { DocumentUpload } from './components/DocumentUpload';
import { QnAManager } from './components/QnAManager';
import { MenuManager } from './components/MenuManager';
import { Bot } from 'lucide-react';

function App() {
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">K-Mobile Agent</h1>
                        <p className="text-gray-500">Admin Dashboard</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-8">
                    <ModelSwitcher />
                    <MenuManager />
                    <QnAManager />
                    <DocumentUpload />
                </div>
            </div>
        </div>
    );
}

export default App;
