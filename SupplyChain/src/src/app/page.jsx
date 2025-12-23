"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, AlertCircle, Scan, Loader2, Upload } from "lucide-react";

import Scanner from "../components/Scanner";
import Timeline from "../components/Timeline";
import ProductDetails from "../components/ProductDetails";
import { fetchBlockchainProduct } from "../data/Data"

const fetchProductById = async (id) => {
  return await fetchBlockchainProduct(id);
};


export default function App() {
  const [searchTerm, setSearchTerm] = useState('SUNSCREEN-ROH-20251007-4E3');
  const [data, setData] = useState(null); 
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { performSearch('SUNSCREEN-ROH-20251007-4E3'); }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const performSearch = async (id) => {
      setIsLoading(true);
      setError('');
      setData(null);
      
      try {
        const result = await fetchProductById(id);
        setData(result);
        setSearchTerm(id);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
  };

  const handleSearch = (e) => { e.preventDefault(); performSearch(searchTerm); };
  const handleScanSuccess = (scannedText) => { setIsScanning(false); performSearch(scannedText); };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            performSearch(code.data);
          } else {
            setError("Could not detect a QR code in the uploaded image.");
          }
        } else {
            setError("Scanner library is still loading. Please try again in a moment.");
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Supply Chain Lookup</h1>
        </header>

        <div className="max-w-2xl mx-auto mb-16">
          <form onSubmit={handleSearch} className="flex shadow-lg rounded-lg overflow-hidden relative">
            <div className="bg-white flex items-center px-4 py-3 flex-grow border border-r-0 border-slate-200 rounded-l-lg">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input 
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full outline-none text-slate-700 placeholder-slate-300 uppercase font-mono tracking-wider"
                placeholder="ENTER PRODUCT ID..." disabled={isLoading}
              />
              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleFileUpload}
              />

              {/* Upload Button */}
              <button 
                type="button" 
                onClick={() => fileInputRef.current.click()} 
                className="ml-2 p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all" 
                title="Upload QR Image" 
                disabled={isLoading}
              >
                <Upload className="w-5 h-5" />
              </button>

              {/* Camera Button */}
              <button 
                type="button" 
                onClick={() => setIsScanning(true)} 
                className="ml-1 p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all" 
                title="Scan QR Code" 
                disabled={isLoading}
              >
                <Scan className="w-5 h-5" />
              </button>
            </div>
            <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-8 py-3 transition-colors duration-200 flex items-center min-w-[120px] justify-center">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
        </div>

        {isLoading && !data && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse">
                <Loader2 className="w-12 h-12 mb-4 animate-spin text-blue-200" />
                <p>Tracking product...</p>
            </div>
        )}

        {data && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-fit">
              <h2 className="text-xl font-bold mb-6 text-slate-900 border-b pb-4">Journey</h2>
              <div className="mt-4">
                {data.timeline.map((item, index) => <Timeline key={index} item={item} isLast={index === data.timeline.length - 1} />)}
              </div>
            </div>
            <div className="lg:col-span-7"><ProductDetails data={data} /></div>
          </div>
        )}

        {isScanning && <Scanner onClose={() => setIsScanning(false)} onScan={handleScanSuccess} />}
      </div>
    </div>
  );
}
