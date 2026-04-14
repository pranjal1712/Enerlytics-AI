import { useState } from 'react';
import { FileText, File, ArrowLeft, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CookieConsent from '../components/CookieConsent';

export default function Upload({ setHasDocs, refreshWorkspace }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingType, setUploadingType] = useState(null); 
  const [uploadError, setUploadError] = useState(null);
  const navigate = useNavigate();

  const handleUpload = async (e, type) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingType(type);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const statusData = await res.json();
        if (refreshWorkspace) refreshWorkspace();
        const duration = 2500; 
        const interval = 30; 
        const step = 100 / (duration / interval);

        const timer = setInterval(() => {
          setUploadProgress(prev => {
            const next = prev + step;
            if (next >= 100) {
              clearInterval(timer);
              setTimeout(() => {
                // Navigate to the specific session created for this upload
                navigate('/chat', { state: { sessionId: statusData.session_id } });
              }, 800);
              return 100;
            }
            return next;
          });
        }, interval);

      } else {
        const error = await res.json();
        setUploadError(error.detail || "Upload rejected. Energy documents only.");
        setUploadingType(null);
        setTimeout(() => setUploadError(null), 6000);
      }
    } catch (err) {
      console.error(err);
      setUploadError("Network Error: Could not reach the validation server.");
      setUploadingType(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDemoMode = () => {
    setUploadingType('pdf');
    setIsUploading(true);
    // Simulate a successful demo upload
    let prog = 0;
    const interval = setInterval(() => {
        prog += 5;
        setUploadProgress(prog);
        if (prog >= 100) {
            clearInterval(interval);
            setTimeout(() => navigate('/chat'), 500);
        }
    }, 100);
  };

  return (
    <div className="upload-page-wrapper">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="logo-brand-container" style={{ width: '40px', height: '40px', padding: '4px' }}>
          <img src="/logo.png" alt="Logo" className="logo-brand-img" />
        </div>
        <span className="text-2xl font-bold text-white tracking-widest">ENERLYTICS <span className="text-energy">AI</span></span>
      </div>

      <div className="upload-content-container">
        <div className="upload-header-section">
          <h1 className="upload-main-title">Intelligence <span className="text-energy">Refining</span></h1>
          <p className="upload-subtitle">
            Upload your technical raw data and let our neural network 
            refine it into high-octane insights.
          </p>
          
          <button className="demo-mode-btn" onClick={handleDemoMode}>
            Need a Spark? Use Sample PDF
          </button>
        </div>

        {uploadError && (
          <div className="upload-error-alert glow-red" style={{ margin: '0 auto 2rem auto' }}>
            <div className="flex items-center gap-3">
              <div className="error-icon-circle">!</div>
              <span className="error-message-text">{uploadError}</span>
            </div>
          </div>
        )}

        <div className="premium-card-grid">
          <div className={`flip-card ${uploadingType === 'pdf' ? 'flipped' : ''} large-card`}>
            <div className="flip-card-inner">
              <div className="card-front glow-green-card" onClick={() => !isUploading && document.getElementById('pdf-upload').click()}>
                <div className="card-icon-wrapper"><FileText size={72} strokeWidth={1.5} /></div>
                <h3 className="card-title">Analyze PDF</h3>
                <p className="card-desc">Advanced extraction of structural data from technical energy reports and grid specifications.</p>
                <input id="pdf-upload" type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'pdf')} />
                <div className="card-cta">Select Technical Assets <ArrowRight size={18} /></div>
              </div>
              <div className="card-back glow-green-card">
                <div className="circular-gauge-container">
                  <svg className="circular-gauge-svg" viewBox="0 0 180 180">
                    <circle className="gauge-bg" cx="90" cy="90" r="80" fill="none" strokeWidth={6} />
                    <circle className="gauge-progress" cx="90" cy="90" r="80" fill="none" strokeWidth={6} strokeDasharray={`${(uploadProgress / 100) * 502} 502`} />
                  </svg>
                  <div className="gauge-text-container">
                    <span className="gauge-percentage">{Math.round(uploadProgress)}%</span>
                  </div>
                </div>
                <div className="analysis-status-group">
                  <span className="analysis-status">Neural Processing</span>
                  <p className="analysis-subtext">Optimizing knowledge vectors...</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`flip-card ${uploadingType === 'docs' ? 'flipped' : ''} large-card`}>
            <div className="flip-card-inner">
              <div className="card-front glow-green-card" onClick={() => !isUploading && document.getElementById('docx-upload').click()}>
                <div className="card-icon-wrapper"><File size={72} strokeWidth={1.5} /></div>
                <h3 className="card-title">Analyze DOCX</h3>
                <p className="card-desc">Fast-track technical specifications and architectural energy blueprints for rapid context bridging.</p>
                <input id="docx-upload" type="file" accept=".docx,.doc" multiple style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'docs')} />
                <div className="card-cta">Select Document Assets <ArrowRight size={18} /></div>
              </div>
              <div className="card-back glow-green-card">
                <div className="circular-gauge-container">
                  <svg className="circular-gauge-svg" viewBox="0 0 180 180">
                    <circle className="gauge-bg" cx="90" cy="90" r="80" fill="none" strokeWidth={6} />
                    <circle className="gauge-progress" cx="90" cy="90" r="80" fill="none" strokeWidth={6} strokeDasharray={`${(uploadProgress / 100) * 502} 502`} />
                  </svg>
                  <div className="gauge-text-container">
                    <span className="gauge-percentage">{Math.round(uploadProgress)}%</span>
                  </div>
                </div>
                <div className="analysis-status-group">
                  <span className="analysis-status">Context Bridge</span>
                  <p className="analysis-subtext">Structuring semantic data...</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button className="back-to-chat" onClick={() => navigate('/chat')}>
          <ArrowLeft size={18} /> Skip to Workspace
        </button>
      </div>
      <CookieConsent />
    </div>
  );
}
