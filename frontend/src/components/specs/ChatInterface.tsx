import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Bot, User } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatInterfaceProps {
    onSendMessage: (message: string) => Promise<string | void>;
    isProcessing: boolean;
    disabled?: boolean;
    disabledMessage?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSendMessage, isProcessing, disabled = false, disabledMessage }) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'I have generated a draft spec based on the email. Review it on the left and let me know if you want to make any changes.',
            timestamp: new Date(),
        },
    ]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isProcessing]);

    const handleSend = async () => {
        if (!input.trim() || isProcessing || disabled) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        try {
            const reply = await onSendMessage(userMsg.content);
            if (reply) {
                const assistantMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: reply,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-950">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h2 className="font-semibold text-sm text-slate-700 dark:text-slate-200">AI Assistant</h2>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-800' : 'bg-purple-100 dark:bg-purple-900/30'
                                }`}>
                                {msg.role === 'user' ? (
                                    <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                ) : (
                                    <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                )}
                            </div>
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900 rounded-tr-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isProcessing && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                {disabled && disabledMessage ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                            🔒 {disabledMessage}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask to make changes..."
                                disabled={isProcessing || disabled}
                                className="pr-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500"
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-transparent text-slate-400 hover:text-purple-600 disabled:opacity-50"
                                onClick={handleSend}
                                disabled={isProcessing || !input.trim() || disabled}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center mt-2">
                            AI can make mistakes. Review generated specs.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};
