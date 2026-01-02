// Path: frontend/src/components/dashboard/DashboardSidebar.tsx

import React from 'react';
import { X, Eye, EyeOff, RotateCcw } from 'lucide-react';

interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
}

interface WidgetConfig {
    id: string;
    title: string;
    icon: React.ReactNode;
    defaultLayout: LayoutItem;
}

interface DashboardSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    widgets: WidgetConfig[];
    activeWidgetIds: string[];
    onToggleWidget: (widgetId: string) => void;
    onResetLayout: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    isOpen,
    onClose,
    widgets,
    activeWidgetIds,
    onToggleWidget,
    onResetLayout,
}) => {
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}
            
            {/* Sidebar */}
            <div 
                className={`
                    fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border 
                    flex flex-col z-50 shadow-2xl
                    transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h3 className="font-semibold">Dashboard Widgets</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Toggle widgets to customize your view
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                {/* Widget List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {widgets.map(widget => {
                        const isActive = activeWidgetIds.includes(widget.id);
                        return (
                            <button
                                key={widget.id}
                                onClick={() => onToggleWidget(widget.id)}
                                className={`
                                    w-full flex items-center gap-3 p-3 rounded-xl border-2 
                                    transition-all text-left group
                                    ${isActive 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-transparent bg-muted/30 hover:bg-muted hover:border-border'
                                    }
                                `}
                            >
                                <div className={`
                                    p-2 rounded-lg transition-colors
                                    ${isActive 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-background text-muted-foreground group-hover:text-foreground'
                                    }
                                `}>
                                    {widget.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium block truncate">
                                        {widget.title}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        {isActive ? 'Visible' : 'Hidden'}
                                    </span>
                                </div>
                                <div className="text-muted-foreground">
                                    {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Footer Actions */}
                <div className="p-4 border-t border-border space-y-2">
                    <button
                        onClick={onResetLayout}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                    >
                        <RotateCcw size={14} />
                        Reset to Default Layout
                    </button>
                </div>
            </div>
        </>
    );
};