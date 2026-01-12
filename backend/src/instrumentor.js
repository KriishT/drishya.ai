const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

/**
 * Instruments JavaScript code to track execution steps
 * FIXED: Now tracks loop variable updates (i++, j++, etc.) properly
 * @param {string} code - The user's LeetCode solution
 * @param {string} dataStructure - The detected data structure type
 * @returns {string} - Instrumented code
 */
function instrumentCode(code, dataStructure = "array") {
  let traceId = 0;

  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  const visitedNodes = new WeakSet();
  const functionParams = new Set();
  const declaredVars = new Set();

  const createTraceCall = (metadata) => {
    return t.callExpression(t.identifier("__trace"), [
      t.objectExpression(
        Object.entries(metadata).map(([key, value]) =>
          t.objectProperty(
            t.identifier(key),
            typeof value === "string"
              ? t.stringLiteral(value)
              : typeof value === "number"
              ? t.numericLiteral(value)
              : typeof value === "boolean"
              ? t.booleanLiteral(value)
              : value
          )
        )
      ),
    ]);
  };

  const createVarTracker = (varName, valueExpr) => {
    return t.callExpression(t.identifier("__setVar"), [
      t.stringLiteral(varName),
      valueExpr,
    ]);
  };

  // Helper to extract variable name from assignment left side
  const getAssignmentVarName = (node) => {
    if (t.isIdentifier(node)) {
      return node.name;
    }
    if (t.isMemberExpression(node)) {
      // answer[0] → "answer"
      // obj.prop → "obj"
      if (t.isIdentifier(node.object)) {
        return node.object.name;
      }
    }
    return null;
  };

  traverse(ast, {
    // Instrument function declarations
    FunctionDeclaration(path) {
      if (visitedNodes.has(path.node)) return;
      visitedNodes.add(path.node);

      const functionName = path.node.id.name;

      // Track parameters (these are our arrays/inputs)
      path.node.params.forEach((param) => {
        if (t.isIdentifier(param)) {
          functionParams.add(param.name);
          declaredVars.add(param.name);
        }
      });

      // Add trace at function entry
      const entryTrace = t.expressionStatement(
        createTraceCall({
          type: "function_enter",
          name: functionName,
          dataStructure: dataStructure,
          id: traceId++,
          line: path.node.loc?.start.line || 0,
        })
      );

      // Insert at beginning of function body
      if (t.isBlockStatement(path.node.body)) {
        path.node.body.body.unshift(entryTrace);
      }
    },

    // Instrument variable declarations - WITH VALUE TRACKING
    VariableDeclarator(path) {
      if (visitedNodes.has(path.node)) return;
      visitedNodes.add(path.node);

      const id = path.node.id;
      const init = path.node.init;

      // Skip if no initializer
      if (!init) return;

      // Skip if parent is a for loop (handled separately)
      if (t.isForStatement(path.parent)) return;

      if (t.isIdentifier(id)) {
        const varName = id.name;
        declaredVars.add(varName);

        // Wrap initialization with trace AND __setVar to capture value
        path.node.init = t.sequenceExpression([
          createTraceCall({
            type: "var_declaration",
            name: varName,
            id: traceId++,
            line: path.node.loc?.start.line || 0,
          }),
          createVarTracker(varName, init),
        ]);
      }
    },

    // Instrument assignments - ENHANCED TO HANDLE ARRAY ELEMENTS
    AssignmentExpression(path) {
      if (visitedNodes.has(path.node)) return;
      visitedNodes.add(path.node);

      const varName = getAssignmentVarName(path.node.left);

      if (!varName) return;

      // Only track if variable was declared or is a parameter
      if (!declaredVars.has(varName) && !functionParams.has(varName)) {
        return;
      }

      const rightSide = path.node.right;

      // For simple assignments (x = 5)
      if (t.isIdentifier(path.node.left)) {
        path.replaceWith(
          t.sequenceExpression([
            createTraceCall({
              type: "assignment",
              name: varName,
              id: traceId++,
              line: path.node.loc?.start.line || 0,
            }),
            t.assignmentExpression(
              "=",
              path.node.left,
              createVarTracker(varName, rightSide)
            ),
          ])
        );
      }
      // For array/object assignments (answer[0] = 5, obj.x = 5)
      else if (t.isMemberExpression(path.node.left)) {
        // We need to track the variable AFTER the assignment
        // Replace: answer[0] = 5
        // With: (answer[0] = 5, __trace(...), __setVar('answer', answer))

        path.replaceWith(
          t.sequenceExpression([
            // Do the assignment
            path.node,
            // Trace it
            createTraceCall({
              type: "assignment",
              name: varName,
              id: traceId++,
              line: path.node.loc?.start.line || 0,
            }),
            // Track the updated value
            createVarTracker(varName, t.identifier(varName)),
          ])
        );
      }
    },

    // ✅ NEW: Instrument update expressions (i++, ++i, i--, --i)
    UpdateExpression(path) {
      if (visitedNodes.has(path.node)) return;

      const argument = path.node.argument;

      // Only track updates to declared variables
      if (!t.isIdentifier(argument)) return;

      const varName = argument.name;

      if (!declaredVars.has(varName) && !functionParams.has(varName)) {
        return;
      }

      visitedNodes.add(path.node);

      // Replace i++ with (i++, __setVar('i', i), i)
      // The extra 'i' at the end ensures the expression returns the correct value
      const original = path.node;

      path.replaceWith(
        t.sequenceExpression([
          original,
          createVarTracker(varName, t.identifier(varName)),
          t.identifier(varName),
        ])
      );
    },

    // Instrument expression statements to catch method calls
    ExpressionStatement(path) {
      if (visitedNodes.has(path.node)) return;

      const expr = path.node.expression;

      // Check if it's a call expression (method call)
      if (t.isCallExpression(expr)) {
        const callee = expr.callee;

        // Check for method calls like stack.push(i), arr.pop(), etc.
        if (t.isMemberExpression(callee) && t.isIdentifier(callee.object)) {
          const objectName = callee.object.name;
          const methodName = t.isIdentifier(callee.property)
            ? callee.property.name
            : null;

          // Track if it's a mutating array/object method
          const mutatingMethods = [
            "push",
            "pop",
            "shift",
            "unshift",
            "splice",
            "sort",
            "reverse",
            "fill",
            "copyWithin",
          ];

          if (
            methodName &&
            mutatingMethods.includes(methodName) &&
            (declaredVars.has(objectName) || functionParams.has(objectName))
          ) {
            visitedNodes.add(path.node);

            // Insert trace and variable tracking after the method call
            path.replaceWithMultiple([
              path.node, // Original method call
              t.expressionStatement(
                createTraceCall({
                  type: "assignment",
                  name: objectName,
                  id: traceId++,
                  line: path.node.loc?.start.line || 0,
                })
              ),
              t.expressionStatement(
                createVarTracker(objectName, t.identifier(objectName))
              ),
            ]);
          }
        }
      }
    },

    // Instrument for loops - WITH LOOP VARIABLE TRACKING
    ForStatement(path) {
      if (visitedNodes.has(path.node)) return;
      visitedNodes.add(path.node);

      const loopId = traceId++;

      // Add trace at loop start
      const loopStartTrace = t.expressionStatement(
        createTraceCall({
          type: "loop_start",
          loopType: "for",
          id: loopId,
          line: path.node.loc?.start.line || 0,
        })
      );

      // Extract loop variable names (i, j, k, etc.)
      const loopVars = [];
      if (path.node.init && t.isVariableDeclaration(path.node.init)) {
        path.node.init.declarations.forEach((decl) => {
          if (t.isIdentifier(decl.id)) {
            loopVars.push(decl.id.name);
            declaredVars.add(decl.id.name);
          }
        });
      }

      // Create traces for loop body START
      const bodyStartTraces = [
        // Loop iteration trace
        t.expressionStatement(
          createTraceCall({
            type: "loop_iteration",
            loopType: "for",
            id: loopId,
            line: path.node.loc?.start.line || 0,
          })
        ),
      ];

      // Add __setVar for each loop variable to track its value AT START of iteration
      loopVars.forEach((varName) => {
        bodyStartTraces.push(
          t.expressionStatement(
            createVarTracker(varName, t.identifier(varName))
          )
        );
      });

      const body = path.node.body;

      if (t.isBlockStatement(body)) {
        body.body.unshift(...bodyStartTraces);
      } else {
        path.node.body = t.blockStatement([...bodyStartTraces, body]);
      }

      // Insert loop start trace before the loop
      path.insertBefore(loopStartTrace);
    },

    // SAFE array access tracking - only for reads, not writes
    MemberExpression(path) {
      // Skip if already visited
      if (visitedNodes.has(path.node)) return;

      // Skip if this is inside a __trace, __traceAccess, or __setVar call
      if (
        path.findParent(
          (p) =>
            p.isCallExpression() &&
            p.node.callee.type === "Identifier" &&
            (p.node.callee.name === "__trace" ||
              p.node.callee.name === "__traceAccess" ||
              p.node.callee.name === "__setVar")
        )
      ) {
        return;
      }

      // Only track computed member access (array[i], not array.length)
      if (!path.node.computed) return;

      const object = path.node.object;
      const property = path.node.property;

      // Only track access to function parameters (the input arrays)
      if (!t.isIdentifier(object) || !functionParams.has(object.name)) {
        return;
      }

      // Skip if this is the left side of an assignment
      const parent = path.parent;
      if (t.isAssignmentExpression(parent) && parent.left === path.node) {
        return;
      }

      // Skip if this is being modified (++, --, etc)
      if (t.isUpdateExpression(parent)) {
        return;
      }

      visitedNodes.add(path.node);

      const arrayName = object.name;
      const accessId = traceId++;

      // Create a traced access that logs then returns the value
      const tracedAccess = t.sequenceExpression([
        // Log the access
        t.callExpression(t.identifier("__trace"), [
          t.objectExpression([
            t.objectProperty(
              t.identifier("type"),
              t.stringLiteral("array_access")
            ),
            t.objectProperty(t.identifier("array"), t.stringLiteral(arrayName)),
            t.objectProperty(t.identifier("index"), property),
            t.objectProperty(t.identifier("value"), path.node),
            t.objectProperty(t.identifier("id"), t.numericLiteral(accessId)),
          ]),
        ]),
        // Return the actual value
        path.node,
      ]);

      // Replace the member expression with our traced version
      path.replaceWith(tracedAccess);
      path.skip(); // Don't traverse into replacement
    },

    // Instrument while loops
    WhileStatement(path) {
      if (visitedNodes.has(path.node)) return;
      visitedNodes.add(path.node);

      const loopId = traceId++;

      const bodyTrace = t.expressionStatement(
        createTraceCall({
          type: "loop_iteration",
          loopType: "while",
          id: loopId,
          line: path.node.loc?.start.line || 0,
        })
      );

      const body = path.node.body;

      if (t.isBlockStatement(body)) {
        body.body.unshift(bodyTrace);
      } else {
        path.node.body = t.blockStatement([bodyTrace, body]);
      }
    },

    // Instrument if statements
    IfStatement(path) {
      if (visitedNodes.has(path.node)) return;
      visitedNodes.add(path.node);

      const ifId = traceId++;

      const testTrace = t.expressionStatement(
        createTraceCall({
          type: "condition_check",
          id: ifId,
          line: path.node.loc?.start.line || 0,
        })
      );

      path.insertBefore(testTrace);
    },

    // Instrument return statements
    ReturnStatement(path) {
      if (visitedNodes.has(path.node)) return;
      visitedNodes.add(path.node);

      const returnTrace = t.expressionStatement(
        createTraceCall({
          type: "return",
          id: traceId++,
          line: path.node.loc?.start.line || 0,
        })
      );

      path.insertBefore(returnTrace);
    },
  });

  // Generate instrumented code
  const output = generate(ast, {
    retainLines: false,
    compact: false,
  });

  return output.code;
}

module.exports = { instrumentCode };
