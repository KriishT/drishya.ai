/**
 * Process trace events for TREE data structures
 * FIXED: Captures original tree from FIRST trace event before mutations
 */

function processTrace(trace, testCase) {
  const steps = [];
  let stepCounter = 1;

  // Tree traversal state
  const visitedNodes = new Set();
  const traversalOrder = [];
  const callStack = [];

  /**
   * Deep clone a tree node
   */
  const deepCloneTree = (node) => {
    if (!node) return null;

    // ✅ Handle circular references and create true deep copy
    const cloned = {
      val: node.val,
    };

    // Only add left/right if they exist to match original structure
    if ("left" in node) {
      cloned.left = deepCloneTree(node.left);
    }
    if ("right" in node) {
      cloned.right = deepCloneTree(node.right);
    }

    return cloned;
  };

  /**
   * Check if a value is a tree node
   */
  const isTreeNode = (value) => {
    return value && typeof value === "object" && "val" in value;
  };

  // ✅ CRITICAL FIX: Get original tree from FIRST event (before any execution)
  let originalTree = null;
  let currentTree = null;

  if (trace.length > 0) {
    // First trace event has the INPUT tree
    if (trace[0].args && trace[0].args[0]) {
      const inputTree = trace[0].args[0];
      originalTree = deepCloneTree(inputTree);
      currentTree = inputTree; // Keep reference for DFS sequence
    }
  }

  // Build DFS sequence from ORIGINAL tree (not mutated one)
  const buildDFSSequence = (node, path = [], sequence = []) => {
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

  const dfsSequence = buildDFSSequence(originalTree);
  let functionCallIndex = -1;

  // Helper: Build path nodes (values along the path)
  const buildPathNodes = (path) => {
    if (!originalTree || !path || path.length === 0) return [];

    const pathNodes = [originalTree.val];
    let current = originalTree;

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
    tree: deepCloneTree(originalTree), // ✅ Use cloned original
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
          event.name === "sortedArrayToBST" ||
          event.name === "mergeTrees" ||
          event.name === "buildTree" ||
          event.name === "lowestCommonAncestor"
        ) {
          functionCallIndex++;

          if (functionCallIndex < dfsSequence.length) {
            const nodeInfo = dfsSequence[functionCallIndex];
            callStack.push(nodeInfo);

            if (!nodeInfo.isNull) {
              visitedNodes.add(nodeInfo.val);
              traversalOrder.push(nodeInfo.val);
              highlightedNodes = [nodeInfo.val];

              if (functionCallIndex === 0) {
                description = `Entering function: ${event.name} (root node ${nodeInfo.val})`;
              } else {
                const pathDesc =
                  nodeInfo.path.length > 0
                    ? nodeInfo.path[nodeInfo.path.length - 1]
                    : "root";
                description = `Visiting ${pathDesc} child (node ${nodeInfo.val})`;
              }

              currentPathNodes = buildPathNodes(nodeInfo.path);
            } else {
              highlightedNodes = currentNodeInfo ? [currentNodeInfo.val] : [];

              const pathDesc =
                nodeInfo.path.length > 0
                  ? nodeInfo.path[nodeInfo.path.length - 1]
                  : "child";
              description = `Checking ${pathDesc} child (null)`;

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
        if (callStack.length > 0) {
          const lastCall = callStack[callStack.length - 1];
          if (lastCall.isNull) {
            description = "Returning from null node";
          } else {
            description = `Returning from node ${lastCall.val}`;
            highlightedNodes = [lastCall.val];
          }
        } else {
          description = "Returning from recursion";
        }

        if (callStack.length > 0) {
          callStack.pop();
        }

        if (callStack.length > 0) {
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
      tree: deepCloneTree(originalTree), // ✅ Always use original unmutated tree
      highlightedNodes: highlightedNodes,
      visitedNodes: Array.from(visitedNodes),
      currentPath: currentPathNodes,
      traversalOrder: [...traversalOrder],
      code: event,
    });
  }

  // ✅ CRITICAL: Get result tree from FINAL trace event (the mutated one)
  const lastEvent = trace[trace.length - 1];
  const result = lastEvent.result !== undefined ? lastEvent.result : null;

  // Check if result is a tree
  const hasTreeResult = isTreeNode(result);

  // For functions that mutate in place (like invertTree),
  // the result IS the mutated tree
  let resultTree = null;
  if (hasTreeResult) {
    resultTree = deepCloneTree(result);
  } else if (result === null || result === undefined) {
    // If result is null but we know it's invertTree, use the mutated currentTree
    if (trace.some((e) => e.name === "invertTree")) {
      resultTree = deepCloneTree(currentTree);
    }
  }

  let finalDescription = "Traversal complete.";
  if (resultTree) {
    finalDescription =
      "Tree transformation complete. Compare input and output below.";
  } else if (result !== null && result !== undefined) {
    finalDescription = `Traversal complete. Result: ${result}`;
  }

  steps.push({
    stepNumber: stepCounter++,
    type: "final",
    description: finalDescription,
    variables: lastEvent.variables || {},
    tree: deepCloneTree(originalTree), // ✅ Original unmutated tree
    resultTree: resultTree, // ✅ Final mutated tree
    highlightedNodes: [],
    visitedNodes: Array.from(visitedNodes),
    currentPath: [],
    traversalOrder: [...traversalOrder],
    result: result,
    hasTreeResult: !!resultTree,
    code: lastEvent,
  });

  return steps;
}

module.exports = { processTrace };
