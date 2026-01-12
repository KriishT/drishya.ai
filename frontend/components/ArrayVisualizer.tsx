"use client";

import { useVisualizerStore } from "@/lib/store";
import { useEffect, useState } from "react";

export default function ArrayVisualizer() {
  const steps = useVisualizerStore((state) => state.steps);
  const currentStepIndex = useVisualizerStore(
    (state) => state.currentStepIndex
  );
  const currentStep = steps[currentStepIndex];

  // Track recently accessed indices for highlight
  const [accessedIndices, setAccessedIndices] = useState<number[]>([]);

  // Update accessed indices when step changes
  useEffect(() => {
    if (
      currentStep?.type === "array_access" &&
      currentStep.code?.index !== undefined
    ) {
      setAccessedIndices([currentStep.code.index]);

      // Clear after animation duration
      const timer = setTimeout(() => {
        setAccessedIndices([]);
      }, 600);

      return () => clearTimeout(timer);
    } else {
      setAccessedIndices([]);
    }
  }, [currentStepIndex, currentStep]);

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        <p className="font-['Tahoma'] text-sm">No data to visualize</p>
      </div>
    );
  }

  const {
    array,
    arrays,
    arrayNames,
    highlightedIndices = [],
    highlightedArrayIndices = [], // ✅ Per-array highlights
    description,
    accessedValue,
    accessedArrayIndex,
    result,
  } = currentStep;

  // ✅ Check if we have multiple arrays
  const hasMultipleArrays = arrays && arrays.length > 1;
  const displayArrays = hasMultipleArrays ? arrays : [array];
  const displayNames = arrayNames || ["nums"];

  // ✅ Helper: Get color for each array
  const getArrayColor = (index: number) => {
    const colors = [
      {
        border: "#0078D7",
        gradient:
          "linear-gradient(to bottom, #B4D4F7 0%, #6BB4F7 50%, #3F8CF3 50%, #0078D7 100%)",
      },
      {
        border: "#32CD32",
        gradient:
          "linear-gradient(to bottom, #C8F0C8 0%, #90EE90 50%, #5FD35F 50%, #32CD32 100%)",
      },
      {
        border: "#FF6B6B",
        gradient:
          "linear-gradient(to bottom, #FFB3B3 0%, #FF8A8A 50%, #FF6B6B 50%, #E85555 100%)",
      },
      {
        border: "#9B59B6",
        gradient:
          "linear-gradient(to bottom, #D7BDE2 0%, #C39BD3 50%, #A97ABB 50%, #9B59B6 100%)",
      },
    ];
    return colors[index % colors.length];
  };

  // ✅ Render single array with per-array highlighting
  const renderArray = (arr: any[], arrIndex: number = 0) => {
    if (!arr) return null;

    const colorScheme = getArrayColor(arrIndex);

    // ✅ Get highlights for THIS specific array
    const arrayHighlights = highlightedArrayIndices[arrIndex] || [];

    // ✅ Check if this array should be "active" or "inactive"
    const isActiveArray = arrayHighlights.length > 0;
    const hasAnyActiveArray = highlightedArrayIndices.some(
      (arr) => arr && arr.length > 0
    );
    const isInactiveArray =
      hasMultipleArrays && !isActiveArray && hasAnyActiveArray;

    return (
      <div
        className="flex justify-center items-end gap-3 flex-wrap"
        style={{
          opacity: isInactiveArray ? 0.3 : 1,
          transition: "opacity 300ms ease-in-out",
          filter: isInactiveArray ? "grayscale(50%)" : "none",
        }}
      >
        {arr.map((value, index) => {
          // ✅ Only highlight if THIS array's highlights include this index
          const isHighlighted = arrayHighlights.includes(index);

          // ✅ Check if being accessed AND it's THIS specific array
          const isAccessed =
            currentStep?.type === "array_access" &&
            currentStep?.code?.index === index &&
            accessedArrayIndex === arrIndex;

          // Windows XP color palette
          let boxGradient =
            "linear-gradient(to bottom, #F0F0F0 0%, #D0D0D0 50%, #C0C0C0 50%, #A0A0A0 100%)";
          let borderColor = "#808080";
          let textColor = "text-black";
          let indicator = null;
          let shadowStyle = "0 2px 4px rgba(0,0,0,0.3)";

          if (isAccessed) {
            // Windows XP Success Green - BEING ACCESSED RIGHT NOW
            boxGradient =
              "linear-gradient(to bottom, #C8F0C8 0%, #90EE90 50%, #5FD35F 50%, #32CD32 100%)";
            borderColor = "#228B22";
            textColor = "text-white";
            shadowStyle =
              "0 0 12px rgba(50,205,50,0.6), 0 2px 4px rgba(0,0,0,0.3)";
            indicator = (
              <div
                className="text-sm font-bold animate-bounce px-2 py-0.5 rounded-sm"
                style={{
                  background:
                    "linear-gradient(to bottom, #90EE90 0%, #32CD32 100%)",
                  border: "1px solid #228B22",
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                ✓
              </div>
            );
          } else if (isHighlighted) {
            // Use array-specific color for highlighting
            boxGradient = colorScheme.gradient;
            borderColor = colorScheme.border;
            textColor = "text-white";
            shadowStyle = `0 0 10px ${colorScheme.border}80, 0 2px 4px rgba(0,0,0,0.3)`;
            indicator = (
              <div
                className="text-sm font-bold px-2 py-0.5 rounded-sm"
                style={{
                  background: colorScheme.gradient,
                  border: `1px solid ${colorScheme.border}`,
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                ▲
              </div>
            );
          }

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2 transition-all duration-300"
            >
              {/* Index Label - Windows Style */}
              <div
                className="text-xs font-['Courier_New',monospace] font-bold w-16 text-center px-2 py-0.5 rounded-sm"
                style={{
                  background: "white",
                  border: "1px solid #7F9DB9",
                  color: "#003399",
                  boxShadow: "inset 1px 1px 1px rgba(0,0,0,0.05)",
                }}
              >
                [{index}]
              </div>

              {/* Array Element - Pixelated Box */}
              <div
                className={`
                  w-16 h-16 flex items-center justify-center
                  font-['Courier_New',monospace] text-xl font-bold
                  transition-all duration-300
                  ${textColor}
                  ${
                    isAccessed
                      ? "scale-110"
                      : isHighlighted
                      ? "scale-105"
                      : "scale-100"
                  }
                `}
                style={{
                  background: boxGradient,
                  border: `2px solid ${borderColor}`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), ${shadowStyle}`,
                  borderRadius: "2px",
                  imageRendering: "pixelated",
                  textShadow:
                    textColor === "text-white"
                      ? "0 1px 2px rgba(0,0,0,0.5)"
                      : "none",
                }}
              >
                {value}
              </div>

              {/* Indicator */}
              <div className="h-6">{indicator}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Step Number - Windows XP Status Bar Style */}
      <div className="mb-4 flex justify-center">
        <div
          className="px-3 py-1 rounded-sm"
          style={{
            background: "linear-gradient(to bottom, #FAFAFA 0%, #E0E0E0 100%)",
            border: "1px solid #808080",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
          <span className="text-xs text-black font-['Tahoma'] font-bold">
            Step {currentStepIndex + 1} / {steps.length}
          </span>
        </div>
      </div>

      {/* Description - Windows XP Info Panel */}
      <div className="mb-6 flex justify-center">
        <div
          className="px-4 py-2 rounded-sm max-w-2xl"
          style={{
            background: "linear-gradient(to bottom, #FFF8DC 0%, #FFFACD 100%)",
            border: "1px solid #D4A017",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          <p className="text-sm text-black font-['Tahoma'] text-center">
            {description}
          </p>
        </div>
      </div>

      {/* ✅ Multiple Arrays or Single Array */}
      {hasMultipleArrays ? (
        <div className="space-y-8">
          {displayArrays.map((arr, index) => {
            const colorScheme = getArrayColor(index);
            return (
              <div key={index}>
                {/* Array Label */}
                <div className="mb-4 flex justify-center">
                  <div
                    className="px-4 py-1.5 rounded-sm"
                    style={{
                      background: colorScheme.gradient,
                      border: `2px solid ${colorScheme.border}`,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                  >
                    <span className="text-sm font-['Tahoma'] font-bold text-white">
                      {displayNames[index]} (Array {index + 1})
                    </span>
                  </div>
                </div>

                {/* Array Visualization */}
                {renderArray(arr, index)}
              </div>
            );
          })}
        </div>
      ) : (
        /* Single Array Visualization */
        renderArray(displayArrays[0], 0)
      )}

      {/* Accessed Value Display - Windows XP Success Message */}
      {accessedValue !== undefined && (
        <div
          className="mt-6 mx-auto max-w-md p-3 rounded-sm animate-pulse"
          style={{
            background: "linear-gradient(to bottom, #E6FFE6 0%, #CCFFCC 100%)",
            border: "2px solid #32CD32",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2), 0 0 8px rgba(50,205,50,0.3)",
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs font-['Tahoma'] font-bold text-[#228B22]">
              Accessing:
            </span>
            <span
              className="text-2xl font-['Courier_New',monospace] font-bold px-3 py-1 rounded-sm"
              style={{
                background:
                  "linear-gradient(to bottom, #90EE90 0%, #32CD32 100%)",
                border: "1px solid #228B22",
                color: "white",
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
            >
              {accessedValue}
            </span>
          </div>
        </div>
      )}

      {/* Result Display - Windows XP Completed Dialog */}
      {result !== undefined && (
        <div
          className="mt-6 mx-auto max-w-md rounded-sm overflow-hidden"
          style={{
            background: "#ECE9D8",
            border: "2px solid #0078D7",
            boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
          }}
        >
          {/* Title Bar */}
          <div
            className="px-3 py-1.5 flex items-center gap-2"
            style={{
              background: "linear-gradient(to right, #0058E9 0%, #3F8CF3 100%)",
            }}
          >
            <div className="w-4 h-4 bg-white/20 rounded-sm flex items-center justify-center">
              <span className="text-xs">✓</span>
            </div>
            <span className="text-white font-['Tahoma'] text-xs font-bold">
              Result
            </span>
          </div>

          {/* Content */}
          <div className="p-4 bg-white flex items-center justify-center gap-3">
            <span className="text-3xl">✅</span>
            <span
              className="text-2xl font-['Courier_New',monospace] font-bold px-4 py-2 rounded-sm"
              style={{
                background:
                  "linear-gradient(to bottom, #90EE90 0%, #32CD32 100%)",
                border: "2px solid #228B22",
                color: "white",
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {JSON.stringify(result)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
