import './LoadingSpinner.css';

export function LoadingSpinner() {
    return (
        <div className="loading-container">
            <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <span className="loading-icon">🏥</span>
            </div>
            <p className="loading-text">Loading health data...</p>
        </div>
    );
}
