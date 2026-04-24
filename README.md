Drishya.ai — LeetCode Algorithm Visualizer
Drishya is an AI-powered algorithm visualizer that brings your LeetCode solutions to life. Paste your code, hit run, and watch every step of execution unfold — array accesses, loop iterations, tree traversals, and more — rendered as an interactive, step-by-step animation.
🔗 Try it live → drishya-ai-henna.vercel.app

What it does
You write a LeetCode-style solution. Drishya instruments it, executes it, and turns the raw execution trace into a visual playback you can step through at your own pace.
Under the hood:

AI Analysis — Claude detects the data structure and algorithm pattern from your code (array, tree, linked list, graph, etc.)
Instrumentation — The code is automatically annotated to capture every significant event: variable declarations, loop iterations, array accesses, condition checks, return statements
Execution — The instrumented code runs in a sandboxed environment
Visualization — The trace is processed and rendered as an interactive step-by-step animation


Features

AI-powered detection — No manual configuration. Drishya figures out whether you're working with arrays, trees, linked lists, or graphs and picks the right visualizer automatically
Step-by-step playback — Navigate forward and backward through every execution step with full playback controls (play, pause, speed adjustment)
Variable inspector — Watch variables update in real time as the algorithm progresses, with change highlighting
Array visualizer — Individual elements highlighted on access, with support for multi-array problems (e.g. merge two sorted arrays)
Tree visualizer — Binary trees rendered with DFS traversal tracking, visited node highlights, and side-by-side before/after view for mutation problems (e.g. invert a tree)
Full screen mode — Expand the visualizer to full screen with the variable inspector docked to the side
Windows XP aesthetic — Intentionally retro UI built for clarity and nostalgia


How to use

Go to drishya-ai-henna.vercel.app
Write or paste a JavaScript LeetCode solution in the left editor panel
Enter your test case in the Test Case field at the bottom (e.g. [2, 7, 11, 15], 9)
Click Run ▶
Use the playback controls to step through the visualization

Test case format
Test cases follow the same format as LeetCode — comma-separated arguments matching your function's parameters:
Problem typeExample test caseSingle array + target[2, 7, 11, 15], 9Two arrays[1, 2, 3], [2, 5, 6]Binary tree (level-order)[4, 2, 7, 1, 3, 6, 9]Linked list[1, 2, 3, 4, 5]

Example problems to try
Two Sum
javascriptfunction twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}
Test case: [2, 7, 11, 15], 9

Maximum Depth of Binary Tree
javascriptfunction maxDepth(root) {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
Test case: [3, 9, 20, null, null, 15, 7]

Best Time to Buy and Sell Stock
javascriptfunction maxProfit(prices) {
  let minPrice = Infinity;
  let maxProfit = 0;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] < minPrice) {
      minPrice = prices[i];
    } else if (prices[i] - minPrice > maxProfit) {
      maxProfit = prices[i] - minPrice;
    }
  }
  return maxProfit;
}
Test case: [7, 1, 5, 3, 6, 4]

Running locally
Prerequisites

Node.js 20+
An Anthropic API key

Backend
bashcd backend
npm install
Create a .env file:
ANTHROPIC_API_KEY=your_key_here
PORT=3001
bashnpm run dev
Frontend
bashcd frontend
npm install
npm run dev
Open http://localhost:3000.

Project structure
├── backend/
│   └── src/
│       ├── index.js              # Express server + API routes
│       ├── aiAnalyzer.js         # Claude-powered code analysis
│       ├── instrumentor.js       # JavaScript AST instrumentation (Babel)
│       ├── executor.js           # Sandboxed JS execution (vm2)
│       ├── pythonInstrumentor.js # Python instrumentation
│       ├── pythonExecutor.js     # Python execution
│       ├── traceProcessorArray.js
│       ├── traceProcessorTree.js
│       ├── traceProcessorLinkedList.js
│       └── traceProcessorGraph.js
│
└── frontend/
    ├── app/                      # Next.js app router
    ├── components/
    │   ├── CodeEditor.tsx        # Monaco editor + run button
    │   ├── Visualizer.tsx        # Main visualizer panel
    │   ├── ArrayVisualizer.tsx   # Array rendering
    │   ├── TreeVisualizer.tsx    # Binary tree rendering
    │   ├── PlaybackControl.tsx   # Step controls
    │   └── VaraibleInspector.tsx # Live variable tracking
    └── lib/
        ├── api.ts                # Backend API client
        └── store.ts              # Zustand state management

Tech stack
Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, Monaco Editor
Backend: Node.js, Express 5, Anthropic Claude API (claude-3-5-haiku), Babel (AST instrumentation), vm2 (sandboxed execution)

Limitations

JavaScript is the only language available in the live UI at this time
Very long or deeply recursive solutions may hit execution time limits (5s)
Graph visualization is in progress — complex graph problems fall back to the array visualizer


License
MIT
