/**
 * Process trace events for TREE data structures
 * Tracks visited nodes, current path, and traversal order
 * FIXED: Pre-computes DFS sequence INCLUDING null nodes to match actual function calls
 * @returns {Array} - Array of visualization steps (not object)
 */

function processTrace(trace, testCase) {
  const steps = [];
  let stepCounter = 1;

  // Tree traversal state
  const visitedNodes = new Set();
  const traversalOrder = [];
  const callStack = []; // Track recursive calls with paths

  // Get the tree from first trace event
  let tree = null;
  if (trace.length > 0 && trace[0].args && trace[0].args[0]) {
    tree = trace[0].args[0];
  }

  // ✅ FIX: Pre-compute DFS sequence INCLUDING null nodes
  const buildDFSSequence = (node, path = [], sequence = []) => {
    // ✅ CRITICAL: Track null nodes too - they trigger function calls!
    if (!node) {
      sequence.push({
        node: null,
        path: [...path],
        val: null,
        isNull: true,
      });
      return sequence;
    }

    sequence.push({
      node: node,
      path: [...path],
      val: node.val,
      isNull: false,
    });

    buildDFSSequence(node.left, [...path, "left"], sequence);
    buildDFSSequence(node.right, [...path, "right"], sequence);

    return sequence;
  };

  const dfsSequence = buildDFSSequence(tree);
  let functionCallIndex = -1;

  // Helper: Get node value
  const getNodeValue = (node) => {
    return node ? node.val : null;
  };

  // Helper: Build path nodes (values along the path)
  const buildPathNodes = (path) => {
    if (!tree || !path || path.length === 0) return [];

    const pathNodes = [tree.val];
    let current = tree;

    for (const direction of path) {
      if (!current) break;
      current = direction === "left" ? current.left : current.right;
      if (current) {
        pathNodes.push(current.val);
      }
    }

    return pathNodes;
  };

  // Add initial step
  steps.push({
    stepNumber: stepCounter++,
    type: "init",
    description: "Tree traversal started",
    variables: {},
    tree: tree,
    highlightedNodes: [],
    visitedNodes: [],
    currentPath: [],
    traversalOrder: [],
    code: trace[0],
  });

  // Process each trace event
  for (let i = 1; i < trace.length; i++) {
    const event = trace[i];

    let description = "";
    let highlightedNodes = [];
    let currentPathNodes = [];
    let currentNodeInfo = null;

    // Get current node from call stack (last non-null node)
    if (callStack.length > 0) {
      // Find the last non-null node in call stack
      for (let j = callStack.length - 1; j >= 0; j--) {
        if (!callStack[j].isNull) {
          currentNodeInfo = callStack[j];
          currentPathNodes = buildPathNodes(currentNodeInfo.path);
          break;
        }
      }
    }

    switch (event.type) {
      case "function_enter":
        if (
          event.name === "maxDepth" ||
          event.name === "inorderTraversal" ||
          event.name === "preorderTraversal" ||
          event.name === "postorderTraversal" ||
          event.name === "isSymmetric" ||
          event.name === "isSameTree" ||
          event.name === "invertTree" ||
          event.name === "isValidBST" ||
          event.name === "minDepth" ||
          event.name === "hasPathSum" ||
          event.name === "levelOrder" ||
          event.name === "sortedArrayToBST"
        ) {
          // ✅ FIX: Use pre-computed DFS sequence (includes nulls)
          functionCallIndex++;

          if (functionCallIndex < dfsSequence.length) {
            const nodeInfo = dfsSequence[functionCallIndex];

            // Add to call stack (including nulls for accurate tracking)
            callStack.push(nodeInfo);

            if (!nodeInfo.isNull) {
              // Non-null node: track it
              visitedNodes.add(nodeInfo.val);
              traversalOrder.push(nodeInfo.val);
              highlightedNodes = [nodeInfo.val];

              // Build description
              if (functionCallIndex === 0) {
                description = `Entering function: ${event.name} (root node ${nodeInfo.val})`;
              } else {
                const pathDesc =
                  nodeInfo.path.length > 0
                    ? nodeInfo.path[nodeInfo.path.length - 1]
                    : "root";
                description = `Visiting ${pathDesc} child (node ${nodeInfo.val})`;
              }

              // Update current path
              currentPathNodes = buildPathNodes(nodeInfo.path);
            } else {
              // Null node: don't track in visited, but show in description
              highlightedNodes = currentNodeInfo ? [currentNodeInfo.val] : [];

              const pathDesc =
                nodeInfo.path.length > 0
                  ? nodeInfo.path[nodeInfo.path.length - 1]
                  : "child";
              description = `Checking ${pathDesc} child (null)`;

              // Keep current path as parent's path
              if (currentNodeInfo) {
                currentPathNodes = buildPathNodes(currentNodeInfo.path);
              }
            }
          } else {
            description = `Entering function: ${event.name}`;
          }
        }
        break;

      case "condition_check":
        description = "Checking condition";
        if (currentNodeInfo) {
          highlightedNodes = [currentNodeInfo.val];
        }
        break;

      case "return":
        // Determine what we're returning from
        let returningFrom = "recursion";
        if (callStack.length > 0) {
          const lastCall = callStack[callStack.length - 1];
          if (lastCall.isNull) {
            returningFrom = "null check";
            description = "Returning 0 (null node)";
          } else {
            returningFrom = `node ${lastCall.val}`;
            description = `Returning from node ${lastCall.val}`;
            highlightedNodes = [lastCall.val];
          }
        } else {
          description = "Returning from recursion";
        }

        // Pop from call stack on return
        if (callStack.length > 0) {
          callStack.pop();
        }

        // Update current path after popping
        if (callStack.length > 0) {
          // Find last non-null node for path
          for (let j = callStack.length - 1; j >= 0; j--) {
            if (!callStack[j].isNull) {
              currentPathNodes = buildPathNodes(callStack[j].path);
              break;
            }
          }
        } else {
          currentPathNodes = [];
        }
        break;

      case "var_declaration":
      case "assignment":
        description = `Variable: ${event.name}`;
        if (currentNodeInfo) {
          highlightedNodes = [currentNodeInfo.val];
        }
        break;

      case "final_result":
        description = `Traversal complete. Result: ${event.result}`;
        highlightedNodes = [];
        currentPathNodes = [];
        break;

      default:
        description = `Step: ${event.type}`;
        if (currentNodeInfo) {
          highlightedNodes = [currentNodeInfo.val];
        }
    }

    steps.push({
      stepNumber: stepCounter++,
      type: event.type,
      description: description,
      variables: event.variables || {},
      tree: tree,
      highlightedNodes: highlightedNodes,
      visitedNodes: Array.from(visitedNodes),
      currentPath: currentPathNodes,
      traversalOrder: [...traversalOrder],
      code: event,
    });
  }

  // Add final step
  const lastEvent = trace[trace.length - 1];
  const result = lastEvent.result !== undefined ? lastEvent.result : null;

  steps.push({
    stepNumber: stepCounter++,
    type: "final",
    description: `Traversal complete. Result: ${result}`,
    variables: lastEvent.variables || {},
    tree: tree,
    highlightedNodes: [],
    visitedNodes: Array.from(visitedNodes),
    currentPath: [],
    traversalOrder: [...traversalOrder],
    result: result,
    code: lastEvent,
  });

  return steps;
}

module.exports = { processTrace };
