import React from 'react';
import { LayoutDashboard, LogOut, RefreshCw, User } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
    sidebarContent?: React.ReactNode;
    isRefreshing?: boolean;
    lastUpdated?: Date;
    onRefresh?: () => void;
    onLogout?: () => void;
    selectedPortfolioName?: string;
    onViewFullHoldings?: (() => void) | null;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    sidebarContent,
    isRefreshing = false,
    lastUpdated,
    onRefresh,
    onLogout,
    selectedPortfolioName
}) => {
    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-orange-100 selection:text-orange-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm">
                {/* Sidebar Header */}
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
                                Portfolio
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Sidebar Content (Portfolios List) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {sidebarContent}
                </div>

                {/* User Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                <User className="w-5 h-5 text-slate-400" />
                            </div>
                        </div>
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
                {/* Top Header */}
                <header className="h-20 flex items-center justify-between px-8 border-b border-slate-200 bg-white/80 backdrop-blur-sm z-10">
                    <div className="flex items-center space-x-4">
                        {/* Breadcrumbs or Page Title */}
                        <h2 className="text-lg font-medium text-slate-400">
                            {selectedPortfolioName || 'Dashboard Overview'}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Last Updated Status */}
                        <div className="flex items-center space-x-3 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800/50 backdrop-blur-md">
                            <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                <span className="text-xs font-medium text-slate-400">
                                    {isRefreshing ? 'Syncing...' : `Updated ${lastUpdated?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </span>
                            </div>
                            <button
                                onClick={onRefresh}
                                className={`p-1.5 rounded-full hover:bg-slate-800 transition-colors ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
