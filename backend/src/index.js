const express = require("express");
const cors = require("cors");
const { analyzeCode } = require("./aiAnalyzer");
const { instrumentCode } = require("./instrumentor");
const { executeCode } = require("./executor");
const { instrumentPythonCode } = require("./pythonInstrumentor");
const { executePythonCode } = require("./pythonExecutor");
const { instrumentJavaCode } = require("./javaInstrumentor");
const { executeJavaCode } = require("./javaExecutor");
const { instrumentCppCode } = require("./cppInstrumentor");
const { executeCPPCode } = require("./cppExecutor");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://drishya-ai-henna.vercel.app/", // your frontend URL
      /\.vercel\.app$/, // Allow all vercel domains
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

function processTrace(trace, testCase, dataStructure = "array") {
  const dsType = (dataStructure || "array").toLowerCase().trim();

  // Route to appropriate processor based on data structure type
  switch (dsType) {
    case "array":
    case "list":
    case "stack":
    case "queue":
      return require("./traceProcessorArray").processTrace(trace, testCase);

    case "tree":
    case "binary-tree":
    case "binary tree":
    case "bst":
    case "binary-search-tree":
    case "binary search tree":
      return require("./traceProcessorTree").processTrace(trace, testCase);

    case "graph":
    case "directed-graph":
    case "directed graph":
    case "undirected-graph":
    case "undirected graph":
    case "weighted-graph":
    case "weighted graph":
      return require("./traceProcessorGraph").processTrace(trace, testCase);

    case "linkedlist":
    case "linked-list":
    case "linked list":
    case "singly-linked-list":
    case "doubly-linked-list":
      return require("./traceProcessorLinkedList").processTrace(
        trace,
        testCase
      );

    default:
      console.warn(
        `Unknown data structure: ${dataStructure}, falling back to array processor`
      );
      return require("./traceProcessorArray").processTrace(trace, testCase);
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "LeetCode Visualizer Backend with AI is running",
    aiEnabled: !!process.env.ANTHROPIC_API_KEY,
  });
});

// Main visualization endpoint with AI
app.post("/api/visualize", async (req, res) => {
  try {
    const { code, testCase, language } = req.body;

    if (!code || !testCase) {
      return res.status(400).json({
        success: false,
        error: "Code and test case are required",
      });
    }

    // ✅ FIXED: Proper language validation
    if (!["javascript", "python"].includes(language)) {
      return res.status(400).json({
        success: false,
        error: `Language "${language}" is not currently supported. Supported languages: javascript, python, java, cpp`,
      });
    }

    console.log("\n🚀 ===== New Visualization Request =====");
    console.log("📝 Language:", language);
    console.log("📝 Code length:", code.length, "characters");
    console.log("🧪 Test case:", testCase);

    // ⭐ STEP 1: AI ANALYSIS
    console.log("\n⭐ STEP 1: AI Analysis");
    const aiAnalysis = await analyzeCode(code, testCase);
    console.log("AI Result:", {
      structure: aiAnalysis.primaryDataStructure,
      pattern: aiAnalysis.algorithmPattern,
      confidence: `${(aiAnalysis.confidence * 100).toFixed(0)}%`,
    });

    // Check confidence threshold
    if (aiAnalysis.confidence < 0.5) {
      return res.status(400).json({
        success: false,
        error:
          "AI analysis confidence too low. Please verify your code structure.",
        aiAnalysis: aiAnalysis,
        needsManualSelection: true,
      });
    }

    // ⭐ STEP 2: INSTRUMENTATION
    console.log("\n⭐ STEP 2: Code Instrumentation");
    let instrumentedCode;

    if (language === "javascript") {
      instrumentedCode = instrumentCode(code, aiAnalysis.primaryDataStructure);
    } else if (language === "python") {
      instrumentedCode = instrumentPythonCode(
        code,
        aiAnalysis.primaryDataStructure
      );
    } else if (language === "java") {
      instrumentedCode = instrumentJavaCode(
        code,
        aiAnalysis.primaryDataStructure
      );
    } else if (language === "cpp") {
      instrumentedCode = instrumentCppCode(
        code,
        aiAnalysis.primaryDataStructure
      );
    }

    console.log("✅ Code instrumented for:", aiAnalysis.primaryDataStructure);

    // ⭐ STEP 3: EXECUTION
    console.log("\n⭐ STEP 3: Code Execution");
    let executionResult; // ✅ FIXED: Declare outside if blocks

    if (language === "javascript") {
      executionResult = executeCode(
        instrumentedCode,
        testCase,
        aiAnalysis.primaryDataStructure
      );
    } else if (language === "python") {
      // ✅ FIXED: Added await for async executor
      executionResult = await executePythonCode(
        instrumentedCode,
        testCase,
        aiAnalysis.primaryDataStructure
      );
    } else if (language === "java") {
      // ✅ FIXED: Added await for async executor
      executionResult = await executeJavaCode(
        instrumentedCode,
        testCase,
        aiAnalysis.primaryDataStructure
      );
    } else if (language === "cpp") {
      // ✅ FIXED: Added await for async executor
      executionResult = await executeCppCode(
        instrumentedCode,
        testCase,
        aiAnalysis.primaryDataStructure
      );
    }

    // ✅ Now executionResult is defined
    if (executionResult.error || !executionResult.success) {
      console.error("❌ Execution error:", executionResult.error);
      return res.status(400).json({
        success: false,
        error: executionResult.error,
        trace: executionResult.trace || [],
        aiAnalysis: aiAnalysis,
      });
    }

    console.log(
      `✅ Execution completed: ${executionResult.trace.length} trace events`
    );

    // ⭐ STEP 4: TRACE PROCESSING
    console.log("\n⭐ STEP 4: Trace Processing");
    const steps = processTrace(
      executionResult.trace,
      testCase,
      aiAnalysis.primaryDataStructure
    );
    console.log(`✅ Generated ${steps.length} visualization steps`);

    // ⭐ STEP 5: RETURN RESPONSE
    console.log("\n✅ ===== Success! Sending Response =====\n");
    res.json({
      success: true,
      dataStructureType: aiAnalysis.primaryDataStructure,
      visualizationStrategy: aiAnalysis.visualizationStrategy,
      steps: steps,
      result: executionResult.result,
      totalSteps: steps.length,
      aiAnalysis: {
        detectedStructure: aiAnalysis.primaryDataStructure,
        algorithmPattern: aiAnalysis.algorithmPattern,
        confidence: aiAnalysis.confidence,
        reasoning: aiAnalysis.reasoning,
      },
    });
  } catch (error) {
    console.error("\n❌ ===== Error in /api/visualize =====");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║  🚀 LeetCode Visualizer Backend (AI-Powered)  ║");
  console.log("╚════════════════════════════════════════════════╝");
  console.log(`\n📡 Server running on: http://localhost:${PORT}`);
  console.log(
    `🤖 AI Analysis: ${
      process.env.ANTHROPIC_API_KEY ? "ENABLED ✅" : "DISABLED ❌"
    }`
  );
  console.log(
    `📊 Model: ${process.env.AI_MODEL || "claude-3-5-haiku-20241022"}`
  );
  console.log(`\n🔗 API Endpoints:`);
  console.log(`   GET  /health           - Health check`);
  console.log(`   POST /api/visualize    - Code visualization with AI\n`);
});

module.exports = app;
