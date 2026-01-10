/**
 * Array Trace Processor
 * Processes raw execution trace into visualization steps for ARRAY algorithms
 * @param {Array} trace - Raw trace events from execution
 * @param {string} testCase - Original test case string
 * @returns {Array} - Processed visualization steps
 */
function processTrace(trace, testCase) {
  const steps = [];
  let currentVariables = {};
  let inputArray = null;
  let highlightedIndices = [];

  // Extract input array from test case
  try {
    const parsed = JSON.parse(`[${testCase}]`);
    if (Array.isArray(parsed[0])) {
      inputArray = parsed[0];
    }
  } catch (e) {
    // If parsing fails, try to extract from first trace event
  }

  // Process each trace event
  for (let i = 0; i < trace.length; i++) {
    const event = trace[i];

    // Update current variables
    if (event.variables) {
      currentVariables = { ...event.variables };
    }

    // Determine what to highlight based on event type
    switch (event.type) {
      case "input_params":
        // Initial state
        if (
          event.args &&
          event.args.length > 0 &&
          Array.isArray(event.args[0])
        ) {
          inputArray = event.args[0];
        }

        steps.push({
          stepNumber: steps.length + 1,
          type: "init",
          description: "Function called with input parameters",
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: [],
          code: event,
        });
        break;

      case "function_enter":
        steps.push({
          stepNumber: steps.length + 1,
          type: "function_enter",
          description: `Entering function: ${event.name}`,
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: [],
          code: event,
        });
        break;

      case "var_declaration":
        steps.push({
          stepNumber: steps.length + 1,
          type: "var_declaration",
          description: `Declaring variable: ${event.name}`,
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: [],
          highlightedVariables: [event.name],
          code: event,
        });
        break;

      case "loop_start":
        steps.push({
          stepNumber: steps.length + 1,
          type: "loop_start",
          description: "Starting loop iteration",
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: [],
          code: event,
        });
        break;

      case "loop_iteration":
        // Extract current loop variables (i, j, etc.)
        const loopVars = extractLoopVariables(currentVariables);
        const indices = Object.values(loopVars).filter(
          (v) => typeof v === "number"
        );

        steps.push({
          stepNumber: steps.length + 1,
          type: "loop_iteration",
          description: `Loop iteration with ${Object.keys(loopVars).join(
            ", "
          )}`,
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: indices,
          highlightedVariables: Object.keys(loopVars),
          code: event,
        });
        break;

      case "array_access":
        const accessIndex =
          typeof event.index === "number"
            ? event.index
            : currentVariables[event.index] || 0;

        steps.push({
          stepNumber: steps.length + 1,
          type: "array_access",
          description: `Accessing ${event.array}[${accessIndex}] = ${event.value}`,
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: [accessIndex],
          highlightedVariables: [event.array],
          accessedValue: event.value,
          code: event,
        });
        break;

      case "condition_check":
        steps.push({
          stepNumber: steps.length + 1,
          type: "condition",
          description: "Checking condition",
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: extractIndicesFromVariables(currentVariables),
          code: event,
        });
        break;

      case "comparison":
        steps.push({
          stepNumber: steps.length + 1,
          type: "comparison",
          description: `Comparing: ${event.left} === ${event.right}`,
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: extractIndicesFromVariables(currentVariables),
          comparisonResult: event.left === event.right,
          code: event,
        });
        break;

      case "assignment":
        steps.push({
          stepNumber: steps.length + 1,
          type: "assignment",
          description: `Assigning value to ${event.name}`,
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: [],
          highlightedVariables: [event.name],
          code: event,
        });
        break;

      case "return":
        steps.push({
          stepNumber: steps.length + 1,
          type: "return",
          description: "Returning result",
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: [],
          code: event,
        });
        break;

      case "final_result":
        steps.push({
          stepNumber: steps.length + 1,
          type: "final",
          description: `Function returned: ${JSON.stringify(event.result)}`,
          variables: currentVariables,
          array: inputArray,
          highlightedIndices: Array.isArray(event.result) ? event.result : [],
          result: event.result,
          code: event,
        });
        break;

      default:
        // Generic step for other events
        if (event.type && !event.type.startsWith("__")) {
          steps.push({
            stepNumber: steps.length + 1,
            type: event.type,
            description: `Step: ${event.type}`,
            variables: currentVariables,
            array: inputArray,
            highlightedIndices: extractIndicesFromVariables(currentVariables),
            code: event,
          });
        }
    }
  }

  // If no steps were created, add a default step
  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      type: "init",
      description: "No execution trace available",
      variables: {},
      array: inputArray || [],
      highlightedIndices: [],
    });
  }

  return steps;
}

/**
 * Extract loop variables (typically i, j, k, etc.)
 */
function extractLoopVariables(variables) {
  const loopVars = {};
  const loopVarNames = ["i", "j", "k", "left", "right", "start", "end", "mid"];

  for (const [key, value] of Object.entries(variables)) {
    if (loopVarNames.includes(key) && typeof value === "number") {
      loopVars[key] = value;
    }
  }

  return loopVars;
}

/**
 * Extract array indices from current variables
 */
function extractIndicesFromVariables(variables) {
  const indices = [];
  const loopVars = extractLoopVariables(variables);

  for (const value of Object.values(loopVars)) {
    if (typeof value === "number" && value >= 0) {
      indices.push(value);
    }
  }

  return indices;
}

module.exports = { processTrace };
