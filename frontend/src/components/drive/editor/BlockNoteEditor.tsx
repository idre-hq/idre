// frontend/src/components/drive/editor/BlockNoteEditor.tsx

import React, { useEffect, useMemo, useRef, useCallback, type FC } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem } from "@blocknote/react";
import { useTheme } from "next-themes";
import { Mic, Square, Loader2, Pencil, ListTodo } from "lucide-react";
import "@blocknote/mantine/style.css";

interface BlockNoteEditorProps {
    content: string;
    onChange: (val: string) => void;
    onSave: () => void;
    editable?: boolean;
    // AI Features
    isRecording?: boolean;
    onToggleRecording?: () => void;
    isTranscribing?: boolean;
    isRewriting?: boolean;
    onRewriteContent?: () => void;
    isGeneratingTasks?: boolean;
    onGenerateTasks?: () => void;
    hasContent?: boolean;
}

interface CustomSlashMenuItem {
    title: string;
    subtext?: string;
    onItemClick: () => void;
    aliases?: string[];
    group: string;
    icon: React.ReactNode;
}

// Custom AI Slash Menu Items - moved outside component to prevent recreation
const createAISlashMenuItems = (
    props: {
        isRecording?: boolean;
        onToggleRecording?: () => void;
        isTranscribing?: boolean;
        isRewriting?: boolean;
        onRewriteContent?: () => void;
        isGeneratingTasks?: boolean;
        onGenerateTasks?: () => void;
        hasContent?: boolean;
    }
): CustomSlashMenuItem[] => {
    const items: CustomSlashMenuItem[] = [];

    // Voice Note Item
    if (props.onToggleRecording) {
        items.push({
            title: props.isRecording ? "Stop Recording" : props.isTranscribing ? "Transcribing..." : "Voice Note",
            subtext: props.isRecording
                ? "Click to stop and transcribe"
                : props.isTranscribing
                    ? "Processing your voice..."
                    : "Record audio and transcribe to text",
            onItemClick: () => {
                if (!props.isTranscribing && props.onToggleRecording) {
                    props.onToggleRecording();
                }
            },
            aliases: ["voice", "record", "audio", "microphone", "speech", "transcribe"],
            group: "AI Assistant",
            icon: props.isTranscribing ? (
                <Loader2 size={18} className="animate-spin text-primary" />
            ) : props.isRecording ? (
                <Square size={18} className="text-red-500" fill="currentColor" />
            ) : (
                <Mic size={18} />
            ),
        });
    }

    // Rewrite Content Item
    if (props.onRewriteContent && props.hasContent) {
        items.push({
            title: props.isRewriting ? "Rewriting..." : "Rewrite Content",
            subtext: props.isRewriting
                ? "AI is improving your content..."
                : "Use AI to improve and rewrite your document",
            onItemClick: () => {
                if (!props.isRewriting && props.onRewriteContent) {
                    props.onRewriteContent();
                }
            },
            aliases: ["rewrite", "improve", "enhance", "edit", "ai", "polish"],
            group: "AI Assistant",
            icon: props.isRewriting ? (
                <Loader2 size={18} className="animate-spin text-primary" />
            ) : (
                <Pencil size={18} />
            ),
        });
    }

    // Generate Tasks Item
    if (props.onGenerateTasks && props.hasContent) {
        items.push({
            title: props.isGeneratingTasks ? "Generating Tasks..." : "Generate Tasks",
            subtext: props.isGeneratingTasks
                ? "Extracting action items..."
                : "Extract action items and tasks from your content",
            onItemClick: () => {
                if (!props.isGeneratingTasks && props.onGenerateTasks) {
                    props.onGenerateTasks();
                }
            },
            aliases: ["tasks", "todo", "actions", "checklist", "extract", "ai"],
            group: "AI Assistant",
            icon: props.isGeneratingTasks ? (
                <Loader2 size={18} className="animate-spin text-primary" />
            ) : (
                <ListTodo size={18} />
            ),
        });
    }

    return items;
};

const BlockNoteEditor: React.FC<BlockNoteEditorProps> = ({
    content,
    onChange,
    editable = true,
    // AI Features
    isRecording = false,
    onToggleRecording,
    isTranscribing = false,
    isRewriting = false,
    onRewriteContent,
    isGeneratingTasks = false,
    onGenerateTasks,
    hasContent = false,
}) => {
    const { resolvedTheme } = useTheme();

    const isInitialLoad = useRef(true);
    const previousContent = useRef(content);
    const isInternalChange = useRef(false);
    const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const defaultItemsRef = useRef<DefaultReactSuggestionItem[] | null>(null);

    const editor = useCreateBlockNote();

    // Memoize AI items - only recreate when these specific values change
    const aiItems = useMemo(() => createAISlashMenuItems({
        isRecording,
        onToggleRecording,
        isTranscribing,
        isRewriting,
        onRewriteContent,
        isGeneratingTasks,
        onGenerateTasks,
        hasContent,
    }), [isRecording, onToggleRecording, isTranscribing, isRewriting,
        onRewriteContent, isGeneratingTasks, onGenerateTasks, hasContent]);

    // Cache default items - they don't change after editor is created
    const getDefaultItems = useCallback(() => {
        if (!defaultItemsRef.current && editor) {
            defaultItemsRef.current = getDefaultReactSlashMenuItems(editor);
        }
        return defaultItemsRef.current || [];
    }, [editor]);

    // Only load content on initial load or external changes
    useEffect(() => {
        const loadContent = async () => {
            if (!editor) return;

            // Skip if this was an internal change
            if (isInternalChange.current) {
                isInternalChange.current = false;
                return;
            }

            // Only update if content actually changed externally
            if (isInitialLoad.current || content !== previousContent.current) {
                try {
                    const blocks = await editor.tryParseMarkdownToBlocks(content || "");
                    editor.replaceBlocks(editor.document, blocks);
                    previousContent.current = content;
                    isInitialLoad.current = false;
                } catch (e) {
                    console.error("Failed to parse markdown:", e);
                }
            }
        };

        loadContent();
    }, [content, editor]);

    // Debounced change handler to prevent expensive markdown conversion on every keystroke
    const handleChange = useCallback(() => {
        if (!editor) return;

        // Clear existing timeout
        if (changeTimeoutRef.current) {
            clearTimeout(changeTimeoutRef.current);
        }

        // Debounce the markdown conversion (expensive operation)
        changeTimeoutRef.current = setTimeout(async () => {
            try {
                const markdown = await editor.blocksToMarkdownLossy(editor.document);
                isInternalChange.current = true;
                previousContent.current = markdown;
                onChange(markdown);
            } catch (e) {
                console.error("Failed to convert to markdown:", e);
            }
        }, 300); // 300ms debounce
    }, [editor, onChange]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (changeTimeoutRef.current) {
                clearTimeout(changeTimeoutRef.current);
            }
        };
    }, []);

    // Optimized slash menu getter with memoization
    const getCustomSlashMenuItems = useCallback(async (query: string) => {
        const defaultItems = getDefaultItems();
        const allItems = [...aiItems, ...defaultItems];

        if (!query) return allItems;

        const lowerQuery = query.toLowerCase();
        return allItems.filter((item: CustomSlashMenuItem | DefaultReactSuggestionItem) =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.aliases?.some((alias: string) => alias.toLowerCase().includes(lowerQuery)) ||
            ('subtext' in item && item.subtext?.toLowerCase().includes(lowerQuery))
        );
    }, [aiItems, getDefaultItems]);

    // Memoize theme to prevent unnecessary re-renders
    const blockNoteTheme = useMemo(() => {
        return resolvedTheme === "dark" ? "dark" : "light";
    }, [resolvedTheme]);

    // Memoize the item click handler
    const handleItemClick = useCallback((item: CustomSlashMenuItem | DefaultReactSuggestionItem) => {
        if ('onItemClick' in item && typeof item.onItemClick === 'function') {
            item.onItemClick();
        }
    }, []);

    return (
        <div className="relative w-full h-full flex flex-col bg-background blocknote-wrapper">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Recording indicator - responsive positioning */}
                {isRecording && (
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2 bg-red-500/10 border border-red-500/30 text-red-500 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg animate-pulse">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs sm:text-sm font-medium">Recording...</span>
                        <button
                            onClick={onToggleRecording}
                            className="ml-1 sm:ml-2 p-0.5 sm:p-1 hover:bg-red-500/20 rounded"
                            title="Stop Recording"
                        >
                            <Square size={12} className="sm:w-3.5 sm:h-3.5" fill="currentColor" />
                        </button>
                    </div>
                )}

                {/* Transcribing indicator */}
                {isTranscribing && (
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2 bg-primary/10 border border-primary/30 text-primary px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                        <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                        <span className="text-xs sm:text-sm font-medium">Transcribing...</span>
                    </div>
                )}

                {/* Rewriting indicator */}
                {isRewriting && (
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2 bg-primary/10 border border-primary/30 text-primary px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                        <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">Rewriting content...</span>
                        <span className="text-xs sm:text-sm font-medium sm:hidden">Rewriting...</span>
                    </div>
                )}

                {/* Generating tasks indicator */}
                {isGeneratingTasks && (
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2 bg-primary/10 border border-primary/30 text-primary px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                        <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">Generating tasks...</span>
                        <span className="text-xs sm:text-sm font-medium sm:hidden">Tasks...</span>
                    </div>
                )}

                {/* Responsive container with padding */}
                <div className="flex justify-center w-full min-h-full py-4 sm:py-8 px-2 sm:px-6 md:px-12 lg:px-16">
                    <div className="w-full max-w-4xl">
                        <BlockNoteView
                            editor={editor}
                            editable={editable}
                            onChange={handleChange}
                            theme={blockNoteTheme}
                            slashMenu={false}
                        >
                            <SuggestionMenuController
                                triggerCharacter="/"
                                getItems={getCustomSlashMenuItems}
                                suggestionMenuComponent={undefined as unknown as FC<any>}
                                onItemClick={handleItemClick}
                            />
                        </BlockNoteView>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(BlockNoteEditor);