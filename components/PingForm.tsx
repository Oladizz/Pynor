import React, { useState } from 'react';
import { Globe, Send } from 'lucide-react';
import { Spinner } from './Spinner';

interface PingFormProps {
  url: string;
  setUrl: (url: string) => void;
  onPingSubmit: (url: string) => void; // Renamed prop to clarify its role
  isPinging: boolean;
  disabledReason?: string | null;
}

export const PingForm: React.FC<PingFormProps> = ({ url, setUrl, onPingSubmit, isPinging, disabledReason }) => {
  const [urlError, setUrlError] = useState<string | null>(null);

  const isValidUrl = (inputUrl: string): boolean => {
    try {
      // Use URL constructor for robust validation
      new URL(inputUrl);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleInternalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUrlError(null); // Clear previous error

    if (!url.trim()) {
      setUrlError('URL cannot be empty.');
      return;
    }

    // Add https:// prefix if missing for URL constructor to work
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://` + formattedUrl;
    }

    if (!isValidUrl(formattedUrl)) {
      setUrlError('Please enter a valid URL (e.g., https://example.com).');
      return;
    }
    
    // If validation passes, call the external submit handler
    onPingSubmit(formattedUrl);
  };

  const isDisabled = isPinging || !!disabledReason;
  return (
    <form onSubmit={handleInternalSubmit} className="w-full max-w-2xl mx-auto">
      <div className={`flex items-center gap-2 bg-light-bg border border-slate-700 rounded-lg p-2 shadow-lg transition-all duration-300 ${isDisabled ? 'opacity-60' : 'focus-within:ring-2 focus-within:ring-primary'}`}>
        <Globe className="w-6 h-6 text-text-secondary ml-2" />
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
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
       {urlError && <p className="text-red-400 text-center mt-3 text-sm">{urlError}</p>}
       {disabledReason && <p className="text-yellow-400 text-center mt-3 text-sm">{disabledReason}</p>}
    </form>
  );
};