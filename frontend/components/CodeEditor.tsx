"use client";

import Editor from "@monaco-editor/react";
import { useVisualizerStore } from "@/lib/store";
import { visualizeCode } from "@/lib/api";
import TestCases from "./TestCases";

export default function CodeEditor() {
  const {
    code,
    setCode,
    language,
    setLanguage,
    testCase,
    setSteps,
    setDataStructureType,
    setResult,
    setAiAnalysis,
    setIsLoading,
    setError,
    reset,
  } = useVisualizerStore();

  const handleRun = async () => {
    try {
      reset();
      setIsLoading(true);
      setError(null);

      console.log("🚀 Running code...");
      console.log("Code:", code);
      console.log("Test case:", testCase);

      const response = await visualizeCode(code, testCase, language);

      console.log("✅ Response:", response);

      if (response.success) {
        setSteps(response.steps);
        setDataStructureType(response.dataStructureType);
        setResult(response.result);
        setAiAnalysis(response.aiAnalysis);
        console.log(`✅ Loaded ${response.totalSteps} steps`);
      } else {
        setError(response.error || "Visualization failed");
      }
    } catch (error: any) {
      console.error("❌ Error:", error);
      setError(error.message || "Failed to visualize code");
    } finally {
      setIsLoading(false);
    }
  };

  const { isLoading } = useVisualizerStore();

  return (
    <div className="h-full flex flex-col bg-[#ECE9D8]">
      {/* Windows XP Control Bar */}
      <div className="bg-[#D4D0C8] border-b-2 border-[#808080] px-3 py-2 flex items-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-['Tahoma'] text-black font-semibold">
            Lang:
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-white border-2 border-[#7F9DB9] rounded-sm px-2 py-1 text-xs font-['Tahoma'] text-black focus:outline-none focus:border-[#0078D7] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
            style={{
              boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python3</option>
          </select>
        </div>

        <div className="flex-1"></div>

        {/* Windows XP Run Button */}
        <button
          onClick={handleRun}
          disabled={isLoading || !code.trim()}
          className="relative px-4 py-1.5 text-xs font-['Tahoma'] font-bold text-black rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{
            background:
              isLoading || !code.trim()
                ? "linear-gradient(to bottom, #D4D0C8 0%, #B0ACA4 100%)"
                : "linear-gradient(to bottom, #EAF6FF 0%, #B4D4F7 50%, #8BB8F0 50%, #5A9DDE 100%)",
            border: "1px solid #003C74",
            boxShadow:
              !isLoading && code.trim()
                ? "inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.3)"
                : "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 1px rgba(0,0,0,0.2)",
          }}
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              Running...
            </span>
          ) : (
            <>Run ▶</>
          )}
        </button>
      </div>

      {/* Code Editor - MS Paint Style White Canvas */}
      <div className="flex-1 min-h-0 bg-white border-2 border-[#7F9DB9] m-2 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)]">
        <Editor
          height="100%"
          language={language}
          defaultValue="// Write your LeetCode solution here
function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}"
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Courier New', Courier, monospace",
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {/* Test Cases */}
      <TestCases />
    </div>
  );
}
