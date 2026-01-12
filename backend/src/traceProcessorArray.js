/**
 * Array Trace Processor
 * FIXED: Properly maps array variable names (arr1, arr2, arr3) to array indices
 * @param {Array} trace - Raw trace events from execution
 * @param {string} testCase - Original test case string
 * @returns {Array} - Processed visualization steps
 */
function processTrace(trace, testCase) {
  const steps = [];
  let currentVariables = {};

  // ✅ Parse multiple input arrays
  let inputArrays = [];
  let arrayNames = [];
  let arrayVarNames = []; // Track actual variable names (arr1, arr2, arr3)

  try {
    const parsed = JSON.parse(`[${testCase}]`);

    // Identify all array arguments
    parsed.forEach((arg, index) => {
      if (Array.isArray(arg)) {
        inputArrays.push(arg);
        const commonNames = [
          "nums",
          "nums1",
          "nums2",
          "arr",
          "arr1",
          "arr2",
          "array",
          "array1",
          "array2",
        ];
        arrayNames.push(commonNames[index] || `array${index + 1}`);
      }
    });

    if (inputArrays.length === 0 && Array.isArray(parsed[0])) {
      inputArrays = [parsed[0]];
      arrayNames = ["nums"];
    }
  } catch (e) {
    // Parsing failed
  }

  const hasMultipleArrays = inputArrays.length > 1;

  // ✅ Build array variable name mapping from trace
  const arrayVarToIndexMap = {}; // Maps "arr1" -> 0, "arr2" -> 1, etc.

  // First pass: Learn which array variable names exist
  trace.forEach((event) => {
    if (event.type === "array_access" && event.array) {
      const varName = event.array;

      // If we haven't seen this variable name yet
      if (arrayVarToIndexMap[varName] === undefined) {
        // Assign it to the next available array index
        const nextIndex = Object.keys(arrayVarToIndexMap).length;
        if (nextIndex < inputArrays.length) {
          arrayVarToIndexMap[varName] = nextIndex;
          console.log(`Mapping ${varName} -> array index ${nextIndex}`);
        }
      }
    }
  });

  // If no mappings found, use default based on common names
  if (Object.keys(arrayVarToIndexMap).length === 0) {
    [
      "nums",
      "nums1",
      "nums2",
      "arr",
      "arr1",
      "arr2",
      "arr3",
      "array",
      "array1",
      "array2",
    ].forEach((name, idx) => {
      if (idx < inputArrays.length) {
        arrayVarToIndexMap[name] = idx;
      }
    });
  }

  console.log("Array variable name mapping:", arrayVarToIndexMap);

  // ✅ Variable-to-array mapping for loop variables
  const loopVarToArrayMap = {}; // Will be populated dynamically

  // Learn which loop variables access which arrays
  trace.forEach((event) => {
    if (event.type === "array_access" && typeof event.index === "string") {
      const arrayVarName = event.array;
      const indexVar = event.index;

      const arrayIndex = arrayVarToIndexMap[arrayVarName];

      if (arrayIndex !== undefined && !loopVarToArrayMap[indexVar]) {
        loopVarToArrayMap[indexVar] = arrayIndex;
      }
    }
  });

  console.log("Loop variable to array mapping:", loopVarToArrayMap);

  // Default fallback for common loop variables
  const defaultLoopMapping = {
    i: 0,
    j: 1,
    k: 2,
    left: 0,
    right: 0,
    start: 0,
    end: 0,
    mid: 0,
    p: 0,
    q: 1,
    r: 2,
  };

  const finalLoopMapping = { ...defaultLoopMapping, ...loopVarToArrayMap };

  // Process each trace event
  for (let i = 0; i < trace.length; i++) {
    const event = trace[i];

    if (event.variables) {
      currentVariables = { ...event.variables };
    }

    switch (event.type) {
      case "input_params":
        if (event.args && event.args.length > 0) {
          inputArrays = [];
          arrayNames = [];

          event.args.forEach((arg, index) => {
            if (Array.isArray(arg)) {
              inputArrays.push(arg);
              const commonNames = [
                "nums",
                "nums1",
                "nums2",
                "arr",
                "arr1",
                "arr2",
                "array",
              ];
              arrayNames.push(commonNames[index] || `array${index + 1}`);
            }
          });

          if (inputArrays.length === 0 && Array.isArray(event.args[0])) {
            inputArrays = [event.args[0]];
            arrayNames = ["nums"];
          }
        }

        steps.push({
          stepNumber: steps.length + 1,
          type: "init",
          description: hasMultipleArrays
            ? `Function called with ${inputArrays.length} arrays`
            : "Function called with input parameters",
          variables: currentVariables,
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: [],
          highlightedArrayIndices: inputArrays.map(() => []),
          code: event,
        });
        break;

      case "function_enter":
        steps.push({
          stepNumber: steps.length + 1,
          type: "function_enter",
          description: `Entering function: ${event.name}`,
          variables: currentVariables,
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: [],
          highlightedArrayIndices: inputArrays.map(() => []),
          code: event,
        });
        break;

      case "var_declaration":
        steps.push({
          stepNumber: steps.length + 1,
          type: "var_declaration",
          description: `Declaring variable: ${event.name}`,
          variables: currentVariables,
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: [],
          highlightedArrayIndices: inputArrays.map(() => []),
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
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: [],
          highlightedArrayIndices: inputArrays.map(() => []),
          code: event,
        });
        break;

      case "loop_iteration":
        const loopVars = extractLoopVariables(currentVariables);

        // ✅ Use learned mapping to assign variables to arrays
        const highlightedArrayIndices = inputArrays.map(() => []);

        Object.entries(loopVars).forEach(([varName, value]) => {
          if (typeof value === "number") {
            const arrayIndex = finalLoopMapping[varName];
            if (arrayIndex !== undefined && arrayIndex < inputArrays.length) {
              highlightedArrayIndices[arrayIndex].push(value);
            }
          }
        });

        steps.push({
          stepNumber: steps.length + 1,
          type: "loop_iteration",
          description: `Loop iteration with ${Object.keys(loopVars).join(
            ", "
          )}`,
          variables: currentVariables,
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: highlightedArrayIndices[0] || [],
          highlightedArrayIndices: highlightedArrayIndices,
          highlightedVariables: Object.keys(loopVars),
          code: event,
        });
        break;

      case "array_access":
        const accessIndex =
          typeof event.index === "number"
            ? event.index
            : currentVariables[event.index] || 0;

        // ✅ Map array variable name to correct index
        const arrayVarName = event.array;
        const accessedArrayIndex = arrayVarToIndexMap[arrayVarName];

        // ✅ Highlight ONLY the array being accessed - ABSOLUTE PRIORITY
        const accessArrayIndices = inputArrays.map(() => []); // All empty by default

        if (
          accessedArrayIndex !== undefined &&
          accessedArrayIndex < inputArrays.length
        ) {
          // ONLY highlight the accessed array
          accessArrayIndices[accessedArrayIndex] = [accessIndex];
        } else {
          console.warn(
            `Unknown array variable: ${arrayVarName}, defaulting to first array`
          );
          accessArrayIndices[0] = [accessIndex];
        }

        steps.push({
          stepNumber: steps.length + 1,
          type: "array_access",
          description: `Accessing ${arrayVarName}[${accessIndex}] = ${event.value}`,
          variables: currentVariables,
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: [accessIndex],
          highlightedArrayIndices: accessArrayIndices, // ✅ ONLY accessed array, all others empty
          highlightedVariables: [arrayVarName],
          accessedValue: event.value,
          accessedArrayIndex: accessedArrayIndex, // ✅ Track which array was accessed
          code: event,
        });
        break;

      case "condition_check":
        // Don't highlight all arrays on condition check in multi-array mode
        const conditionHighlights = hasMultipleArrays
          ? inputArrays.map(() => [])
          : inputArrays.map(() =>
              extractIndicesFromVariables(currentVariables)
            );

        steps.push({
          stepNumber: steps.length + 1,
          type: "condition",
          description: "Checking condition",
          variables: currentVariables,
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: extractIndicesFromVariables(currentVariables),
          highlightedArrayIndices: conditionHighlights,
          code: event,
        });
        break;

      case "comparison":
        // Don't highlight all arrays on comparison in multi-array mode
        const comparisonHighlights = hasMultipleArrays
          ? inputArrays.map(() => [])
          : inputArrays.map(() =>
              extractIndicesFromVariables(currentVariables)
            );

        steps.push({
          stepNumber: steps.length + 1,
          type: "comparison",
          description: `Comparing: ${event.left} === ${event.right}`,
          variables: currentVariables,
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: extractIndicesFromVariables(currentVariables),
          highlightedArrayIndices: comparisonHighlights,
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
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: [],
          highlightedArrayIndices: inputArrays.map(() => []),
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
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: [],
          highlightedArrayIndices: inputArrays.map(() => []),
          code: event,
        });
        break;

      case "final_result":
        steps.push({
          stepNumber: steps.length + 1,
          type: "final",
          description: `Function returned: ${JSON.stringify(event.result)}`,
          variables: currentVariables,
          arrays: inputArrays,
          arrayNames: arrayNames,
          array: inputArrays[0],
          highlightedIndices: Array.isArray(event.result) ? event.result : [],
          highlightedArrayIndices: inputArrays.map(() => []),
          result: event.result,
          code: event,
        });
        break;

      default:
        if (event.type && !event.type.startsWith("__")) {
          steps.push({
            stepNumber: steps.length + 1,
            type: event.type,
            description: `Step: ${event.type}`,
            variables: currentVariables,
            arrays: inputArrays,
            arrayNames: arrayNames,
            array: inputArrays[0],
            highlightedIndices: extractIndicesFromVariables(currentVariables),
            highlightedArrayIndices: inputArrays.map(() => []),
            code: event,
          });
        }
    }
  }

  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      type: "init",
      description: "No execution trace available",
      variables: {},
      arrays: inputArrays,
      arrayNames: arrayNames,
      array: inputArrays[0] || [],
      highlightedIndices: [],
      highlightedArrayIndices: inputArrays.map(() => []),
    });
  }

  return steps;
}

/**
 * Extract loop variables (typically i, j, k, etc.)
 */
function extractLoopVariables(variables) {
  const loopVars = {};
  const loopVarNames = [
    "i",
    "j",
    "k",
    "left",
    "right",
    "start",
    "end",
    "mid",
    "p",
    "q",
    "r",
  ];

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
