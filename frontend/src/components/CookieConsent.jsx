import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent');
        const consentDate = localStorage.getItem('cookieConsentDate');

        if (!consent || !consentDate) {
            setIsVisible(true);
        } else {
            const parsedDate = parseInt(consentDate);
            if (Number.isNaN(parsedDate)) {
                // Corrupted data - reset and show
                setIsVisible(true);
            } else {
                // Check if 10 days have passed (10 * 24 * 60 * 60 * 1000 ms)
                const daysPassed = (Date.now() - parsedDate) / (1000 * 60 * 60 * 24);
                if (daysPassed >= 10) {
                    setIsVisible(true);
                }
            }
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        localStorage.setItem('cookieConsentDate', Date.now().toString());
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookieConsent', 'declined');
        localStorage.setItem('cookieConsentDate', Date.now().toString());
        setIsVisible(false);
        alert('Warning: Some features like Login will not work without cookies.');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-[#161618] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center gap-6">
                <div className="bg-blue-600/20 p-3 rounded-xl">
                    <Cookie className="w-8 h-8 text-blue-500" />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-white font-semibold text-lg mb-1">Cookie Consent</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        We use essential cookies to ensure our login system stays secure. By accepting, you enable secure sessions.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleDecline}
                        className="flex-1 md:flex-none px-6 py-2.5 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        Decline
                    </button>
                    <button 
                        onClick={handleAccept}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" /> Accept All
                    </button>
                </div>

                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default CookieConsent;
