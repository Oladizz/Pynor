
import React, { useState, useRef, useEffect } from 'react';
// FIX: Import GoogleGenAI from @google/genai
import { GoogleGenAI } from '@google/genai';
import type { PingResult } from '../types';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { Spinner } from './Spinner';

interface PingChatViewProps {
    pingHistory: PingResult[];
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const PingChatView: React.FC<PingChatViewProps> = ({ pingHistory }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);
        
        try {
            // FIX: Initialize GoogleGenAI with an object containing the apiKey
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

            const historyContext = pingHistory.length > 0
                ? `Here is the recent ping history in JSON format (most recent first):\n${JSON.stringify(pingHistory.slice(0, 5), null, 2)}`
                : "There is no ping history available yet.";

            const systemInstruction = `You are a helpful AI assistant called "Ping AI". Your expertise is in analyzing website performance and network status. 
            You will be given a user's question and a JSON object representing their recent ping history. 
            Analyze the data to answer the user's question. Be concise and clear. If the history is empty, state that.
            Provide insights about response times, status codes, and potential issues. You can make suggestions for improvement.
            For example, if response time is high, you could mention potential causes like server load or network latency.
            If a site is offline, suggest checking the URL or trying again later. Format your response using markdown for readability.`;

            // FIX: Use ai.models.generateContent for a direct request
            const response = await ai.models.generateContent({
                // FIX: Use 'gemini-2.5-flash' for this text-based task
                model: 'gemini-2.5-flash',
                // FIX: Pass the full prompt in the `contents` field
                contents: `${historyContext}\n\nUser question: ${input}`,
                // FIX: Use the `config` object for systemInstruction
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            // FIX: Access the response text directly via the `.text` property
            const modelResponseText = response.text;

            const newModelMessage: ChatMessage = { role: 'model', text: modelResponseText };
            setMessages(prev => [...prev, newModelMessage]);

        } catch (err) {
            console.error("Gemini API error:", err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred with the AI assistant.';
            setError(`Sorry, I couldn't get a response. Error: ${errorMessage}`);
            setMessages(prev => prev.filter(msg => msg.role !== 'user' || msg.text !== newUserMessage.text));
            setInput(newUserMessage.text);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-[65vh] max-h-[700px]">
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-900/50 rounded-t-lg">
                {messages.length === 0 && (
                    <div className="text-center text-text-secondary h-full flex flex-col justify-center items-center">
                        <p className="text-lg">Ask me anything about your ping results!</p>
                        <p className="text-sm mt-2">For example: "Which site was the fastest?" or "Summarize the status of my sites."</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-slate-700 text-text-main'}`}>
                            <div className="prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                        </div>
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-md p-3 rounded-lg bg-slate-700 text-text-main flex items-center gap-2">
                            <Spinner className="w-4 h-4" />
                            <span>Thinking...</span>
                        </div>
                    </div>
                 )}
            </div>
             {error && <p className="text-red-400 text-center text-sm py-2">{error}</p>}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
                <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-600 rounded-lg p-2 focus-within:ring-2 focus-within:ring-primary">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your results..."
                        className="flex-grow bg-transparent text-text-main placeholder-text-secondary outline-none"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="flex items-center justify-center bg-primary text-white rounded-md p-2 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                        disabled={isLoading || !input.trim()}
                        aria-label="Send message"
                    >
                       {isLoading ? <Spinner className="w-5 h-5" /> : <PaperAirplaneIcon className="w-5 h-5" />}
                    </button>
                </div>
            </form>
        </div>
    );
};
