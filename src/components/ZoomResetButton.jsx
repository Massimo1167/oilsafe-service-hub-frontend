import React, { useState, useEffect } from 'react';
import './ZoomResetButton.css';

function ZoomResetButton() {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const checkZoom = () => {
      // Considera "zoomato" se devicePixelRatio > 1.05 (5% tolleranza)
      const currentlyZoomed = window.devicePixelRatio > 1.05;
      setIsZoomed(currentlyZoomed);
    };

    // Check iniziale
    checkZoom();

    // Check dopo ogni touch gesture
    const handleTouchEnd = () => {
      setTimeout(checkZoom, 100);
    };

    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', checkZoom);

    return () => {
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', checkZoom);
    };
  }, []);

  const resetZoom = () => {
    // Metodo 1: Manipolazione viewport meta tag
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      // Forza zoom a 1x impostando temporaneamente maximum-scale
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');

      // Rimuove il limite dopo 100ms
      setTimeout(() => {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }, 100);
    }
  };

  // Non mostrare il pulsante se non è zoomato
  if (!isZoomed) return null;

  return (
    <button
      className="zoom-reset-button"
      onClick={resetZoom}
      title="Resetta zoom a 100%"
      aria-label="Resetta zoom a 100%"
    >
      1×
    </button>
  );
}

export default ZoomResetButton;
