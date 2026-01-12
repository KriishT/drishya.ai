"use client";

import { TreeVisualizationStep } from "@/lib/api";
import { useVisualizerStore } from "@/lib/store";
import React, { useEffect, useState } from "react";

const TreeVisualizer = () => {
  const steps = useVisualizerStore((state) => state.steps);
  const currentStepIndex = useVisualizerStore(
    (state) => state.currentStepIndex
  );
  const styleScreen = useVisualizerStore((state) => state.screenStyle);
  const currentStep = steps[currentStepIndex];

  const {
    tree,
    highlightedNodes,
    visitedNodes,
    currentPath,
    traversalOrder,
    result,
  } = currentStep;

  // Track recently highlighted node for animation
  const [recentlyHighlighted, setRecentlyHighlighted] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (highlightedNodes && highlightedNodes.length > 0) {
      const timer = setTimeout(() => {
        setRecentlyHighlighted(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, highlightedNodes]);

  if (!currentStep || !tree) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        <p className="font-['Tahoma'] text-sm">No tree to visualize</p>
      </div>
    );
  }

  // Helper: Build unique path for each node to handle duplicates
  function buildNodePath(path: string): string {
    return path || "root";
  }

  // Helper: Check if a specific node (by path) should be highlighted
  function isNodeHighlighted(nodeVal: number, nodePath: string): boolean {
    if (!highlightedNodes || highlightedNodes.length === 0) return false;

    // If no duplicates in tree, simple value check works
    if (!hasDuplicateValues(tree)) {
      return highlightedNodes.includes(nodeVal);
    }

    // For duplicates, we'd need path-based checking
    // For now, we'll highlight first occurrence only
    const firstOccurrence = findFirstOccurrence(tree, nodeVal);
    return firstOccurrence === nodePath && highlightedNodes.includes(nodeVal);
  }

  function isNodeVisited(nodeVal: number, nodePath: string): boolean {
    if (!visitedNodes || visitedNodes.length === 0) return false;

    if (!hasDuplicateValues(tree)) {
      return visitedNodes.includes(nodeVal);
    }

    const firstOccurrence = findFirstOccurrence(tree, nodeVal);
    return firstOccurrence === nodePath && visitedNodes.includes(nodeVal);
  }

  // Helper: Check if tree has duplicate values
  function hasDuplicateValues(node: any, seen = new Set()): boolean {
    if (!node) return false;
    if (seen.has(node.val)) return true;
    seen.add(node.val);
    return (
      hasDuplicateValues(node.left, seen) ||
      hasDuplicateValues(node.right, seen)
    );
  }

  // Helper: Find first occurrence path of a value
  function findFirstOccurrence(
    node: any,
    targetVal: number,
    path = "root"
  ): string | null {
    if (!node) return null;
    if (node.val === targetVal) return path;

    const leftResult = findFirstOccurrence(node.left, targetVal, path + ".L");
    if (leftResult) return leftResult;

    return findFirstOccurrence(node.right, targetVal, path + ".R");
  }

  function renderTree(
    node: any,
    side: string = "root",
    path: string = "root"
  ): React.ReactNode {
    if (!node) {
      return <div className="w-12 h-12"></div>;
    }

    const nodePath = buildNodePath(path);
    const isHighlighted = isNodeHighlighted(node.val, nodePath);
    const isVisited = isNodeVisited(node.val, nodePath);
    const inPath = currentPath?.includes(node.val);

    // Windows XP color palette
    let boxGradient =
      "linear-gradient(to bottom, #F0F0F0 0%, #D0D0D0 50%, #C0C0C0 50%, #A0A0A0 100%)";
    let borderColor = "#808080";
    let textColor = "text-black";
    let shadowStyle = "0 2px 4px rgba(0,0,0,0.3)";

    if (isHighlighted) {
      // Windows XP Blue Selection
      boxGradient =
        "linear-gradient(to bottom, #B4D4F7 0%, #6BB4F7 50%, #3F8CF3 50%, #0078D7 100%)";
      borderColor = "#003C74";
      textColor = "text-white";
      shadowStyle = "0 0 10px rgba(0,120,215,0.5), 0 2px 4px rgba(0,0,0,0.3)";
    } else if (isVisited) {
      // Windows XP Light Blue (visited)
      boxGradient =
        "linear-gradient(to bottom, #E6F2FF 0%, #B3D9FF 50%, #80C0FF 50%, #4DA6FF 100%)";
      borderColor = "#0066CC";
      textColor = "text-black";
      shadowStyle = "0 2px 4px rgba(0,0,0,0.25)";
    }

    if (inPath) {
      shadowStyle = "0 0 12px rgba(50,205,50,0.6), 0 2px 4px rgba(0,0,0,0.3)";
    }

    return (
      <div className="flex flex-col items-center gap-2">
        {/* Current Node - Windows XP Style */}
        <div
          className={`
            w-12 h-12 flex items-center justify-center
            font-['Courier_New',monospace] text-lg font-bold
            transition-all duration-300
            ${textColor}
            ${
              isHighlighted
                ? "scale-110"
                : isVisited
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
              textColor === "text-white" ? "0 1px 2px rgba(0,0,0,0.5)" : "none",
          }}
          title={nodePath} // Show path on hover for debugging
        >
          {node.val}
        </div>

        {/* Children with connecting lines */}
        {(node.left || node.right) && (
          <div className="relative">
            {/* SVG for diagonal lines */}
            <svg className="absolute top-0 left-0 w-full h-8 pointer-events-none z-0">
              {node.left && (
                <line
                  x1="50%"
                  y1="0"
                  x2="25%"
                  y2="100%"
                  stroke="#808080"
                  strokeWidth="2"
                  style={{
                    filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.3))",
                  }}
                />
              )}
              {node.right && (
                <line
                  x1="50%"
                  y1="0"
                  x2="75%"
                  y2="100%"
                  stroke="#808080"
                  strokeWidth="2"
                  style={{
                    filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.3))",
                  }}
                />
              )}
            </svg>

            {/* Children */}
            <div className="flex gap-8 pt-8 relative z-10">
              <div>{renderTree(node.left, "left", path + ".L")}</div>
              <div>{renderTree(node.right, "right", path + ".R")}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ fontFamily: "Tahoma, sans-serif" }}
    >
      {/* Step Number - Windows XP Status Bar Style */}
      <div className="mb-3 flex justify-center">
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
      <div className="mb-4 flex justify-center">
        <div
          className="px-4 py-2 rounded-sm max-w-2xl"
          style={{
            background: "linear-gradient(to bottom, #FFF8DC 0%, #FFFACD 100%)",
            border: "1px solid #D4A017",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          <p className="text-sm text-black font-['Tahoma'] text-center">
            {currentStep.description}
          </p>
        </div>
      </div>

      {/* Tree Visualization - Scrollable */}
      <div className={styleScreen === "regular" ? "" : "flex flex-row gap-2"}>
        <div
          className="flex-1 overflow-auto mb-10"
          style={{
            background: "#FFFFFF",
            border: "2px solid #0078D7",
            boxShadow:
              "inset 1px 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          <div
            className={
              styleScreen === "full"
                ? "p-32 min-w-max flex justify-center"
                : "p-20 min-w-max flex justify-center"
            }
          >
            {renderTree(tree)}
          </div>
        </div>
        {typeof result === "object" && (
          <div
            className="flex-1 overflow-auto mb-10"
            style={{
              background: "#FFFFFF",
              border: "2px solid #0078D7",
              boxShadow:
                "inset 1px 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            <div className="mb-4 flex justify-center mt-5">
              <div
                className="px-4 py-2 rounded-sm max-w-2xl"
                style={{
                  background:
                    "linear-gradient(to bottom, #FFF8DC 0%, #FFFACD 100%)",
                  border: "1px solid #D4A017",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              >
                <p className="text-sm text-black font-['Tahoma'] text-center ">
                  Result
                </p>
              </div>
            </div>
            <div
              className={
                styleScreen === "full"
                  ? "p-32 min-w-max flex justify-center"
                  : "p-20 min-w-max flex justify-center"
              }
            >
              {renderTree(result)}
            </div>
          </div>
        )}
      </div>

      {/* Traversal Order - Windows XP Panel */}
      {traversalOrder && traversalOrder.length > 0 && (
        <div
          className="px-3 py-2 rounded-sm"
          style={{
            background: "linear-gradient(to bottom, #E6F2FF 0%, #CCE5FF 100%)",
            border: "1px solid #0078D7",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-['Tahoma'] font-bold text-[#003C74]">
              Traversal:
            </span>
            <span className="text-sm font-['Courier_New',monospace] font-bold text-black">
              {traversalOrder.join(" → ")}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex gap-4 justify-center text-xs">
        <div className="flex items-center gap-1">
          <div
            className="w-6 h-6 rounded-sm border-2"
            style={{
              background:
                "linear-gradient(to bottom, #B4D4F7 0%, #0078D7 100%)",
              borderColor: "#003C74",
            }}
          ></div>
          <span className="font-['Tahoma'] text-black">Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-6 h-6 rounded-sm border-2"
            style={{
              background:
                "linear-gradient(to bottom, #E6F2FF 0%, #4DA6FF 100%)",
              borderColor: "#0066CC",
            }}
          ></div>
          <span className="font-['Tahoma'] text-black">Visited</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-6 h-6 rounded-sm border-2"
            style={{
              background:
                "linear-gradient(to bottom, #F0F0F0 0%, #A0A0A0 100%)",
              borderColor: "#808080",
            }}
          ></div>
          <span className="font-['Tahoma'] text-black">Unvisited</span>
        </div>
      </div>
    </div>
  );
};

export default TreeVisualizer;
