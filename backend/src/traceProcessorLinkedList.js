/**
 * Linked List Trace Processor
 * Processes raw execution trace into visualization steps for LINKED LIST algorithms
 * @param {Array} trace - Raw trace events from execution
 * @param {string} testCase - Original test case string
 * @returns {Array} - Processed visualization steps
 */
function processTrace(trace, testCase) {
  const steps = [];
  let currentVariables = {};
  let linkedList = [];
  let pointers = {}; // { head: 0, current: 1, prev: null }
  let highlightedNodes = [];

  // Extract linked list from test case
  linkedList = extractInputLinkedList(testCase, trace);

  // Process each trace event
  for (let i = 0; i < trace.length; i++) {
    const event = trace[i];

    // Update current variables
    if (event.variables) {
      currentVariables = { ...event.variables };
    }

    switch (event.type) {
      case "input_params":
        // Initial state
        if (event.args && event.args.length > 0) {
          if (Array.isArray(event.args[0])) {
            linkedList = event.args[0];
          } else if (event.args[0] && typeof event.args[0] === "object") {
            linkedList = linkedListToArray(event.args[0]);
          }
        }

        steps.push({
          stepNumber: steps.length + 1,
          type: "init",
          description: "Linked list traversal started",
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: [],
          pointers: { ...pointers },
          code: event,
        });
        break;

      case "function_enter":
        // Initialize head pointer
        if (linkedList.length > 0) {
          pointers.head = 0;
        }

        steps.push({
          stepNumber: steps.length + 1,
          type: "function_enter",
          description: `Entering function: ${event.name}`,
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: [],
          pointers: { ...pointers },
          code: event,
        });
        break;

      case "pointer_init":
      case "pointer_set":
        const pointerName = event.pointer || event.name;
        const pointerValue =
          event.value !== undefined ? event.value : event.index;

        pointers[pointerName] = pointerValue;

        steps.push({
          stepNumber: steps.length + 1,
          type: "pointer_set",
          description: `Setting pointer ${pointerName} to ${
            pointerValue === null ? "null" : `node ${pointerValue}`
          }`,
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: pointerValue !== null ? [pointerValue] : [],
          pointers: { ...pointers },
          highlightedPointers: [pointerName],
          code: event,
        });
        break;

      case "pointer_move":
        const movingPointer = event.pointer || event.name;
        const fromPos = pointers[movingPointer];
        const toPos = event.to !== undefined ? event.to : event.value;

        pointers[movingPointer] = toPos;

        steps.push({
          stepNumber: steps.length + 1,
          type: "pointer_move",
          description: `Moving pointer ${movingPointer} from ${
            fromPos === null ? "null" : `node ${fromPos}`
          } to ${toPos === null ? "null" : `node ${toPos}`}`,
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: [fromPos, toPos].filter(
            (p) => p !== null && p !== undefined
          ),
          pointers: { ...pointers },
          highlightedPointers: [movingPointer],
          code: event,
        });
        break;

      case "node_visit":
        const nodeIndex = event.index !== undefined ? event.index : event.node;

        steps.push({
          stepNumber: steps.length + 1,
          type: "node_visit",
          description: `Visiting node at position ${nodeIndex}`,
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: [nodeIndex],
          pointers: { ...pointers },
          currentNode: nodeIndex,
          code: event,
        });
        break;

      case "node_value_access":
        const accessIndex =
          event.index !== undefined ? event.index : event.node;
        const accessValue = event.value;

        steps.push({
          stepNumber: steps.length + 1,
          type: "node_value_access",
          description: `Accessing value ${accessValue} at node ${accessIndex}`,
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: [accessIndex],
          pointers: { ...pointers },
          accessedValue: accessValue,
          code: event,
        });
        break;

      case "loop_iteration":
        // Extract pointer positions for highlighting
        const currentPointerIndices = Object.values(pointers).filter(
          (v) => typeof v === "number" && v >= 0
        );

        steps.push({
          stepNumber: steps.length + 1,
          type: "loop_iteration",
          description: `Loop iteration`,
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: currentPointerIndices,
          pointers: { ...pointers },
          code: event,
        });
        break;

      case "condition_check":
        steps.push({
          stepNumber: steps.length + 1,
          type: "condition",
          description: "Checking condition",
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: Object.values(pointers).filter(
            (v) => typeof v === "number"
          ),
          pointers: { ...pointers },
          code: event,
        });
        break;

      case "return":
        steps.push({
          stepNumber: steps.length + 1,
          type: "return",
          description: "Returning result",
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: [],
          pointers: { ...pointers },
          code: event,
        });
        break;

      case "final_result":
        steps.push({
          stepNumber: steps.length + 1,
          type: "final",
          description: `Traversal complete. Result: ${JSON.stringify(
            event.result
          )}`,
          variables: currentVariables,
          linkedList: linkedList,
          highlightedNodes: [],
          pointers: {},
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
            linkedList: linkedList,
            highlightedNodes: [],
            pointers: { ...pointers },
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
      linkedList: linkedList || [],
      highlightedNodes: [],
      pointers: {},
    });
  }

  return steps;
}

/**
 * Extract linked list from test case or trace
 */
function extractInputLinkedList(testCase, trace) {
  // Try to parse from test case
  try {
    const parsed = JSON.parse(`[${testCase}]`);

    // Array format: [1, 2, 3, 4, 5]
    if (Array.isArray(parsed[0])) {
      return parsed[0];
    }

    // Object format: { val: 1, next: { val: 2, next: null } }
    if (parsed[0] && typeof parsed[0] === "object" && "val" in parsed[0]) {
      return linkedListToArray(parsed[0]);
    }
  } catch (e) {
    // Parsing failed
  }

  // Try to extract from trace
  for (const event of trace) {
    if (event.type === "input_params" && event.args && event.args[0]) {
      if (Array.isArray(event.args[0])) {
        return event.args[0];
      } else if (typeof event.args[0] === "object") {
        return linkedListToArray(event.args[0]);
      }
    }
  }

  return [];
}

/**
 * Convert linked list object to array
 * { val: 1, next: { val: 2, next: null } } -> [1, 2]
 */
function linkedListToArray(head) {
  const result = [];
  let current = head;
  let maxNodes = 100; // Prevent infinite loops in circular lists

  while (current && maxNodes > 0) {
    result.push(current.val);
    current = current.next;
    maxNodes--;
  }

  return result;
}

module.exports = { processTrace };
