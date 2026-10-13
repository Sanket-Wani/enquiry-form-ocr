"use client";

import { useState, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  FileText,
  Download,
} from "lucide-react";

interface DocumentViewerProps {
  documentUrl: string;
  documentName: string;
  mimeType?: string;
  className?: string;
}

export default function DocumentViewer({
  documentUrl,
  documentName,
  mimeType = "image/png",
  className = "",
}: DocumentViewerProps) {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isPdf = mimeType.toLowerCase().includes("pdf") || documentName.toLowerCase().endsWith(".pdf");

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col border border-neutral-200 rounded-md bg-neutral-50 overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-white p-4 max-w-none w-screen h-screen rounded-none"
          : `h-full min-h-[480px] ${className}`
      }`}
    >
      {/* Viewer Header & Controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-neutral-200 text-neutral-700 text-xs">
        <div className="flex items-center gap-2 truncate max-w-[45%]">
          <FileText className="w-4 h-4 text-neutral-500 shrink-0" />
          <span className="font-medium truncate text-neutral-900" title={documentName}>
            {documentName}
          </span>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-neutral-500 w-11 text-center select-none">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90°"
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset View"
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <span className="h-4 w-px bg-neutral-200 mx-1" />
            </>
          )}

          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Download / Open Original"
            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Document View Area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-100 relative min-h-[360px]">
        {isPdf ? (
          <iframe
            src={documentUrl}
            className="w-full h-full min-h-[600px] border-0 rounded bg-white shadow-sm"
            title={documentName}
          />
        ) : (
          <div
            className="transition-transform duration-150 ease-out flex items-center justify-center select-none"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={documentUrl}
              alt={documentName}
              className="max-w-full max-h-[75vh] object-contain rounded shadow-sm border border-neutral-200 bg-white"
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Subtle Caption Bar */}
      <div className="px-3 py-1.5 bg-white border-t border-neutral-200 text-[11px] text-neutral-500 flex justify-between items-center">
        <span>Original physical enquiry form</span>
        <span>Drag / scroll inside viewer to navigate</span>
      </div>
    </div>
  );
}
