

import React, { useState, useEffect } from 'react';
import type { WaitlistFormData, WaitlistEntry } from '../types';
import { XIcon } from './icons';

/**
 * RPM Waitlist Modal Component
 *
 * Collects user information for Remote Patient Monitoring service waitlist.
 * Uses localStorage-based JSON persistence for development/testing purposes.
 *
 * Features:
 * - Form validation with duplicate email prevention
 * - localStorage-based data persistence
 * - Automatic timestamp and ID generation
 * - Status tracking (active/contacted/enrolled)
 *
 * Development Utilities:
 * - Access via browser console: window.waitlistUtils
 * - window.waitlistUtils.getEntries() - Get all entries
 * - window.waitlistUtils.exportData() - Export as JSON string
 * - window.waitlistUtils.clearData() - Clear all data
 *
 * Data Structure:
 * {
 *   id: string,           // Auto-generated unique ID
 *   name: string,         // User's full name
 *   email: string,        // Email address (unique)
 *   phone: string,        // Phone number (optional)
 *   timestamp: string,    // ISO timestamp of signup
 *   status: 'active' | 'contacted' | 'enrolled'
 * }
 *
 * Note: This implementation uses localStorage for simplicity.
 * For production, consider a proper database backend with HIPAA compliance.
 */

// Waitlist storage utilities
const WAITLIST_STORAGE_KEY = 'elevated-wellness-waitlist';

/**
 * Retrieves all waitlist entries from localStorage
 * @returns {WaitlistEntry[]} Array of waitlist entries
 */
const getWaitlistEntries = (): WaitlistEntry[] => {
  try {
    const stored = localStorage.getItem(WAITLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading waitlist data:', error);
    return [];
  }
};

/**
 * Saves a new waitlist entry to localStorage with duplicate prevention
 * @param {Omit<WaitlistEntry, 'id' | 'timestamp' | 'status'>} entry - The form data to save
 * @returns {WaitlistEntry} The saved entry with generated metadata
 * @throws {Error} If email is already on waitlist or storage fails
 */
const saveWaitlistEntry = (entry: Omit<WaitlistEntry, 'id' | 'timestamp' | 'status'>): WaitlistEntry | null => {
  try {
    const entries = getWaitlistEntries();
    
    // Check for duplicate email
    const existingEntry = entries.find(e => e.email.toLowerCase() === entry.email.toLowerCase());
    if (existingEntry) {
      throw new Error('This email address is already on the waitlist.');
    }
    
    // Create new entry
    const newEntry: WaitlistEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    
    // Save to storage
    entries.push(newEntry);
    localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(entries));
    
    return newEntry;
  } catch (error) {
    console.error('Error saving waitlist entry:', error);
    throw error;
  }
};

/**
 * Checks if an email address is already on the waitlist
 * @param {string} email - Email address to check
 * @returns {boolean} True if email exists on waitlist
 */
const isEmailOnWaitlist = (email: string): boolean => {
  const entries = getWaitlistEntries();
  return entries.some(entry => entry.email.toLowerCase() === email.toLowerCase());
};

/**
 * Exports all waitlist entries as JSON string (for development/debugging)
 * @returns {string} JSON string of all waitlist entries
 */
const exportWaitlistData = (): string => {
  const entries = getWaitlistEntries();
  return JSON.stringify(entries, null, 2);
};

/**
 * Clears all waitlist data (for development/testing only)
 */
const clearWaitlistData = (): void => {
  try {
    localStorage.removeItem(WAITLIST_STORAGE_KEY);
    console.log('Waitlist data cleared');
  } catch (error) {
    console.error('Error clearing waitlist data:', error);
  }
};

// Expose utility functions to window for development
if (typeof window !== 'undefined') {
  (window as any).waitlistUtils = {
    getEntries: getWaitlistEntries,
    exportData: exportWaitlistData,
    clearData: clearWaitlistData
  };
}

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormErrors = { [K in keyof WaitlistFormData]?: string };

const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<WaitlistFormData>({
    name: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormData({ name: '', phone: '', email: '' });
        setStatus('idle');
        setErrors({});
      }, 300); // match transition duration
    }
  }, [isOpen]);

  /**
   * Handles input field changes and clears validation errors for the changed field
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof WaitlistFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  /**
   * Validates the waitlist form data including duplicate email checking
   * @returns {FormErrors} Object containing validation error messages keyed by field name
   */
  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Full name cannot exceed 100 characters.';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    } else if (isEmailOnWaitlist(formData.email)) {
      newErrors.email = 'This email address is already on the waitlist.';
    }

    if (formData.phone.trim() && !/^\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number.';
    }

    return newErrors;
  };


  /**
   * Handles form submission for waitlist signup
   *
   * Validates form data, checks for duplicates, and saves to localStorage.
   * Generates unique ID and timestamp for each entry.
   *
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setStatus('submitting');
    try {
      // Save to localStorage-based waitlist
      const savedEntry = saveWaitlistEntry({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim()
      });
      
      console.log('Waitlist entry saved:', savedEntry);
      setStatus('success');
      setErrors({});
    } catch (error) {
      console.error('Waitlist submission failed:', error);
      setStatus('error');
    }
  };

  if (!isOpen) {
    return null;
  }
  
  const getInputClassName = (fieldName: keyof FormErrors) => 
    `mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-burgundy focus:border-burgundy ${errors[fieldName] ? 'border-red-500' : 'border-slate-300'}`;


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true"></div>

      {/* Modal Panel */}
      <div className="relative bg-white w-full max-w-lg p-8 rounded-2xl shadow-xl transform transition-all">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="waitlist-modal-title" className="text-2xl font-bold text-slate-900">
              Join the RPM Waitlist
            </h2>
            <p className="mt-2 text-slate-600">
              Be the first to know when our Remote Patient Monitoring service launches.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close RPM waitlist modal"
            className="p-2 -mr-2 -mt-2 rounded-full text-slate-500 hover:bg-rose-mist hover:text-slate-800 transition-colors"
          >
            <XIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="mt-6 text-center py-8" aria-live="polite">
            <h3 className="text-2xl font-semibold text-success">You're on the list!</h3>
            <p className="mt-2 text-slate-600">Thank you for your interest. We'll be in touch soon with updates.</p>
            <button
              onClick={onClose}
              className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-sm text-base font-medium text-white bg-burgundy hover:bg-burgundy-dark"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="waitlist-name" className="block text-sm font-medium text-slate-700">Full Name</label>
              <input 
                type="text" 
                name="name" 
                id="waitlist-name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                className={getInputClassName('name')}
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? 'waitlist-name-error' : undefined}
              />
              {errors.name && <p id="waitlist-name-error" className="mt-1 text-sm text-error">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="waitlist-email" className="block text-sm font-medium text-slate-700">Email Address</label>
              <input 
                type="email" 
                name="email" 
                id="waitlist-email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                className={getInputClassName('email')}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? 'waitlist-email-error' : undefined}
              />
              {errors.email && <p id="waitlist-email-error" className="mt-1 text-sm text-error">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="waitlist-phone" className="block text-sm font-medium text-slate-700">Phone (Optional)</label>
              <input 
                type="tel" 
                name="phone" 
                id="waitlist-phone" 
                value={formData.phone} 
                onChange={handleChange} 
                className={getInputClassName('phone')}
                aria-invalid={errors.phone ? "true" : "false"}
                aria-describedby={errors.phone ? 'waitlist-phone-error' : undefined}
              />
              {errors.phone && <p id="waitlist-phone-error" className="mt-1 text-sm text-error">{errors.phone}</p>}
            </div>
            <div>
              <button type="submit" disabled={status === 'submitting'} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-sm text-base font-medium text-white bg-burgundy hover:bg-burgundy-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-burgundy disabled:bg-slate-400">
                {status === 'submitting' ? 'Submitting...' : 'Join Now'}
              </button>
            </div>
            {status === 'error' && <p className="text-center text-sm text-error" aria-live="polite">Something went wrong. Please try again.</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default WaitlistModal;