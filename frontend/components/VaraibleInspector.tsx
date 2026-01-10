"use client";

import { useVisualizerStore } from "@/lib/store";
import { useEffect, useState } from "react";

export default function VariableInspector() {
  const steps = useVisualizerStore((state) => state.steps);
  const currentStepIndex = useVisualizerStore(
    (state) => state.currentStepIndex
  );
  const currentStep = steps[currentStepIndex];

  const variables = currentStep?.variables || {};

  // Track which variables changed (for highlight animation)
  const [changedVars, setChangedVars] = useState<Set<string>>(new Set());
  const [prevVariables, setPrevVariables] = useState<Record<string, any>>({});

  // Detect variable changes
  useEffect(() => {
    const changed = new Set<string>();

    Object.keys(variables).forEach((key) => {
      if (prevVariables[key] !== variables[key]) {
        changed.add(key);
      }
    });

    if (changed.size > 0) {
      setChangedVars(changed);

      const timer = setTimeout(() => {
        setChangedVars(new Set());
      }, 800);

      return () => clearTimeout(timer);
    }

    setPrevVariables(variables);
  }, [currentStepIndex, variables]);

  // Get icon based on variable type
  const getVariableIcon = (value: any) => {
    if (Array.isArray(value)) return "📋";
    if (typeof value === "object" && value !== null) return "📁";
    if (typeof value === "number") return "🔢";
    if (typeof value === "string") return "📄";
    if (typeof value === "boolean") return "✓";
    return "📌";
  };

  return (
    <div
      className="border-t-2 border-[#808080] shadow-[inset_0_2px_3px_rgba(0,0,0,0.1)]"
      style={{
        background: "linear-gradient(to bottom, #D4D0C8 0%, #C0BCB4 100%)",
      }}
    >
      {/* Windows Explorer Style Header */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b"
        style={{
          background: "linear-gradient(to bottom, #EAE8E6 0%, #D4D0C8 100%)",
          borderBottom: "1px solid #808080",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <h3 className="text-xs font-['Tahoma'] font-bold text-black">
            Variables
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {currentStep && (
            <div
              className="text-[10px] font-['Tahoma'] px-2 py-0.5 rounded-sm"
              style={{
                background:
                  "linear-gradient(to bottom, #FFFFFF 0%, #E8E8E8 100%)",
                border: "1px solid #A0A0A0",
                color: "#003399",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 1px rgba(0,0,0,0.2)",
              }}
            >
              Step {currentStepIndex + 1}
            </div>
          )}
        </div>
      </div>

      {/* Windows Explorer Style List View */}
      <div
        className="max-h-36 overflow-y-auto"
        style={{
          background: "#FFFFFF",
          margin: "2px",
          border: "1px solid #808080",
          boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
        }}
      >
        {Object.entries(variables).length > 0 ? (
          <div className="text-xs">
            {/* Column Headers - Windows Explorer Style */}
            <div
              className="flex items-center sticky top-0 z-10 border-b"
              style={{
                background:
                  "linear-gradient(to bottom, #E8E8E8 0%, #D0D0D0 100%)",
                borderBottom: "1px solid #808080",
                padding: "3px 4px",
              }}
            >
              <div className="w-8"></div>
              <div className="flex-1 font-['Tahoma'] font-bold text-[10px] text-black">
                Name
              </div>
              <div className="flex-1 font-['Tahoma'] font-bold text-[10px] text-black">
                Value
              </div>
              <div className="w-16 font-['Tahoma'] font-bold text-[10px] text-black text-center">
                Type
              </div>
            </div>

            {/* Variable Rows - Alternating colors like Windows Explorer */}
            {Object.entries(variables).map(([key, value], index) => {
              const isChanged = changedVars.has(key);
              const isEven = index % 2 === 0;

              return (
                <div
                  key={key}
                  className={`
                    flex items-center transition-all duration-300 border-b border-[#E0E0E0]
                    ${isChanged ? "animate-pulse" : ""}
                  `}
                  style={{
                    background: isChanged
                      ? "linear-gradient(to right, #FFF9E6 0%, #FFFACD 100%)"
                      : isEven
                      ? "#FFFFFF"
                      : "#F5F5F5",
                    padding: "4px",
                    boxShadow: isChanged ? "inset 0 0 0 1px #FFD700" : "none",
                  }}
                >
                  {/* Icon */}
                  <div className="w-8 flex items-center justify-center text-sm">
                    {getVariableIcon(value)}
                  </div>

                  {/* Variable Name */}
                  <div className="flex-1 font-['Tahoma'] font-bold text-[#003399] truncate pr-2">
                    {key}
                  </div>

                  {/* Variable Value */}
                  <div
                    className={`
                      flex-1 font-['Courier_New',monospace] truncate pr-2 transition-colors duration-300
                      ${isChanged ? "text-[#CC6600] font-bold" : "text-black"}
                    `}
                  >
                    {JSON.stringify(value)}
                  </div>

                  {/* Type Badge */}
                  <div className="w-16 flex justify-center">
                    <span
                      className="text-[9px] font-['Tahoma'] px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: Array.isArray(value)
                          ? "linear-gradient(to bottom, #C8E6FF 0%, #A0D0FF 100%)"
                          : typeof value === "number"
                          ? "linear-gradient(to bottom, #FFE6C8 0%, #FFD0A0 100%)"
                          : "linear-gradient(to bottom, #E0E0E0 0%, #C0C0C0 100%)",
                        border: "1px solid #808080",
                        color: "#000",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                      }}
                    >
                      {Array.isArray(value)
                        ? "[]"
                        : typeof value === "number"
                        ? "#"
                        : "T"}
                    </span>
                  </div>

                  {/* Change Indicator */}
                  {isChanged && (
                    <div className="w-6 flex items-center justify-center">
                      <span
                        className="text-[10px] animate-bounce"
                        style={{
                          color: "#FFD700",
                          textShadow: "0 0 4px rgba(255,215,0,0.8)",
                        }}
                      >
                        ✦
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="text-center py-8"
            style={{
              background:
                "linear-gradient(to bottom, #FFFFFF 0%, #F8F8F8 100%)",
            }}
          >
            <div className="text-4xl mb-2 opacity-40">📂</div>
            <p className="text-xs font-['Tahoma'] text-gray-600 italic">
              No variables tracked yet
            </p>
            <p className="text-[10px] font-['Tahoma'] text-gray-500 mt-1">
              Variables will appear as code executes
            </p>
          </div>
        )}
      </div>

      {/* Windows Explorer Status Bar */}
      <div
        className="px-3 py-1.5 flex items-center justify-between text-[10px] font-['Tahoma'] border-t"
        style={{
          background: "linear-gradient(to bottom, #E8E8E8 0%, #D0D0D0 100%)",
          borderTop: "1px solid #FFFFFF",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="px-2 py-0.5 rounded-sm"
            style={{
              background: "#FFFFFF",
              border: "1px solid #A0A0A0",
              boxShadow: "inset 1px 1px 1px rgba(0,0,0,0.05)",
            }}
          >
            <span className="text-gray-700">
              {Object.keys(variables).length} object
              {Object.keys(variables).length !== 1 ? "s" : ""}
            </span>
          </div>

          {changedVars.size > 0 && (
            <div
              className="px-2 py-0.5 rounded-sm animate-pulse flex items-center gap-1"
              style={{
                background:
                  "linear-gradient(to bottom, #FFF9E6 0%, #FFFACD 100%)",
                border: "1px solid #FFD700",
                boxShadow: "0 0 4px rgba(255,215,0,0.3)",
              }}
            >
              <span className="text-[#CC6600] font-bold">⚡</span>
              <span className="text-[#CC6600] font-bold">
                {changedVars.size} updated
              </span>
            </div>
          )}
        </div>

        <div className="text-gray-600">Ready</div>
      </div>
    </div>
  );
}
