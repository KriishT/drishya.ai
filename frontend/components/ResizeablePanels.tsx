"use client";

import { useState } from "react";

interface ResizablePanelsProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export default function ResizablePanels({ left, right }: ResizablePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(50); // percentage

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Clamp between 20% and 80%
      setLeftWidth(Math.min(Math.max(newWidth, 20), 80));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div style={{ width: `${leftWidth}%` }} className="overflow-auto">
        {left}
      </div>

      {/* Windows XP Style Divider */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 cursor-col-resize relative transition-colors hover:bg-[#0078D7]"
        style={{
          background: "linear-gradient(to right, #FFFFFF, #D4D0C8, #808080)",
          boxShadow:
            "inset 1px 0 0 rgba(255,255,255,0.8), inset -1px 0 0 rgba(0,0,0,0.2)",
        }}
      >
        {/* Grip dots for visual feedback */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-50">
          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
          <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: `${100 - leftWidth}%` }} className="overflow-auto">
        {right}
      </div>
    </div>
  );
}
