import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
import type { PingFrequency } from '../types';

interface PingScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (frequency: PingFrequency) => void;
    initialFrequency?: PingFrequency;
}

const frequencyOptions: { label: string; value: PingFrequency }[] = [
    { label: 'Every 1 Minute', value: '1min' },
    { label: 'Every 5 Minutes', value: '5min' },
    { label: 'Every 15 Minutes', value: '15min' },
    { label: 'Every 30 Minutes', value: '30min' },
    { label: 'Every 1 Hour', value: '1hr' },
    { label: 'Every 6 Hours', value: '6hr' },
    { label: 'Every 12 Hours', value: '12hr' },
    { label: 'Every 24 Hours', value: '24hr' },
];

export const PingScheduleModal: React.FC<PingScheduleModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialFrequency = '5min',
}) => {
    const [selectedFrequency, setSelectedFrequency] = useState<PingFrequency>(initialFrequency);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(selectedFrequency);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-light-bg rounded-lg p-6 shadow-2xl w-full max-w-md border border-slate-700 animate-slide-in-up">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Clock className="w-6 h-6 text-primary" />
                        Set Ping Schedule
                    </h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-red-500 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-text-secondary mb-4">
                    Choose how often Pynor should ping this site in the background.
                </p>

                <div className="space-y-3 mb-6">
                    {frequencyOptions.map((option) => (
                        <label
                            key={option.value}
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-all border ${
                                selectedFrequency === option.value
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            <input
                                type="radio"
                                name="ping-frequency"
                                value={option.value}
                                checked={selectedFrequency === option.value}
                                onChange={() => setSelectedFrequency(option.value)}
                                className="form-radio h-4 w-4 text-primary focus:ring-primary mr-3"
                            />
                            <span className="text-text-main font-medium">{option.label}</span>
                        </label>
                    ))}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg text-text-secondary border border-slate-600 hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 rounded-lg bg-primary text-white font-bold hover:bg-blue-700 transition-colors"
                    >
                        Save Schedule
                    </button>
                </div>
            </div>
        </div>
    );
};
