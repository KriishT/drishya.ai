import { useVisualizerStore } from "@/lib/store";
import React from "react";

const TestCases = () => {
  const { testCase, setTestCase } = useVisualizerStore();

  return (
    <div className="bg-[#D4D0C8] border-t-2 border-[#808080] p-3 shadow-[inset_0_2px_3px_rgba(0,0,0,0.1)]">
      <label className="block text-xs font-['Tahoma'] font-bold text-black mb-2">
        Test Case
      </label>
      <textarea
        value={testCase}
        onChange={(e) => setTestCase(e.target.value)}
        placeholder="e.g., [2, 7, 11, 15], 9"
        className="w-full bg-white border-2 border-[#7F9DB9] rounded-sm px-3 py-2 text-sm font-['Courier_New',monospace] text-black placeholder-gray-500 focus:outline-none focus:border-[#0078D7] resize-none shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
        rows={3}
      />
      <p className="mt-1.5 text-[10px] font-['Tahoma'] text-gray-600">
        Enter your test input (comma-separated for multiple arguments)
      </p>
    </div>
  );
};

export default TestCases;
