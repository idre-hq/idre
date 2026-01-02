// Path: frontend/src/components/dashboard/WidgetWrapper.tsx

import React, { forwardRef } from 'react';
import { X, GripVertical, Maximize2, Minimize2 } from 'lucide-react';

interface WidgetWrapperProps {
    id: string;
    title: string;
    icon?: React.ReactNode;
    onRemove?: (id: string) => void;
    onMaximize?: (id: string) => void;
    isMaximized?: boolean;
    children: React.ReactNode;
    className?: string;
}

export const WidgetWrapper = forwardRef<HTMLDivElement, WidgetWrapperProps>(({
    id,
    title,
    icon,
    onRemove,
    onMaximize,
    isMaximized = false,
    children,
    className = '',
}, ref) => {
    return (
        <div
            ref={ref}
            className={`
                bg-card border border-border rounded-xl shadow-sm 
                flex flex-col overflow-hidden h-full
                transition-shadow hover:shadow-md
                ${className}
            `}
        >
            {/* Header - Draggable Area */}
            <div className="widget-drag-handle h-10 bg-muted/30 border-b border-border flex items-center justify-between px-3 cursor-grab active:cursor-grabbing shrink-0 select-none">
                <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-muted-foreground" />
                    {icon && <span className="text-muted-foreground">{icon}</span>}
                    <span className="text-sm font-medium truncate">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    {onMaximize && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onMaximize(id);
                            }}
                            className="p-1.5 rounded-md hover:bg-accent transition-colors"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    )}
                    {onRemove && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(id);
                            }}
                            className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden relative min-h-0">
                {children}
            </div>
        </div>
    );
});

WidgetWrapper.displayName = "WidgetWrapper";