The issue is GitHub isn't rendering the markdown — the file is probably saved as a plain `.txt` or the heading `#` symbols are missing. Here's the exact raw text to paste into your `README.md` file. Make sure the file is named **exactly** `README.md` (capital README, lowercase .md):

```markdown
# Drishya.ai — LeetCode Algorithm Visualizer

**Drishya** is an AI-powered algorithm visualizer that brings your LeetCode solutions to life. Paste your code, hit run, and watch every step of execution unfold — array accesses, loop iterations, tree traversals, and more — rendered as an interactive, step-by-step animation.

> 🔗 **[Try it live → drishya-ai-henna.vercel.app](https://drishya-ai-henna.vercel.app/)**

---

## What it does

You write a LeetCode-style solution. Drishya instruments it, executes it, and turns the raw execution trace into a visual playback you can step through at your own pace.

Under the hood:

| Step | What happens |
|------|-------------|
| 1. AI Analysis | Claude detects the data structure and algorithm pattern (array, tree, linked list, graph, etc.) |
| 2. Instrumentation | Code is automatically annotated to capture every significant event: variable declarations, loop iterations, array accesses, condition checks, return statements |
| 3. Execution | The instrumented code runs in a sandboxed environment |
| 4. Visualization | The trace is processed and rendered as an interactive step-by-step animation |

---

## Features

| | Feature | Description |
|---|---|---|
| 🤖 | **AI-powered detection** | No manual configuration — Drishya figures out whether you're working with arrays, trees, linked lists, or graphs and picks the right visualizer |
| ▶️ | **Step-by-step playback** | Navigate forward and backward through every execution step with play, pause, and speed controls |
| 🔍 | **Variable inspector** | Watch variables update in real time as the algorithm progresses, with change highlighting |
| 📊 | **Array visualizer** | Individual elements highlighted on access, with support for multi-array problems |
| 🌲 | **Tree visualizer** | Binary trees with DFS traversal tracking, visited node highlights, and side-by-side before/after view |
| ⛶ | **Full screen mode** | Expand the visualizer with the variable inspector docked to the side |
| 🖥️ | **Windows XP aesthetic** | Intentionally retro UI built for clarity and nostalgia |

---

## How to use

1. Go to **[drishya-ai-henna.vercel.app](https://drishya-ai-henna.vercel.app/)**
2. Write or paste a JavaScript LeetCode solution in the left editor panel
3. Enter your test case in the **Test Case** field at the bottom
4. Click **Run ▶**
5. Use the playback controls to step through the visualization

### Test case format

Test cases follow the same comma-separated format as LeetCode:

| Problem type | Example test case |
|---|---|
| Single array + target | `[2, 7, 11, 15], 9` |
| Two arrays | `[1, 2, 3], [2, 5, 6]` |
| Binary tree (level-order) | `[4, 2, 7, 1, 3, 6, 9]` |
| Linked list | `[1, 2, 3, 4, 5]` |

---

## Example problems to try

<details>
<summary><strong>Two Sum</strong> — array, nested loops</summary>

```javascript
function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}
```

Test case: `[2, 7, 11, 15], 9`
</details>

<details>
<summary><strong>Maximum Depth of Binary Tree</strong> — recursion, DFS</summary>

```javascript
function maxDepth(root) {
  if (root === null) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

Test case: `[3, 9, 20, null, null, 15, 7]`
</details>

<details>
<summary><strong>Best Time to Buy and Sell Stock</strong> — sliding window</summary>

```javascript
function maxProfit(prices) {
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
```

Test case: `[7, 1, 5, 3, 6, 4]`
</details>

---

## Running locally

### Prerequisites
- Node.js 20+
- Anthropic API key

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
ANTHROPIC_API_KEY=your_key_here
PORT=3001
```

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project structure

```
├── backend/
│   └── src/
│       ├── index.js                   # Express server + API routes
│       ├── aiAnalyzer.js              # Claude-powered code analysis
│       ├── instrumentor.js            # JS AST instrumentation (Babel)
│       ├── executor.js                # Sandboxed execution (vm2)
│       ├── pythonInstrumentor.js      # Python instrumentation
│       ├── pythonExecutor.js          # Python execution
│       ├── traceProcessorArray.js     # Array trace → steps
│       ├── traceProcessorTree.js      # Tree trace → steps
│       ├── traceProcessorLinkedList.js
│       └── traceProcessorGraph.js
│
└── frontend/
    ├── app/                           # Next.js app router
    ├── components/
    │   ├── CodeEditor.tsx             # Monaco editor + run button
    │   ├── Visualizer.tsx             # Main visualizer panel
    │   ├── ArrayVisualizer.tsx        # Array rendering
    │   ├── TreeVisualizer.tsx         # Binary tree rendering
    │   ├── PlaybackControl.tsx        # Step controls
    │   └── VaraibleInspector.tsx      # Live variable tracking
    └── lib/
        ├── api.ts                     # Backend API client
        └── store.ts                   # Zustand state management
```

---

## Tech stack

**Frontend** — Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, Monaco Editor

**Backend** — Node.js, Express 5, Anthropic Claude API (`claude-3-5-haiku`), Babel (AST instrumentation), vm2 (sandboxed execution)

---

## Limitations

- Only JavaScript is available in the live UI currently
- Execution timeout is 5 seconds — very deep recursion may hit this
- Graph visualization is a work in progress

---

## License

MIT
```

The key things to check on GitHub:
- File must be named `README.md` (not `readme.txt` or `README.MD`)
- It needs to be in the **root** of the repository
- The `#` on the very first line must have no spaces before it
