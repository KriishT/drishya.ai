"use client";

import ResizablePanels from "@/components/ResizeablePanels";
import CodeEditor from "@/components/CodeEditor";
import VisualizerPanel from "@/components/Visualizer";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-[#ECE9D8]">
      {/* Windows XP Title Bar with Controls */}
      <header className="bg-gradient-to-r from-[#0058E9] to-[#3F8CF3] px-2 py-1 flex items-center justify-between shadow-[0_2px_3px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          {/* Window Icon */}
          <div
            className="w-5 h-5 flex items-center justify-center rounded-sm"
            style={{
              background: "linear-gradient(135deg, #FFFFFF 0%, #E0E0E0 100%)",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-xs">📊</span>
          </div>

          <h1 className="text-white font-['Tahoma'] text-sm font-bold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            LeetCode Visualizer
          </h1>
        </div>

        {/* Windows XP Window Controls */}
        <div className="flex items-center gap-0.5">
          {/* Minimize Button */}
          <button
            className="w-5 h-5 flex items-center justify-center transition-colors hover:bg-[#0066FF]"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
            }}
            title="Minimize"
          >
            <span
              className="text-white text-xs font-bold"
              style={{ marginTop: "4px" }}
            >
              _
            </span>
          </button>

          {/* Maximize Button */}
          <button
            className="w-5 h-5 flex items-center justify-center transition-colors hover:bg-[#0066FF]"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
            }}
            title="Maximize"
          >
            <div
              className="w-2.5 h-2.5 border border-white"
              style={{ marginTop: "-1px" }}
            ></div>
          </button>

          {/* Close Button */}
          <button
            className="w-5 h-5 flex items-center justify-center transition-colors hover:bg-[#E81123]"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
            }}
            title="Close"
          >
            <span className="text-white text-xs font-bold">×</span>
          </button>
        </div>
      </header>

      {/* Split Panel Content */}
      <ResizablePanels left={<CodeEditor />} right={<VisualizerPanel />} />
    </div>
  );
}
