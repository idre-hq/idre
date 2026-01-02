// Path: frontend/src/components/dashboard/widgets/ChatWidget.tsx

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useChats } from '../../../hooks/useChats';
import MessagesContainer from '../../chat/MessagesContainer';
import ChatInputArea from '../../chat/ChatInputArea';
import { fileService } from '../../../services/filesService';
import { WidgetWrapper } from '../WidgetWrapper';

interface ChatWidgetProps {
    notebookId: string;
    onRemove?: (id: string) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ notebookId, onRemove }) => {
    const {
        currentChat,
        currentChatId,
        loadingMessages,
        loadingModels,
        isTyping,
        currentChatModels,
        handleSendMessage,
        handleDeleteMessage,
    } = useChats(notebookId);

    const handleTextSubmit = async (text: string, options: { webSearch: boolean; mode: string }) => {
        await handleSendMessage(text, undefined, options);
    };

    const handleFileSubmit = async (file: File, options: { webSearch: boolean; mode: string }) => {
        try {
            const uploadResult = await fileService.uploadFile(file, undefined, false);
            await handleSendMessage(`[File: ${file.name}]`, uploadResult.url, options);
        } catch (e) { 
            console.error(e); 
        }
    };

    return (
        <WidgetWrapper
            id="chat"
            title="Chat Assistant"
            icon={<MessageCircle size={14} />}
            onRemove={onRemove}
        >
            <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0 overflow-hidden">
                    <MessagesContainer
                        messages={currentChat?.messages || []}
                        isTyping={isTyping}
                        loadingMessages={loadingMessages}
                        onDeleteMessage={handleDeleteMessage}
                    />
                </div>
                <div className="shrink-0 p-2 border-t border-border bg-background">
                    <ChatInputArea
                        onTextSubmit={handleTextSubmit}
                        onFileSubmit={handleFileSubmit}
                        disabled={!currentChatId || isTyping}
                        hasModelsConfigured={true}
                        loadingModels={loadingModels}
                        models={currentChatModels}
                        initialWebSearchEnabled={currentChat?.web_search}
                        chatId={currentChatId}
                    />
                </div>
            </div>
        </WidgetWrapper>
    );
};