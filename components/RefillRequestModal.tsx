import React, { useState, useEffect } from 'react';
import type { RefillFormData } from '../types';
import { XIcon } from './icons';

/**
 * BestRX Refill Request Modal
 *
 * Integrates with BestRX PMS for prescription refill requests.
 * Follows BestRX API specification for secure patient refill submissions.
 *
 * API Endpoints:
 * - GetPatientProfile: Lookup eligible prescriptions
 * - SendRefillRequest: Submit refill requests
 *
 * @see https://webservice.bcsbestrx.com/bcswebservice/v2/webrefillservice
 */

interface RefillRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormErrors = { [K in keyof RefillFormData]?: string };

const RefillRequestModal: React.FC<RefillRequestModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<RefillFormData>({
    patientName: '',
    dob: '',
    phone: '',
    email: '',
    prescriptionNumbers: '',
    medicationNames: '',
    preferredService: 'pickup',
    notes: '',
    consent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState<string | null>(null);

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormData({
          patientName: '',
          dob: '',
          phone: '',
          email: '',
          prescriptionNumbers: '',
          medicationNames: '',
          preferredService: 'pickup',
          notes: '',
          consent: false,
        });
        setStatus('idle');
        setErrors({});
        setApiError(null);
      }, 300); // match transition duration
    }
  }, [isOpen]);

  /**
   * Handles input field changes and clears validation errors for the changed field.
   *
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>} e - The input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error on change
    if (errors[name as keyof RefillFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Validates the refill request form data according to BestRX API requirements
   * and HIPAA compliance standards.
   *
   * @returns {FormErrors} Object containing validation error messages keyed by field name
   */
  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!formData.patientName.trim()) newErrors.patientName = 'Patient full name is required.';
    
    if (!formData.dob.trim()) {
      newErrors.dob = 'Date of birth is required.';
    } else {
      // The selected date is UTC midnight. To prevent timezone-related "off by one day" errors,
      // create a date object that correctly represents the selected day in the user's timezone.
      const dateParts = formData.dob.split('-').map(Number);
      const selectedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date to midnight for accurate comparison

      if (selectedDate > today) {
        newErrors.dob = 'Date of birth cannot be in the future.';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^(1\s?)?(\(\d{3}\)|\d{3})[\s.\-]?\d{3}[\s.\-]?\d{4}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid US phone number.';
    }

    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.prescriptionNumbers.trim()) {
      newErrors.prescriptionNumbers = 'At least one prescription number is required.';
    } else if (formData.prescriptionNumbers.trim().length > 1000) {
      newErrors.prescriptionNumbers = 'Prescription numbers field is too long.';
    } else {
        const rxNumbers = formData.prescriptionNumbers.split(/[\s,]+/).filter(n => n.trim());
        if (rxNumbers.length === 0 || rxNumbers.some(n => isNaN(Number(n)))) {
            newErrors.prescriptionNumbers = 'Please enter valid, numeric prescription number(s).';
        }
    }

    if (formData.medicationNames.trim().length > 500) newErrors.medicationNames = 'Medication names cannot exceed 500 characters.';
    if (formData.notes.trim().length > 500) newErrors.notes = 'Notes cannot exceed 500 characters.';

    if (!formData.consent) {
      newErrors.consent = 'You must acknowledge the statement to proceed.';
    }

    return newErrors;
  };

  /**
   * Handles form submission for prescription refill requests.
   *
   * Validates form data, transforms it according to BestRX API specification,
   * and submits the request to the pharmacy management system.
   *
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event
   *
   * @throws {Error} When API credentials are not configured or network requests fail
   *
   * @see https://webservice.bcsbestrx.com/bcswebservice/v2/webrefillservice/SendRefillRequest
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError(null);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus('submitting');
    
    // Validate environment variables are set
    const username = process.env.BESTRX_USERNAME;
    const apiKey = process.env.BESTRX_API_KEY;
    const pharmacyNumber = process.env.BESTRX_PHARMACY_NUMBER;
    
    if (!username || !apiKey || !pharmacyNumber) {
      console.error('BestRX API credentials not configured');
      setApiError('Service configuration error. Please contact support.');
      setStatus('error');
      return;
    }
    
    // 1. Data Transformation for BestRx API
    const getLastName = (fullName: string) => fullName.trim().split(' ').pop() || '';
    const sanitizedPhone = formData.phone.replace(/\D/g, '');
    const rxNumbers = formData.prescriptionNumbers
      .split(/[\s,]+/)
      .filter(num => num.trim() !== '' && !isNaN(Number(num)))
      .map(num => ({ RxNo: Number(num.trim()) }));

    // Validate we have at least one valid prescription number
    if (rxNumbers.length === 0) {
      setApiError('Please enter at least one valid prescription number.');
      setStatus('error');
      return;
    }

    console.log('Submitting refill request:', {
      patientName: formData.patientName,
      prescriptionCount: rxNumbers.length,
      preferredService: formData.preferredService
    });

    // 2. API Payload
    const payload = {
      userName: username,
      APIKey: apiKey,
      PharmacyNumber: pharmacyNumber,
      LastName: getLastName(formData.patientName),
      DOB: formData.dob, // Already in YYYY-MM-DD format from date input
      Phone: sanitizedPhone,
      RequestDateTime: new Date().toISOString(),
      DeliveryOption: formData.preferredService === 'pickup' ? 1 : 2, // Assuming 1=Pickup, 2=Delivery
      RequestType: 1, // Assuming 1=Standard Refill
      RxInRefillRequest: rxNumbers,
      Notes: `${formData.medicationNames ? `Medications: ${formData.medicationNames}. ` : ''}${formData.notes}`,
    };

    try {
      const response = await fetch('https://webservice.bcsbestrx.com/bcswebservice/v2/webrefillservice/SendRefillRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Handle HTTP error status codes
        const errorData = await response.json().catch(() => ({}));

        let errorMessage = 'An error occurred while processing your refill request.';

        // Map BestRX error codes to user-friendly messages
        if (response.status === 400) {
          switch (errorData.ErrorCode || errorData.Code) {
            case '1000':
              errorMessage = 'Service configuration error. Please contact support.';
              break;
            case '1001':
              errorMessage = 'Invalid pharmacy configuration. Please contact support.';
              break;
            case '1011':
              errorMessage = 'Patient last name is required.';
              break;
            case '1012':
              errorMessage = 'Please enter a valid date of birth.';
              break;
            case '1013':
              errorMessage = 'Invalid request timestamp. Please try again.';
              break;
            case '1014':
              errorMessage = 'Please enter at least one prescription number.';
              break;
            case '1015':
              errorMessage = 'Invalid delivery option selected.';
              break;
            case '1016':
              errorMessage = 'Invalid request source. Please try again.';
              break;
            case '1019':
              errorMessage = 'Prescription number or patient ID is required.';
              break;
            default:
              errorMessage = errorData.Message || 'Invalid request data. Please check your information.';
          }
        } else if (response.status === 403) {
          switch (errorData.ErrorCode || errorData.Code) {
            case '1004':
              errorMessage = 'Service authentication failed. Please contact support.';
              break;
            case '1018':
              errorMessage = 'Pharmacy not authorized for this service. Please contact support.';
              break;
            default:
              errorMessage = 'Access denied. Please contact support.';
          }
        } else if (response.status === 500) {
          errorMessage = 'The pharmacy system is temporarily unavailable. Please try again later.';
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Handle successful response according to BestRX spec
      if (result.RxInRefillResponse && Array.isArray(result.RxInRefillResponse)) {
        const responses = result.RxInRefillResponse;

        // Check if all refill requests were successful
        const failedRequests = responses.filter((item: any) => item.Status !== 'OK');

        if (failedRequests.length === 0) {
          setStatus('success');
          setErrors({});
        } else {
          // Some requests failed - show specific error
          const errorMessages = failedRequests.map((item: any) =>
            `Rx ${item.RxNo}: ${item.StatusDesc || 'Request failed'}`
          );
          setApiError(`Some refill requests failed: ${errorMessages.join(', ')}`);
          setStatus('error');
        }
      } else {
        // Unexpected response structure
        setApiError('Unexpected response from pharmacy system. Please contact support.');
        setStatus('error');
      }
    } catch (error) {
      console.error('Refill Request Failed:', error);
      
      // Use the specific error message thrown from the response handling
      let errorMessage = 'Could not connect to the pharmacy system.';
      
      if (error instanceof Error) {
        // If it's one of our custom error messages, use it directly
        if (error.message.includes('Service configuration error') ||
            error.message.includes('Invalid pharmacy configuration') ||
            error.message.includes('Patient last name is required') ||
            error.message.includes('Please enter a valid date of birth') ||
            error.message.includes('Invalid request timestamp') ||
            error.message.includes('Please enter at least one prescription number') ||
            error.message.includes('Invalid delivery option selected') ||
            error.message.includes('Invalid request source') ||
            error.message.includes('Prescription number or patient ID is required') ||
            error.message.includes('Service authentication failed') ||
            error.message.includes('Pharmacy not authorized for this service') ||
            error.message.includes('Access denied') ||
            error.message.includes('The pharmacy system is temporarily unavailable') ||
            error.message.includes('Some refill requests failed') ||
            error.message.includes('Unexpected response from pharmacy system')) {
          errorMessage = error.message;
        } else if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else {
          // Generic error handling for other cases
          errorMessage = 'An unexpected error occurred. Please try again or contact support.';
        }
      }
      
      setApiError(errorMessage);
      setStatus('error');
    }
  };

  if (!isOpen) {
    return null;
  }
  
  const getInputClassName = (fieldName: keyof FormErrors) => 
    `mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-burgundy focus:border-burgundy ${errors[fieldName] ? 'border-red-500' : 'border-slate-300'}`;
  
  const getTextAreaClassName = (fieldName: keyof FormErrors) =>
    `mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-burgundy focus:border-burgundy ${errors[fieldName] ? 'border-red-500' : 'border-slate-300'}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refill-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden="true"></div>

      {/* Modal Panel */}
      <div className="relative bg-white w-full max-w-lg p-8 rounded-2xl shadow-xl transform transition-all flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 id="refill-modal-title" className="text-2xl font-bold text-slate-900">
              Request a Refill
            </h2>
            <p className="mt-2 text-slate-600">
              Easily request your prescription refills online.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close refill request form"
            className="p-2 -mr-2 -mt-2 rounded-full text-slate-500 hover:bg-rose-mist hover:text-slate-800 transition-colors"
          >
            <XIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="flex-grow text-center py-8 overflow-y-auto" aria-live="polite">
            <h3 className="text-2xl font-semibold text-success">Refill Request Sent!</h3>
            <p className="mt-2 text-slate-600">Thank you. We have received your refill request and will process it shortly. We will contact you if there are any issues.</p>
            <button
              onClick={onClose}
              className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-sm text-base font-medium text-white bg-burgundy hover:bg-burgundy-dark"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-grow space-y-6 overflow-y-auto pr-2 hide-scrollbar">
            <div>
              <label htmlFor="refill-patientName" className="block text-sm font-medium text-slate-700">Patient Full Name</label>
              <input 
                type="text" 
                name="patientName" 
                id="refill-patientName" 
                value={formData.patientName} 
                onChange={handleChange} 
                required 
                className={getInputClassName('patientName')}
                aria-invalid={errors.patientName ? "true" : "false"}
                aria-describedby={errors.patientName ? 'refill-patientName-error' : undefined}
              />
              {errors.patientName && <p id="refill-patientName-error" className="mt-1 text-sm text-error">{errors.patientName}</p>}
            </div>
            <div>
              <label htmlFor="refill-dob" className="block text-sm font-medium text-slate-700">Date of Birth</label>
              <input 
                type="date" 
                name="dob" 
                id="refill-dob" 
                value={formData.dob} 
                onChange={handleChange} 
                required 
                className={getInputClassName('dob')}
                aria-invalid={errors.dob ? "true" : "false"}
                aria-describedby={errors.dob ? 'refill-dob-error' : undefined}
              />
              {errors.dob && <p id="refill-dob-error" className="mt-1 text-sm text-error">{errors.dob}</p>}
            </div>
            <div>
              <label htmlFor="refill-phone" className="block text-sm font-medium text-slate-700">Phone Number</label>
              <input 
                type="tel" 
                name="phone" 
                id="refill-phone" 
                value={formData.phone} 
                onChange={handleChange} 
                required 
                className={getInputClassName('phone')}
                aria-invalid={errors.phone ? "true" : "false"}
                aria-describedby={errors.phone ? 'refill-phone-error' : undefined}
              />
              {errors.phone && <p id="refill-phone-error" className="mt-1 text-sm text-error">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="refill-email" className="block text-sm font-medium text-slate-700">Email Address (Optional)</label>
              <input 
                type="email" 
                name="email" 
                id="refill-email" 
                value={formData.email} 
                onChange={handleChange} 
                className={getInputClassName('email')}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? 'refill-email-error' : undefined}
              />
              {errors.email && <p id="refill-email-error" className="mt-1 text-sm text-error">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="refill-prescriptionNumbers" className="block text-sm font-medium text-slate-700">Prescription Number(s) <span className="text-red-500">*</span></label>
              <textarea 
                id="refill-prescriptionNumbers" 
                name="prescriptionNumbers" 
                rows={3} 
                value={formData.prescriptionNumbers} 
                onChange={handleChange} 
                placeholder="Enter one or more prescription numbers, separated by commas or new lines." 
                required
                className={getTextAreaClassName('prescriptionNumbers')}
                aria-invalid={errors.prescriptionNumbers ? "true" : "false"}
                aria-describedby={errors.prescriptionNumbers ? 'refill-prescriptionNumbers-error' : undefined}
              ></textarea>
              {errors.prescriptionNumbers && <p id="refill-prescriptionNumbers-error" className="mt-1 text-sm text-error">{errors.prescriptionNumbers}</p>}
            </div>
            <div>
              <label htmlFor="refill-medicationNames" className="block text-sm font-medium text-slate-700">Medication Name(s) (Optional)</label>
              <textarea 
                id="refill-medicationNames" 
                name="medicationNames" 
                rows={2} 
                value={formData.medicationNames} 
                onChange={handleChange} 
                placeholder="e.g., Metformin, Lisinopril" 
                className={getTextAreaClassName('medicationNames')}
                aria-invalid={errors.medicationNames ? "true" : "false"}
                aria-describedby={errors.medicationNames ? 'refill-medicationNames-error' : undefined}
              ></textarea>
              {errors.medicationNames && <p id="refill-medicationNames-error" className="mt-1 text-sm text-error">{errors.medicationNames}</p>}
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Preferred Service</legend>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <input
                    id="service-pickup"
                    name="preferredService"
                    type="radio"
                    value="pickup"
                    checked={formData.preferredService === 'pickup'}
                    onChange={handleChange}
                    className="focus:ring-burgundy h-4 w-4 text-burgundy border-slate-300"
                  />
                  <label htmlFor="service-pickup" className="ml-3 block text-sm font-medium text-slate-700">
                    Pickup at Pharmacy
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="service-delivery"
                    name="preferredService"
                    type="radio"
                    value="delivery"
                    checked={formData.preferredService === 'delivery'}
                    onChange={handleChange}
                    className="focus:ring-burgundy h-4 w-4 text-burgundy border-slate-300"
                  />
                  <label htmlFor="service-delivery" className="ml-3 block text-sm font-medium text-slate-700">
                    Local Delivery
                  </label>
                </div>
              </div>
            </fieldset>

            <div>
              <label htmlFor="refill-notes" className="block text-sm font-medium text-slate-700">Additional Notes (Optional)</label>
              <textarea 
                id="refill-notes" 
                name="notes" 
                rows={2} 
                value={formData.notes} 
                onChange={handleChange} 
                placeholder="Any special instructions or questions about this refill?" 
                className={getTextAreaClassName('notes')}
                aria-invalid={errors.notes ? "true" : "false"}
                aria-describedby={errors.notes ? 'refill-notes-error' : undefined}
              ></textarea>
              {errors.notes && <p id="refill-notes-error" className="mt-1 text-sm text-error">{errors.notes}</p>}
            </div>

            <div className="relative flex items-start pt-2">
              <div className="flex items-center h-5">
                <input 
                  id="refill-consent" 
                  name="consent" 
                  type="checkbox" 
                  checked={formData.consent} 
                  onChange={handleChange} 
                  required 
                  className={`focus:ring-burgundy h-4 w-4 text-burgundy rounded ${errors.consent ? 'border-red-500' : 'border-slate-300'}`}
                  aria-invalid={errors.consent ? "true" : "false"}
                  aria-describedby="refill-consent-description"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="refill-consent" className="font-medium text-slate-700">I acknowledge that this information will be used to process my refill request.</label>
                <p id="refill-consent-description" className="text-slate-500">For medical emergencies, please call 911.</p>
              </div>
            </div>
            {errors.consent && <p id="refill-consent-error" className="-mt-4 text-sm text-error">{errors.consent}</p>}
            
            <div className="pt-4">
              <button type="submit" disabled={status === 'submitting'} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-sm text-base font-medium text-white bg-burgundy hover:bg-burgundy-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-burgundy disabled:bg-slate-400">
                {status === 'submitting' ? 'Submitting Request...' : 'Submit Refill Request'}
              </button>
            </div>
            {status === 'error' && <p className="text-center text-sm text-error" aria-live="polite">{apiError || 'Something went wrong. Please try again.'}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default RefillRequestModal;