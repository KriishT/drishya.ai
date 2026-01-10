"use client";

import { useVisualizerStore } from "@/lib/store";
import VariableInspector from "./VaraibleInspector";
import PlaybackControls from "./PlaybackControl";
import ArrayVisualizer from "./ArrayVisualizer";
import TreeVisualizer from "./TreeVisualizer";

export default function VisualizerPanel() {
  const { steps, dataStructureType, error, aiAnalysis, isLoading } =
    useVisualizerStore();

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8]">
      {/* Visualization Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* AI Analysis Banner - Windows XP Info Bar Style */}
        {aiAnalysis && (
          <div className="bg-[#D4D0C8] border-b-2 border-[#808080] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex items-center gap-2 text-xs font-['Tahoma']">
              <span className="font-bold text-[#003399]">AI Detected:</span>
              <span className="text-black">{aiAnalysis.detectedStructure}</span>
              <span className="text-gray-500">•</span>
              <span className="text-black">{aiAnalysis.algorithmPattern}</span>
              <span className="text-gray-500">•</span>
              <span className="font-bold text-green-700">
                {Math.round(aiAnalysis.confidence * 100)}% confident
              </span>
            </div>
          </div>
        )}

        {/* Error Banner - Windows XP Error Style */}
        {error && (
          <div className="bg-[#FFF5F5] border-2 border-[#C00000] m-3 rounded-sm shadow-[2px_2px_3px_rgba(0,0,0,0.2)]">
            <div className="bg-gradient-to-r from-[#C00000] to-[#E00000] px-3 py-1">
              <p className="text-white font-['Tahoma'] text-xs font-bold">
                Error
              </p>
            </div>
            <div className="p-3 flex items-start gap-2">
              <span className="text-2xl">⚠️</span>
              <p className="text-black font-['Tahoma'] text-xs flex-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Main Visualization - White Canvas with Subtle Background */}
        <div
          className="flex-1 bg-white border-2 border-[#7F9DB9] m-2 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)] flex items-center justify-center relative overflow-hidden"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(0, 120, 215, 0.02) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(50, 205, 50, 0.02) 0%, transparent 50%),
              linear-gradient(135deg, 
                transparent 0%, 
                rgba(236, 233, 216, 0.15) 25%, 
                transparent 50%, 
                rgba(212, 208, 200, 0.15) 75%, 
                transparent 100%
              ),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 40px,
                rgba(180, 180, 180, 0.03) 40px,
                rgba(180, 180, 180, 0.03) 41px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 40px,
                rgba(180, 180, 180, 0.03) 40px,
                rgba(180, 180, 180, 0.03) 41px
              ),
              linear-gradient(to bottom, #FFFFFF 0%, #FEFEFE 100%)
            `,
          }}
        >
          {/* Subtle corner decorations - Windows XP style */}
          <div
            className="absolute top-0 left-0 w-32 h-32 opacity-[0.02] pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at top left, #0078D7 0%, transparent 70%)",
            }}
          ></div>
          <div
            className="absolute bottom-0 right-0 w-32 h-32 opacity-[0.02] pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at bottom right, #32CD32 0%, transparent 70%)",
            }}
          ></div>

          {/* Content */}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-center">
                <div
                  className="inline-block w-10 h-10 border-4 border-[#0078D7] border-t-transparent rounded-full animate-spin mb-3"
                  style={{
                    boxShadow: "0 0 10px rgba(0,120,215,0.3)",
                  }}
                ></div>
                <p className="text-sm font-['Tahoma'] text-gray-700">
                  Analyzing code with AI...
                </p>
              </div>
            ) : steps.length > 0 ? (
              dataStructureType === "array" ? (
                <ArrayVisualizer />
              ) : dataStructureType === "tree" ? (
                <TreeVisualizer />
              ) : (
                <div className="text-gray-600 text-center">
                  <p className="text-sm font-['Tahoma']">
                    Visualization for {dataStructureType} coming soon!
                  </p>
                </div>
              )
            ) : (
              <div className="text-gray-600 text-center">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-sm font-['Tahoma'] font-bold">
                  Visualization will appear here
                </p>
                <p className="text-xs font-['Tahoma'] text-gray-500 mt-2">
                  Write code and click Run to see the magic!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variable Inspector */}
      {steps.length > 0 && <VariableInspector />}

      {/* Playback Controls */}
      {steps.length > 0 && <PlaybackControls />}
    </div>
  );
}
