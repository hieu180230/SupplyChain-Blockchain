"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X } from 'lucide-react';

const Scanner = ({ onClose, onScan }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // Keep track of stream independently of video DOM
  const requestRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.async = true;
    script.onload = () => {
      if (isMounted) startCamera();
    };
    document.body.appendChild(script);

    return () => {
      isMounted = false;
      stopCamera();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      // Store stream in ref so we can stop it even if video element is gone
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true); 
        
        // Wrap play in a promise catch to handle "interrupted" error
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            // Auto-play was prevented or interrupted, usually fine to ignore in this context
            console.log("Playback prevented or interrupted (safely ignored):", error);
          });
        }
        
        requestRef.current = requestAnimationFrame(tick);
        setLoading(false);
      } else {
        // If ref is null, component unmounted during await, so stop stream immediately
        stopCamera(); 
      }
    } catch (err) {
      console.error(err);
      setScanError("Could not access camera. Please ensure permissions are granted.");
      setLoading(false);
    }
  };

  const stopCamera = () => {
    // Stop all tracks in the streamRef
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    // Clean up video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (canvas && video) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Check if jsQR is loaded globally
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
             onScan(code.data);
             return; // Stop scanning loop on success
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl relative">
        <div className="bg-slate-900 p-4 flex justify-between items-center">
            <h3 className="text-white font-bold flex items-center">
                <Camera className="w-5 h-5 mr-2 text-blue-400"/> Scan QR Code
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
            </button>
        </div>
        
        <div className="relative bg-black h-80 flex items-center justify-center">
            {loading && <p className="text-white animate-pulse">Initializing Camera...</p>}
            {scanError && <p className="text-red-400 px-6 text-center">{scanError}</p>}
            
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanner Overlay UI */}
            {!loading && !scanError && (
                <div className="absolute inset-0 border-2 border-blue-500/50 m-12 rounded-lg animate-pulse shadow-[0_0_0_999px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-blue-500 -ml-1 -mt-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-blue-500 -mr-1 -mt-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-blue-500 -ml-1 -mb-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-blue-500 -mr-1 -mb-1"></div>
                </div>
            )}
        </div>

        <div className="p-4 bg-slate-50 text-center text-sm text-slate-500">
            Point camera at a product QR code. <br/>
            <span className="text-xs text-slate-400">(Try pointing at a QR code containing TEST_CHAIN_001)</span>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
