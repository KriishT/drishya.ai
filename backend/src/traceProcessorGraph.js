/**
 * Graph Trace Processor
 * Processes raw execution trace into visualization steps for GRAPH algorithms
 * @param {Array} trace - Raw trace events from execution
 * @param {string} testCase - Original test case string
 * @returns {Array} - Processed visualization steps
 */
function processTrace(trace, testCase) {
  const steps = [];
  let currentVariables = {};
  let graph = null;
  let visitedNodes = new Set();
  let currentQueue = [];
  let currentStack = [];
  let currentPath = [];

  // Extract graph from test case
  graph = extractInputGraph(testCase, trace);

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
          graph = normalizeGraph(event.args[0]);
        }

        steps.push({
          stepNumber: steps.length + 1,
          type: "init",
          description: "Graph traversal started",
          variables: currentVariables,
          graph: graph,
          highlightedNodes: [],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [],
          code: event,
        });
        break;

      case "function_enter":
        steps.push({
          stepNumber: steps.length + 1,
          type: "function_enter",
          description: `Entering function: ${event.name}`,
          variables: currentVariables,
          graph: graph,
          highlightedNodes: [],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          code: event,
        });
        break;

      case "node_visit":
      case "vertex_visit":
        const nodeId = event.node !== undefined ? event.node : event.vertex;

        if (nodeId !== undefined && nodeId !== null) {
          visitedNodes.add(nodeId);
          currentPath.push(nodeId);
        }

        steps.push({
          stepNumber: steps.length + 1,
          type: "node_visit",
          description: `Visiting node: ${nodeId}`,
          variables: currentVariables,
          graph: graph,
          highlightedNodes: [nodeId],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          currentNode: nodeId,
          code: event,
        });
        break;

      case "edge_traverse":
        const fromNode = event.from;
        const toNode = event.to;

        steps.push({
          stepNumber: steps.length + 1,
          type: "edge_traverse",
          description: `Traversing edge from ${fromNode} to ${toNode}`,
          variables: currentVariables,
          graph: graph,
          highlightedNodes: [fromNode, toNode],
          highlightedEdges: [[fromNode, toNode]],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          code: event,
        });
        break;

      case "queue_enqueue":
      case "enqueue":
        const enqueueNode = event.node !== undefined ? event.node : event.value;
        currentQueue.push(enqueueNode);

        steps.push({
          stepNumber: steps.length + 1,
          type: "queue_enqueue",
          description: `Enqueuing node: ${enqueueNode}`,
          variables: currentVariables,
          graph: graph,
          highlightedNodes: [enqueueNode],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          code: event,
        });
        break;

      case "queue_dequeue":
      case "dequeue":
        const dequeuedNode = currentQueue.shift();

        steps.push({
          stepNumber: steps.length + 1,
          type: "queue_dequeue",
          description: `Dequeuing node: ${dequeuedNode}`,
          variables: currentVariables,
          graph: graph,
          highlightedNodes: dequeuedNode !== undefined ? [dequeuedNode] : [],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          code: event,
        });
        break;

      case "stack_push":
      case "push":
        const pushNode = event.node !== undefined ? event.node : event.value;
        currentStack.push(pushNode);

        steps.push({
          stepNumber: steps.length + 1,
          type: "stack_push",
          description: `Pushing node: ${pushNode}`,
          variables: currentVariables,
          graph: graph,
          highlightedNodes: [pushNode],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          code: event,
        });
        break;

      case "stack_pop":
      case "pop":
        const poppedNode = currentStack.pop();

        steps.push({
          stepNumber: steps.length + 1,
          type: "stack_pop",
          description: `Popping node: ${poppedNode}`,
          variables: currentVariables,
          graph: graph,
          highlightedNodes: poppedNode !== undefined ? [poppedNode] : [],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          code: event,
        });
        break;

      case "condition_check":
        steps.push({
          stepNumber: steps.length + 1,
          type: "condition",
          description: "Checking condition",
          variables: currentVariables,
          graph: graph,
          highlightedNodes:
            currentPath.length > 0 ? [currentPath[currentPath.length - 1]] : [],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          code: event,
        });
        break;

      case "return":
        steps.push({
          stepNumber: steps.length + 1,
          type: "return",
          description: "Returning result",
          variables: currentVariables,
          graph: graph,
          highlightedNodes: [],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [...currentQueue],
          currentStack: [...currentStack],
          currentPath: [...currentPath],
          code: event,
        });
        break;

      case "final_result":
        steps.push({
          stepNumber: steps.length + 1,
          type: "final",
          description: `Graph traversal complete. Result: ${JSON.stringify(
            event.result
          )}`,
          variables: currentVariables,
          graph: graph,
          highlightedNodes: [],
          highlightedEdges: [],
          visitedNodes: Array.from(visitedNodes),
          currentQueue: [],
          currentStack: [],
          currentPath: [...currentPath],
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
            graph: graph,
            highlightedNodes: [],
            highlightedEdges: [],
            visitedNodes: Array.from(visitedNodes),
            currentQueue: [...currentQueue],
            currentStack: [...currentStack],
            currentPath: [...currentPath],
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
      graph: graph || { nodes: [], edges: [] },
      highlightedNodes: [],
      highlightedEdges: [],
      visitedNodes: [],
      currentQueue: [],
      currentStack: [],
      currentPath: [],
    });
  }

  return steps;
}

/**
 * Extract graph from test case or trace
 */
function extractInputGraph(testCase, trace) {
  // Try to parse from test case
  try {
    const parsed = JSON.parse(`[${testCase}]`);

    if (parsed[0]) {
      return normalizeGraph(parsed[0]);
    }
  } catch (e) {
    // Parsing failed
  }

  // Try to extract from trace
  for (const event of trace) {
    if (event.type === "input_params" && event.args && event.args[0]) {
      return normalizeGraph(event.args[0]);
    }
  }

  return { nodes: [], edges: [] };
}

/**
 * Normalize graph to standard format
 * Supports: adjacency list, adjacency matrix, edge list
 */
function normalizeGraph(input) {
  // Already in normalized format
  if (input && input.nodes && input.edges) {
    return input;
  }

  // Adjacency list: [[1,2], [0,2], [0,1]]
  if (Array.isArray(input) && input.length > 0 && Array.isArray(input[0])) {
    const nodes = input.map((_, i) => i);
    const edges = [];

    input.forEach((neighbors, from) => {
      neighbors.forEach((to) => {
        edges.push([from, to]);
      });
    });

    return { nodes, edges };
  }

  // Edge list: [[0,1], [1,2], [2,0]]
  if (Array.isArray(input) && input.length > 0 && input[0].length === 2) {
    const nodeSet = new Set();
    input.forEach(([from, to]) => {
      nodeSet.add(from);
      nodeSet.add(to);
    });

    return {
      nodes: Array.from(nodeSet).sort((a, b) => a - b),
      edges: input,
    };
  }

  return { nodes: [], edges: [] };
}

module.exports = { processTrace };
