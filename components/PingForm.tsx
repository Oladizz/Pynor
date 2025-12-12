import React from 'react';
import { Globe, Send } from 'lucide-react';
import { Spinner } from './Spinner';

interface PingFormProps {
  url: string;
  setUrl: (url: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPinging: boolean;
  disabledReason?: string | null;
}

export const PingForm: React.FC<PingFormProps> = ({ url, setUrl, handleSubmit, isPinging, disabledReason }) => {
  const isDisabled = isPinging || !!disabledReason;
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className={`flex items-center gap-2 bg-light-bg border border-slate-700 rounded-lg p-2 shadow-lg transition-all duration-300 ${isDisabled ? 'opacity-60' : 'focus-within:ring-2 focus-within:ring-primary'}`}>
        <Globe className="w-6 h-6 text-text-secondary ml-2" />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-grow bg-transparent text-text-main placeholder-text-secondary text-lg outline-none"
          disabled={isDisabled}
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 bg-primary text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300 w-32 h-12"
          disabled={isDisabled}
          aria-label={isPinging ? 'Pinging, please wait' : disabledReason ? disabledReason : 'Ping URL'}
        >
          {isPinging ? (
            <>
              <Spinner className="w-5 h-5" />
              <span>Pinging...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Ping</span>
            </>
          )}
        </button>
      </div>
       {disabledReason && <p className="text-yellow-400 text-center mt-3 text-sm">{disabledReason}</p>}
    </form>
  );
};