const Anthropic = require("@anthropic-ai/sdk");
require("dotenv").config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyzes code using Claude AI to detect data structures and algorithm patterns
 * @param {string} code - The user's LeetCode solution
 * @param {string} testCase - The test case input
 * @returns {Promise<Object>} - Analysis result with detected structures
 */
async function analyzeCode(code, testCase) {
  try {
    const prompt = createAnalysisPrompt(code, testCase);

    console.log("🤖 Calling Claude AI for code analysis...");

    const message = await anthropic.messages.create({
      model: process.env.AI_MODEL || "claude-3-5-haiku-20241022",
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the response text
    const responseText = message.content[0].text;
    console.log("📝 AI Response received");

    // Parse JSON response
    const analysis = parseAIResponse(responseText);

    console.log(
      `✅ Detected structure: ${analysis.primaryDataStructure} (${
        analysis.confidence * 100
      }% confident)`
    );

    return analysis;
  } catch (error) {
    console.error("❌ AI Analysis error:", error.message);

    // Fallback to basic heuristic analysis
    console.log("⚠️ Falling back to heuristic analysis");
    return heuristicAnalysis(code, testCase);
  }
}

/**
 * Creates the prompt for AI analysis
 */
function createAnalysisPrompt(code, testCase) {
  return `You are a code analysis expert for LeetCode problems. Analyze this code and determine the data structure and algorithm pattern.

**Code:**
\`\`\`javascript
${code}
\`\`\`

**Test Case:**
\`\`\`
${testCase}
\`\`\`

**Your Task:**
Analyze the code and respond with ONLY a JSON object (no markdown, no explanation, just pure JSON) with this exact structure:

{
  "primaryDataStructure": "array" | "tree" | "graph" | "linkedlist" | "matrix" | "string" | "number",
  "inputParameters": [
    {
      "name": "parameter_name",
      "type": "array" | "tree" | "graph" | "linkedlist" | "matrix" | "string" | "number",
      "isPrimary": true | false,
      "description": "brief description"
    }
  ],
  "algorithmPattern": "two-pointer" | "sliding-window" | "dfs" | "bfs" | "binary-search" | "dynamic-programming" | "greedy" | "backtracking" | "divide-conquer" | "other",
  "visualizationStrategy": "array-with-indices" | "tree-traversal" | "graph-traversal" | "linkedlist-pointers" | "matrix-cells" | "other",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explanation"
}

**Analysis Guidelines:**
1. Look at function parameters to identify input types
2. Look at code patterns (loops, recursion, node.left/right, etc.)
3. The PRIMARY data structure is the one being traversed/modified most
4. Be specific and confident
5. Consider the test case format

**Examples:**

Code with "function twoSum(nums, target)" and "nums[i]" → primaryDataStructure: "array"
Code with "node.left" and "node.right" → primaryDataStructure: "tree"
Code with "grid[i][j]" and nested loops → primaryDataStructure: "matrix"
Code with "curr.next" → primaryDataStructure: "linkedlist"

Respond with ONLY the JSON object.`;
}

/**
 * Parses AI response and validates structure
 */
function parseAIResponse(responseText) {
  try {
    // Remove markdown code blocks if present
    let cleanText = responseText.trim();
    cleanText = cleanText.replace(/```json\n?/g, "");
    cleanText = cleanText.replace(/```\n?/g, "");
    cleanText = cleanText.trim();

    const parsed = JSON.parse(cleanText);

    // Validate required fields
    if (!parsed.primaryDataStructure) {
      throw new Error("Missing primaryDataStructure");
    }

    // Set defaults for optional fields
    return {
      primaryDataStructure: parsed.primaryDataStructure,
      inputParameters: parsed.inputParameters || [],
      algorithmPattern: parsed.algorithmPattern || "other",
      visualizationStrategy: parsed.visualizationStrategy || "default",
      confidence: parsed.confidence || 0.8,
      reasoning: parsed.reasoning || "AI analysis",
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error.message);
    console.log("Raw response:", responseText);
    throw new Error("Failed to parse AI analysis response");
  }
}

/**
 * Fallback heuristic analysis when AI fails
 */
function heuristicAnalysis(code, testCase) {
  console.log("Running heuristic analysis...");

  const lowerCode = code.toLowerCase();

  // Tree detection
  if (
    lowerCode.includes("node.left") ||
    lowerCode.includes("node.right") ||
    (lowerCode.includes("root") &&
      (lowerCode.includes(".left") || lowerCode.includes(".right")))
  ) {
    return {
      primaryDataStructure: "tree",
      inputParameters: [{ name: "root", type: "tree", isPrimary: true }],
      algorithmPattern:
        lowerCode.includes("function ") && lowerCode.includes("node")
          ? "dfs"
          : "other",
      visualizationStrategy: "tree-traversal",
      confidence: 0.7,
      reasoning: "Detected tree structure from node.left/right patterns",
    };
  }

  // Linked List detection
  if (
    (lowerCode.includes(".next") || lowerCode.includes("->next")) &&
    (lowerCode.includes("head") || lowerCode.includes("curr"))
  ) {
    return {
      primaryDataStructure: "linkedlist",
      inputParameters: [{ name: "head", type: "linkedlist", isPrimary: true }],
      algorithmPattern: "iteration",
      visualizationStrategy: "linkedlist-pointers",
      confidence: 0.7,
      reasoning: "Detected linked list from .next patterns",
    };
  }

  // Matrix/Grid detection
  if (
    lowerCode.includes("grid[") ||
    lowerCode.includes("[i][j]") ||
    lowerCode.includes("[row][col]")
  ) {
    return {
      primaryDataStructure: "matrix",
      inputParameters: [{ name: "grid", type: "matrix", isPrimary: true }],
      algorithmPattern: "grid-traversal",
      visualizationStrategy: "matrix-cells",
      confidence: 0.7,
      reasoning: "Detected 2D array/matrix from grid[i][j] patterns",
    };
  }

  // Graph detection (adjacency list or edge list)
  if (
    lowerCode.includes("graph") ||
    lowerCode.includes("edges") ||
    lowerCode.includes("adjacency") ||
    lowerCode.includes("visited")
  ) {
    return {
      primaryDataStructure: "graph",
      inputParameters: [{ name: "graph", type: "graph", isPrimary: true }],
      algorithmPattern: lowerCode.includes("dfs")
        ? "dfs"
        : lowerCode.includes("bfs")
        ? "bfs"
        : "graph-traversal",
      visualizationStrategy: "graph-traversal",
      confidence: 0.6,
      reasoning: "Detected graph from graph/edges/visited keywords",
    };
  }

  // Array detection (default fallback)
  return {
    primaryDataStructure: "array",
    inputParameters: [{ name: "nums", type: "array", isPrimary: true }],
    algorithmPattern: lowerCode.includes("for") ? "iteration" : "other",
    visualizationStrategy: "array-with-indices",
    confidence: 0.5,
    reasoning: "Default to array - no specific patterns detected",
  };
}

module.exports = {
  analyzeCode,
};
