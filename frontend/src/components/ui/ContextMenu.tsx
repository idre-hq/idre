import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    visible: boolean;
    x: number;
    y: number;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
                                                     items,
                                                     visible,
                                                     x,
                                                     y,
                                                     onClose
                                                 }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

    useEffect(() => {
        if (visible && menuRef.current) {
            const menu = menuRef.current;
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            // Adjust horizontal position if menu would overflow
            if (x + rect.width > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 10;
            }

            // Adjust vertical position if menu would overflow
            if (y + rect.height > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 10;
            }

            // Ensure menu doesn't go off the left or top edges
            adjustedX = Math.max(10, adjustedX);
            adjustedY = Math.max(10, adjustedY);

            setAdjustedPosition({ x: adjustedX, y: adjustedY });
        }
    }, [visible, x, y]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    // Use Portal to render outside of any overflow:hidden or transform containers (like Grid Layout)
    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[9998]"
                style={{ backgroundColor: 'transparent' }}
            />
            <div
                ref={menuRef}
                className="fixed py-1 min-w-[160px] bg-background border border-border rounded-md shadow-lg z-[9999]"
                style={{
                    left: adjustedPosition.x,
                    top: adjustedPosition.y,
                }}
            >
                {items.map((item, index) => (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!item.disabled) {
                                item.onClick();
                                onClose();
                            }
                        }}
                        disabled={item.disabled}
                        className={`
                            w-full px-3 py-2 text-sm text-left flex items-center gap-2
                            transition-colors cursor-pointer
                            ${item.disabled
                            ? 'text-muted-foreground/50 cursor-not-allowed'
                            : item.danger
                                ? 'text-destructive hover:bg-destructive/10'
                                : 'hover:bg-muted/50 text-foreground'
                        }
                        `}
                    >
                        {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </>,
        document.body
    );
};

export default ContextMenu;