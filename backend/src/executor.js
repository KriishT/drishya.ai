const { NodeVM } = require("vm2");

/**
 * Executes instrumented code in a sandboxed environment
 * @param {string} instrumentedCode - The instrumented JavaScript code
 * @param {string} testCaseStr - Test case input as string
 * @param {string} dataStructure - The detected data structure type
 * @returns {object} - Execution result with trace and output
 */
function executeCode(instrumentedCode, testCaseStr, dataStructure = "array") {
  const trace = [];
  const variableState = {};
  let stepCounter = 0;

  // Parse test case
  let testCaseArgs;
  try {
    const cleaned = testCaseStr.trim();
    testCaseArgs = parseTestCase(cleaned, dataStructure);
  } catch (error) {
    return {
      trace: [],
      error: `Failed to parse test case: ${error.message}`,
    };
  }

  // ✅ CRITICAL FIX: Deep clone IMMEDIATELY after parsing, before ANY other operations
  const originalTestCaseArgs = JSON.parse(JSON.stringify(testCaseArgs));

  /**
   * Simplify value for display - show only direct children values for nodes
   */
  const simplifyForDisplay = (value) => {
    if (value === null || value === undefined) {
      return value;
    }

    // Primitives
    if (typeof value !== "object") {
      return value;
    }

    // Arrays
    if (Array.isArray(value)) {
      return value.map((item) => simplifyForDisplay(item));
    }

    // Tree/List nodes - show only direct children values
    if (value.val !== undefined) {
      const result = { val: value.val };

      if ("left" in value) {
        result.left =
          value.left && value.left.val !== undefined ? value.left.val : null;
      }

      if ("right" in value) {
        result.right =
          value.right && value.right.val !== undefined ? value.right.val : null;
      }

      if ("next" in value) {
        result.next =
          value.next && value.next.val !== undefined ? value.next.val : null;
      }

      return result;
    }

    // Regular objects
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = simplifyForDisplay(val);
    }
    return result;
  };

  // Create sandbox with tracking functions
  const sandbox = {
    __trace: (metadata) => {
      // Deep clone and simplify variable state
      const currentVars = {};
      for (const [key, value] of Object.entries(variableState)) {
        if (Array.isArray(value)) {
          currentVars[key] = simplifyForDisplay(
            JSON.parse(JSON.stringify(value))
          );
        } else if (value !== null && typeof value === "object") {
          currentVars[key] = simplifyForDisplay(
            JSON.parse(JSON.stringify(value))
          );
        } else {
          currentVars[key] = value;
        }
      }

      trace.push({
        step: stepCounter++,
        ...metadata,
        variables: currentVars,
        timestamp: Date.now(),
      });
      return undefined;
    },

    __traceAccess: (objectName, index, id, value) => {
      // Deep clone and simplify variable state
      const currentVars = {};
      for (const [key, val] of Object.entries(variableState)) {
        if (Array.isArray(val)) {
          currentVars[key] = simplifyForDisplay(
            JSON.parse(JSON.stringify(val))
          );
        } else if (val !== null && typeof val === "object") {
          currentVars[key] = simplifyForDisplay(
            JSON.parse(JSON.stringify(val))
          );
        } else {
          currentVars[key] = val;
        }
      }

      trace.push({
        step: stepCounter++,
        type: "array_access",
        array: objectName,
        index: index,
        value: value,
        id: id,
        variables: currentVars,
      });
      return value;
    },

    __setVar: (name, value) => {
      // Deep clone arrays and objects to prevent reference issues
      if (Array.isArray(value)) {
        variableState[name] = JSON.parse(JSON.stringify(value));
      } else if (value !== null && typeof value === "object") {
        variableState[name] = JSON.parse(JSON.stringify(value));
      } else {
        variableState[name] = value;
      }
      return value;
    },

    console: {
      log: (...args) => {
        trace.push({
          step: stepCounter++,
          type: "console_log",
          message: args.map((a) => String(a)).join(" "),
        });
      },
    },
  };

  try {
    const vm = new NodeVM({
      timeout: 5000,
      sandbox: sandbox,
      eval: false,
      wasm: false,
      require: {
        external: false,
        builtin: [],
      },
    });

    // Transform instrumented code to export the function
    // Extract function name using regex
    const funcMatch = instrumentedCode.match(
      /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/
    );

    if (!funcMatch) {
      return {
        trace: [],
        error: "No function declaration found in code",
        success: false,
      };
    }

    const functionName = funcMatch[1];

    // Build module that exports the function directly
    const moduleCode = `
      const __trace = this.__trace;
      const __traceAccess = this.__traceAccess;
      const __setVar = this.__setVar;
      
      // User's instrumented code
      ${instrumentedCode}
      
      // Export the function directly by referencing it
      // This works because ${functionName} is now defined in this scope
      module.exports = ${functionName};
    `;

    // Run the module to get the function
    const userFunction = vm.run(moduleCode, "visualizer.vm.js");

    // ✅ Track input with the ORIGINAL cloned args (before any execution)
    sandbox.__trace({
      type: "input_params",
      args: originalTestCaseArgs,
      dataStructure: dataStructure,
      id: -1,
    });

    // Execute the function with test case (this may mutate testCaseArgs)
    const result = userFunction.apply(sandbox, testCaseArgs);

    // Track result
    sandbox.__trace({
      type: "final_result",
      result: result,
      id: 999999,
    });

    return {
      trace: trace,
      result: result,
      success: true,
    };
  } catch (error) {
    console.error("VM Execution Error:", error);
    return {
      trace: trace,
      error: `Execution error: ${error.message}`,
      success: false,
    };
  }
}

/**
 * Parse test case string into arguments array based on data structure
 */
function parseTestCase(testCaseStr, dataStructure) {
  try {
    const parsed = JSON.parse(`[${testCaseStr}]`);

    if (dataStructure === "tree" && Array.isArray(parsed[0])) {
      return [arrayToTree(parsed[0])];
    }

    if (dataStructure === "linkedlist" && Array.isArray(parsed[0])) {
      return [arrayToLinkedList(parsed[0])];
    }

    return parsed;
  } catch (e) {
    const parts = [];
    let current = "";
    let depth = 0;
    let inString = false;

    for (let i = 0; i < testCaseStr.length; i++) {
      const char = testCaseStr[i];

      if (char === '"' && testCaseStr[i - 1] !== "\\") {
        inString = !inString;
        current += char;
      } else if (inString) {
        current += char;
      } else if (char === "[" || char === "{") {
        depth++;
        current += char;
      } else if (char === "]" || char === "}") {
        depth--;
        current += char;
      } else if (char === "," && depth === 0) {
        if (current.trim()) {
          parts.push(JSON.parse(current.trim()));
        }
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(JSON.parse(current.trim()));
    }

    return parts;
  }
}

/**
 * Convert array to binary tree (LeetCode format)
 */
function arrayToTree(arr) {
  if (!arr || arr.length === 0) return null;

  const root = { val: arr[0], left: null, right: null };
  const queue = [root];
  let i = 1;

  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift();

    if (i < arr.length && arr[i] !== null) {
      node.left = { val: arr[i], left: null, right: null };
      queue.push(node.left);
    }
    i++;

    if (i < arr.length && arr[i] !== null) {
      node.right = { val: arr[i], left: null, right: null };
      queue.push(node.right);
    }
    i++;
  }

  return root;
}

/**
 * Convert array to linked list
 */
function arrayToLinkedList(arr) {
  if (!arr || arr.length === 0) return null;

  const head = { val: arr[0], next: null };
  let current = head;

  for (let i = 1; i < arr.length; i++) {
    current.next = { val: arr[i], next: null };
    current = current.next;
  }

  return head;
}

module.exports = { executeCode };
