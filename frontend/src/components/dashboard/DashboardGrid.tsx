// Path: frontend/src/components/dashboard/DashboardGrid.tsx

import React, { useCallback } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(GridLayout);

export interface DashboardWidget {
    id: string;
    title: string;
    icon: React.ReactNode;
    component: React.ReactNode;
    defaultLayout: {
        x: number;
        y: number;
        w: number;
        h: number;
        minW?: number;
        minH?: number;
    };
}

interface DashboardGridProps {
    widgets: DashboardWidget[];
    activeWidgetIds: string[];
    onLayoutChange?: (layout: Layout[]) => void;
    savedLayout?: Layout[];
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
    widgets,
    activeWidgetIds,
    onLayoutChange,
    savedLayout,
}) => {
    const activeWidgets = widgets.filter(w => activeWidgetIds.includes(w.id));

    const layout: Layout[] = savedLayout || activeWidgets.map(widget => ({
        i: widget.id,
        x: widget.defaultLayout.x,
        y: widget.defaultLayout.y,
        w: widget.defaultLayout.w,
        h: widget.defaultLayout.h,
        minW: widget.defaultLayout.minW || 2,
        minH: widget.defaultLayout.minH || 3,
    }));

    const handleLayoutChange = useCallback((newLayout: Layout[]) => {
        onLayoutChange?.(newLayout);
    }, [onLayoutChange]);

    return (
        <ResponsiveGridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={60}
            margin={[16, 16]}
            containerPadding={[16, 16]}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".widget-drag-handle"
            isResizable={true}
            isDraggable={true}
            useCSSTransforms={true}
        >
            {activeWidgets.map(widget => (
                <div key={widget.id} className="h-full">
                    {widget.component}
                </div>
            ))}
        </ResponsiveGridLayout>
    );
};