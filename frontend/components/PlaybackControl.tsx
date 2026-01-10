"use client";

import { useVisualizerStore } from "@/lib/store";
import { useEffect } from "react";
import MediaButton from "./MediaButton";

export default function PlaybackControl() {
  const {
    steps,
    currentStepIndex,
    isPlaying,
    playbackSpeed,
    setCurrentStepIndex,
    nextStep,
    prevStep,
    setIsPlaying,
    setPlaybackSpeed,
  } = useVisualizerStore();

  const totalSteps = steps.length;

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || currentStepIndex >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const interval = setInterval(() => {
      nextStep();
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [
    isPlaying,
    currentStepIndex,
    totalSteps,
    playbackSpeed,
    nextStep,
    setIsPlaying,
  ]);

  if (totalSteps === 0) {
    return null;
  }

  return (
    <div
      className="border-t-2 border-[#808080] p-4"
      style={{
        background:
          "linear-gradient(to bottom, #E8E8E8 0%, #D4D0C8 50%, #C0C0C0 50%, #ABABAB 100%)",
        boxShadow: "inset 0 2px 3px rgba(0,0,0,0.15)",
      }}
    >
      {/* Windows Media Player Style Control Panel */}
      <div
        className="rounded-sm p-4 mb-3"
        style={{
          background:
            "linear-gradient(135deg, #5A5A5A 0%, #404040 50%, #2B2B2B 50%, #1A1A1A 100%)",
          border: "1px solid #000",
          boxShadow:
            "inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        {/* LED-style Status Indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                background: isPlaying
                  ? "radial-gradient(circle, #00FF00 0%, #00AA00 100%)"
                  : "radial-gradient(circle, #FF4444 0%, #AA0000 100%)",
                boxShadow: isPlaying
                  ? "0 0 6px #00FF00, inset 0 1px 1px rgba(255,255,255,0.3)"
                  : "0 0 6px #FF4444, inset 0 1px 1px rgba(255,255,255,0.3)",
              }}
            ></div>
            <span className="text-[10px] font-['Tahoma'] text-[#00FF00] font-bold tracking-wider">
              {isPlaying ? "PLAYING" : "PAUSED"}
            </span>
          </div>

          {/* Digital Counter Display */}
          <div
            className="px-3 py-1 font-['Courier_New',monospace] text-xs rounded-sm"
            style={{
              background:
                "linear-gradient(to bottom, #1a1a1a 0%, #0a0a0a 100%)",
              border: "1px solid #000",
              color: "#00FF41",
              boxShadow:
                "inset 0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,255,65,0.3)",
              textShadow: "0 0 5px rgba(0,255,65,0.8)",
            }}
          >
            {String(currentStepIndex + 1).padStart(2, "0")} /{" "}
            {String(totalSteps).padStart(2, "0")}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Previous Step */}
          <MediaButton onClick={prevStep} disabled={currentStepIndex === 0}>
            |◀
          </MediaButton>

          {/* Play/Pause - Highlighted */}
          <MediaButton
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={currentStepIndex >= totalSteps - 1}
            isPlayButton={true}
            isPlaying={isPlaying}
          >
            {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
          </MediaButton>

          {/* Next Step */}
          <MediaButton
            onClick={nextStep}
            disabled={currentStepIndex >= totalSteps - 1}
          >
            ▶|
          </MediaButton>

          {/* Speed Control - Styled like volume knob */}
          <div
            className="ml-3 flex items-center gap-2 px-3 py-1.5 rounded-sm"
            style={{
              background:
                "linear-gradient(to bottom, #3A3A3A 0%, #2A2A2A 50%, #1A1A1A 50%, #0A0A0A 100%)",
              border: "1px solid #000",
              boxShadow:
                "inset 0 2px 3px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-xs font-['Tahoma'] font-bold text-[#C0C0C0]">
              ⚡
            </span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="text-xs font-['Tahoma'] font-bold focus:outline-none"
              style={{
                background:
                  "linear-gradient(to bottom, #FAFAFA 0%, #D0D0D0 100%)",
                border: "1px solid #808080",
                borderRadius: "2px",
                padding: "2px 6px",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
              }}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-2">
        {/* Windows XP Style Progress Bar with 3D effect */}
        <div
          className="w-full h-6 rounded-sm overflow-hidden relative"
          style={{
            background:
              "linear-gradient(to bottom, #FFFFFF 0%, #F0F0F0 50%, #E0E0E0 50%, #D0D0D0 100%)",
            border: "2px solid #808080",
            boxShadow:
              "inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          {/* Animated progress fill */}
          <div
            className="h-full transition-all duration-300 relative overflow-hidden"
            style={{
              width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
              background:
                "linear-gradient(to bottom, #91D8FF 0%, #5BC0FF 50%, #3FA9E8 50%, #2288CC 100%)",
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.2)",
            }}
          >
            {/* Animated shine effect */}
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
              }}
            ></div>
          </div>

          {/* Center text overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-xs font-['Tahoma'] font-bold"
              style={{
                color: "#000",
                textShadow:
                  "0 0 3px rgba(255,255,255,0.8), 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%
            </span>
          </div>
        </div>

        {/* Step Counter with 3D labels */}
        <div className="flex justify-between items-center">
          <div
            className="text-xs font-['Tahoma'] px-2 py-1 rounded-sm"
            style={{
              background:
                "linear-gradient(to bottom, #FAFAFA 0%, #E0E0E0 100%)",
              border: "1px solid #A0A0A0",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            <span className="font-bold text-black">
              Step {currentStepIndex + 1}
            </span>
            <span className="text-gray-600"> of {totalSteps}</span>
          </div>

          <div
            className="text-xs font-['Tahoma'] font-bold px-2 py-1 rounded-sm"
            style={{
              background:
                "linear-gradient(to bottom, #C8F0C8 0%, #90EE90 100%)",
              border: "1px solid #32CD32",
              color: "#006400",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            {totalSteps - currentStepIndex - 1} remaining
          </div>
        </div>
      </div>
    </div>
  );
}
