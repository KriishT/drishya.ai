/**
 * Instruments Python code to track execution steps
 * FIXED: Now tracks array element assignments like answer[0] = 1
 */
function instrumentPythonCode(code, dataStructure = "array") {
  let traceId = 0;
  const lines = code.split("\n");
  const instrumented = [];
  const functionParams = new Set();
  const declaredVars = new Set();

  // Detect indentation style
  const detectIndentStyle = () => {
    for (const line of lines) {
      const match = line.match(/^(\s+)/);
      if (match) {
        const spaces = match[1];
        if (spaces.includes("\t")) return "\t";
        return " ".repeat(spaces.length);
      }
    }
    return "    "; // Default 4 spaces
  };

  const indentUnit = detectIndentStyle();

  const createTraceCall = (metadata) => {
    const entries = Object.entries(metadata)
      .map(([key, value]) => {
        if (typeof value === "string") {
          const escaped = value.replace(/'/g, "\\'");
          return `'${key}': '${escaped}'`;
        }
        if (typeof value === "boolean")
          return `'${key}': ${value ? "True" : "False"}`;
        if (value === null || value === undefined) return `'${key}': None`;
        return `'${key}': ${value}`;
      })
      .join(", ");
    return `_trace({${entries}})`;
  };

  const createVarTracker = (varName) => {
    return `_set_var('${varName}', ${varName})`;
  };

  const getIndent = (line) => {
    return line.match(/^\s*/)[0];
  };

  const instrumentArrayAccess = (line, currentParams) => {
    const pattern = /(\w+)\[([^\]]+)\]/g;
    let result = line;
    const matches = [];
    let match;

    while ((match = pattern.exec(line)) !== null) {
      matches.push({
        full: match[0],
        arrayName: match[1],
        index: match[2],
        start: match.index,
      });
    }

    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      if (currentParams.has(m.arrayName)) {
        const replacement = `_trace_access('${m.arrayName}', ${m.index}, ${m.full})`;
        result =
          result.slice(0, m.start) +
          replacement +
          result.slice(m.start + m.full.length);
      }
    }

    return result;
  };

  // Extract variable name from assignment (handles x = ..., x[i] = ..., x.y = ...)
  const getAssignedVarName = (line) => {
    const trimmed = line.trim();

    // Match: varName[...] = ...
    const arrayMatch = trimmed.match(/^(\w+)\[[^\]]+\]\s*=/);
    if (arrayMatch) {
      return arrayMatch[1];
    }

    // Match: varName.attr = ...
    const attrMatch = trimmed.match(/^(\w+)\.\w+\s*=/);
    if (attrMatch) {
      return attrMatch[1];
    }

    // Match: varName = ...
    const simpleMatch = trimmed.match(/^(\w+)\s*=/);
    if (
      simpleMatch &&
      !trimmed.includes("==") &&
      !trimmed.includes("!=") &&
      !trimmed.includes("<=") &&
      !trimmed.includes(">=")
    ) {
      return simpleMatch[1];
    }

    return null;
  };

  // First pass: identify function parameters
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith("def ")) {
      const funcMatch = trimmed.match(/def\s+(\w+)\s*\(([^)]*)\)/);
      if (funcMatch) {
        const params = funcMatch[2];
        if (params.trim()) {
          const paramList = params.split(",").map((p) => {
            const name = p.split(":")[0].trim();
            return name.split("=")[0].trim();
          });

          paramList.forEach((name) => {
            if (name && name !== "self") {
              functionParams.add(name);
            }
          });
        }
      }
    }
  }

  // Second pass: instrument code
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = getIndent(line);

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      instrumented.push(line);
      continue;
    }

    // Function definition
    if (trimmed.startsWith("def ")) {
      const funcMatch = trimmed.match(/def\s+(\w+)\s*\(/);
      if (funcMatch) {
        const funcName = funcMatch[1];

        // Skip dunder methods
        if (funcName.startsWith("__") && funcName.endsWith("__")) {
          instrumented.push(line);
          continue;
        }

        instrumented.push(line);

        const trace = createTraceCall({
          type: "function_enter",
          name: funcName,
          data_structure: dataStructure,
          id: traceId++,
          line: i + 1,
        });

        instrumented.push(`${indent}${indentUnit}${trace}`);
        continue;
      }
    }

    // For loop
    if (trimmed.startsWith("for ")) {
      const loopId = traceId++;
      const varMatch = trimmed.match(/for\s+(\w+)\s+in/);
      const loopVar = varMatch ? varMatch[1] : null;

      const loopStart = createTraceCall({
        type: "loop_start",
        loop_type: "for",
        id: loopId,
        line: i + 1,
      });

      instrumented.push(`${indent}${loopStart}`);
      instrumented.push(line);

      const iterTrace = createTraceCall({
        type: "loop_iteration",
        loop_type: "for",
        id: loopId,
        line: i + 1,
      });

      instrumented.push(`${indent}${indentUnit}${iterTrace}`);

      if (loopVar) {
        instrumented.push(`${indent}${indentUnit}${createVarTracker(loopVar)}`);
      }
      continue;
    }

    // While loop
    if (trimmed.startsWith("while ")) {
      const loopId = traceId++;
      instrumented.push(line);

      const iterTrace = createTraceCall({
        type: "loop_iteration",
        loop_type: "while",
        id: loopId,
        line: i + 1,
      });

      instrumented.push(`${indent}${indentUnit}${iterTrace}`);
      continue;
    }

    // If/elif statement
    if (trimmed.startsWith("if ") || trimmed.startsWith("elif ")) {
      const condTrace = createTraceCall({
        type: "condition_check",
        id: traceId++,
        line: i + 1,
      });

      instrumented.push(`${indent}${condTrace}`);
      const instrumentedLine = instrumentArrayAccess(line, functionParams);
      instrumented.push(instrumentedLine);
      continue;
    }

    // Return statement
    if (trimmed.startsWith("return")) {
      const returnTrace = createTraceCall({
        type: "return",
        id: traceId++,
        line: i + 1,
      });

      instrumented.push(`${indent}${returnTrace}`);
      const instrumentedLine = instrumentArrayAccess(line, functionParams);
      instrumented.push(instrumentedLine);
      continue;
    }

    // Variable assignment (handles x=..., x[i]=..., x.y=...)
    const assignedVar = getAssignedVarName(line);
    if (assignedVar) {
      // Track if this is a new variable declaration
      const isNewVar =
        !declaredVars.has(assignedVar) && !functionParams.has(assignedVar);
      if (isNewVar) {
        declaredVars.add(assignedVar);
      }

      // Add trace for assignment
      const varTrace = createTraceCall({
        type: isNewVar ? "var_declaration" : "assignment",
        name: assignedVar,
        id: traceId++,
        line: i + 1,
      });

      instrumented.push(`${indent}${varTrace}`);

      // Add the actual assignment line (with array access instrumentation if needed)
      const instrumentedLine = instrumentArrayAccess(line, functionParams);
      instrumented.push(instrumentedLine);

      // CRITICAL: Add _set_var AFTER the assignment to capture the updated value
      instrumented.push(`${indent}${createVarTracker(assignedVar)}`);
      continue;
    }

    // Method calls that modify variables (list.append, etc.)
    const methodCallMatch = trimmed.match(
      /^(\w+)\.(append|extend|insert|remove|pop|clear|sort|reverse)\(/
    );
    if (methodCallMatch) {
      const varName = methodCallMatch[1];

      // Add the method call
      instrumented.push(line);

      // Track the variable change after the method call
      if (declaredVars.has(varName) || functionParams.has(varName)) {
        const trace = createTraceCall({
          type: "assignment",
          name: varName,
          id: traceId++,
          line: i + 1,
        });
        instrumented.push(`${indent}${trace}`);
        instrumented.push(`${indent}${createVarTracker(varName)}`);
      }
      continue;
    }

    // Default: check for array access in any line
    const instrumentedLine = instrumentArrayAccess(line, functionParams);
    if (instrumentedLine !== line) {
      instrumented.push(instrumentedLine);
    } else {
      instrumented.push(line);
    }
  }

  return instrumented.join("\n");
}

module.exports = { instrumentPythonCode };
