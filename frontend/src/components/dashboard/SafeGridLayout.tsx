import * as React from "react";
// 1. Import the default export specifically
import RGL from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// --- ROBUST COMPONENT EXTRACTION ---
// We need to handle cases where Vite puts exports on '.default' 
// or where they are attached to the main object.

// @ts-ignore: Handle implicit any for library internals
const getComponent = (lib: any, name: string) => {
  // Check direct property
  if (lib[name]) return lib[name];
  // Check nested default property (CommonJS interop)
  if (lib.default && lib.default[name]) return lib.default[name];
  // Check if the library itself IS the default export and has the prop
  if (lib.default && typeof lib.default !== 'function' && lib.default[name]) return lib.default[name];
  return null;
};

// Extract specific components
const ResponsiveRaw = getComponent(RGL, "Responsive");
const WidthProviderRaw = getComponent(RGL, "WidthProvider");

// Generate the HOC
// If extraction failed, this will remain null and trigger the error UI
const ResponsiveGridLayout = (WidthProviderRaw && ResponsiveRaw) 
  ? WidthProviderRaw(ResponsiveRaw) 
  : null;

interface SafeGridLayoutProps {
  children: React.ReactNode;
  layouts: any;
  breakpoints: any;
  cols: any;
  rowHeight: number;
  draggableHandle?: string;
  onLayoutChange: (layout: any) => void;
  margin?: [number, number];
  isDraggable?: boolean;
  isResizable?: boolean;
}

export const SafeGridLayout: React.FC<SafeGridLayoutProps> = (props) => {
  // Debugging: If this appears, check console to see what RGL actually looks like
  if (!ResponsiveGridLayout) {
    console.error("React-Grid-Layout Load Failed. RGL Object:", RGL);
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground border-2 border-dashed border-destructive/50 rounded-xl bg-destructive/5">
        <h3 className="font-bold text-destructive mb-2">Library Load Error</h3>
        <p className="text-sm">Could not load the Grid Layout engine.</p>
        <p className="text-xs mt-2 opacity-70">
          Try restarting the dev server: <code className="bg-muted px-1 rounded">Ctrl+C</code> then <code className="bg-muted px-1 rounded">npm run dev</code>
        </p>
      </div>
    );
  }

  // Render the actual grid if loaded successfully
  return <ResponsiveGridLayout {...props}>{props.children}</ResponsiveGridLayout>;
};