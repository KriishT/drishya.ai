/**
 * Unwraps LeetCode's Solution class wrapper
 */
function unwrapSolutionClass(code) {
  const lines = code.split("\n");
  const classLineIndex = lines.findIndex((line) =>
    line.trim().match(/^class\s+\w+/)
  );

  if (classLineIndex === -1) {
    return code;
  }

  let methodStartIndex = -1;
  let methodIndent = "";

  for (let i = classLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      !trimmed ||
      trimmed.startsWith("#") ||
      trimmed.startsWith('"""') ||
      trimmed.startsWith("'''")
    ) {
      continue;
    }

    if (trimmed.match(/^def\s+\w+/)) {
      methodStartIndex = i;
      methodIndent = line.match(/^(\s*)/)[1];
      break;
    }
  }

  if (methodStartIndex === -1) {
    return code;
  }

  const methodLines = [];
  let insideMethod = false;

  for (let i = methodStartIndex; i < lines.length; i++) {
    const line = lines[i];

    if (i === methodStartIndex) {
      const methodLine = line.trim();
      const match = methodLine.match(/def\s+(\w+)\s*\(([^)]*)\)/);

      if (match) {
        const methodName = match[1];
        const params = match[2];
        const paramList = params.split(",").map((p) => p.trim());
        const filteredParams = paramList.filter(
          (p) => p !== "self" && p !== ""
        );

        methodLines.push(`def ${methodName}(${filteredParams.join(", ")}):`);
        insideMethod = true;
      }
    } else if (insideMethod) {
      if (
        line.trim() &&
        !line.startsWith(methodIndent + " ") &&
        !line.startsWith(methodIndent + "\t")
      ) {
        if (line.trim().match(/^(def|class)\s+/)) {
          break;
        }
      }

      if (line.startsWith(methodIndent)) {
        methodLines.push(line.substring(methodIndent.length));
      } else if (line.trim() === "") {
        methodLines.push("");
      }
    }
  }

  return methodLines.join("\n");
}

/**
 * Instruments Python code - FIXED: elif chains and chained assignments
 */
function instrumentPythonCode(code, dataStructure = "array") {
  code = unwrapSolutionClass(code);

  let traceId = 0;
  const lines = code.split("\n");
  const instrumented = [];
  const functionParams = new Set();
  const declaredVars = new Set();

  const detectIndentStyle = () => {
    for (const line of lines) {
      const match = line.match(/^(\s+)/);
      if (match) {
        const spaces = match[1];
        if (spaces.includes("\t")) return "\t";
        return " ".repeat(spaces.length);
      }
    }
    return "    ";
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

  const extractArrayAccesses = (line, currentParams) => {
    const accesses = [];
    const pattern = /(\w+)\[([^\]]+)\]/g;
    let match;

    while ((match = pattern.exec(line)) !== null) {
      const arrayName = match[1];
      const index = match[2];

      if (currentParams.has(arrayName)) {
        accesses.push({ arrayName, index, fullAccess: match[0] });
      }
    }

    return accesses;
  };

  const getAssignedVarName = (line) => {
    const trimmed = line.trim();

    const arrayMatch = trimmed.match(/^(\w+)\[[^\]]+\]\s*=/);
    if (arrayMatch) {
      return arrayMatch[1];
    }

    const attrMatch = trimmed.match(/^(\w+)\.\w+\s*=/);
    if (attrMatch) {
      return attrMatch[1];
    }

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

  // ✅ NEW: Extract ALL variables from chained assignments (i = j = k = 0)
  const getChainedVars = (line) => {
    const trimmed = line.trim();
    const chainMatch = trimmed.match(/^([\w\s=]+)=\s*(.+)$/);
    if (!chainMatch) return [];

    const leftSide = chainMatch[1];
    const vars = leftSide
      .split("=")
      .map((v) => v.trim())
      .filter((v) => v && /^\w+$/.test(v));
    return vars.length > 1 ? vars : [];
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

    if (!trimmed || trimmed.startsWith("#")) {
      instrumented.push(line);
      continue;
    }

    // Function definition
    if (trimmed.startsWith("def ")) {
      const funcMatch = trimmed.match(/def\s+(\w+)\s*\(/);
      if (funcMatch) {
        const funcName = funcMatch[1];

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

    // For loop with tuple unpacking
    if (trimmed.startsWith("for ")) {
      const loopId = traceId++;

      const loopVars = [];
      const varMatch = trimmed.match(/for\s+(.+?)\s+in\s+/);
      if (varMatch) {
        const varsPart = varMatch[1].trim();
        const vars = varsPart
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v);
        loopVars.push(...vars);
      }

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

      loopVars.forEach((loopVar) => {
        instrumented.push(`${indent}${indentUnit}${createVarTracker(loopVar)}`);
      });

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

    // ✅ FIXED: If/elif statement - don't break elif chains
    if (trimmed.startsWith("if ") || trimmed.startsWith("elif ")) {
      const isElif = trimmed.startsWith("elif ");

      // Only add condition trace for 'if', not 'elif'
      if (!isElif) {
        const condTrace = createTraceCall({
          type: "condition_check",
          id: traceId++,
          line: i + 1,
        });
        instrumented.push(`${indent}${condTrace}`);

        // ✅ Array access tracking ONLY for 'if', not 'elif'
        const accesses = extractArrayAccesses(line, functionParams);
        if (accesses.length > 0) {
          accesses.forEach((acc) => {
            instrumented.push(
              `${indent}try: _trace_array_access('${acc.arrayName}', ${acc.index}, ${acc.fullAccess})`
            );
            instrumented.push(`${indent}except: pass`);
          });
        }
      }

      instrumented.push(line);
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
      instrumented.push(line);
      continue;
    }

    // ✅ FIXED: Variable assignment with chained assignment support
    const assignedVar = getAssignedVarName(line);
    if (assignedVar) {
      const chainedVars = getChainedVars(line);

      // Handle chained assignments (i = j = k = 0)
      if (chainedVars.length > 0) {
        // Mark all as new vars if needed
        const allNewVars = chainedVars.filter(
          (v) => !declaredVars.has(v) && !functionParams.has(v)
        );
        allNewVars.forEach((v) => declaredVars.add(v));

        // Add trace for first var only
        const varTrace = createTraceCall({
          type: "var_declaration",
          name: chainedVars[0],
          id: traceId++,
          line: i + 1,
        });
        instrumented.push(`${indent}${varTrace}`);

        // Array access tracking
        const accesses = extractArrayAccesses(line, functionParams);
        if (accesses.length > 0) {
          accesses.forEach((acc) => {
            instrumented.push(
              `${indent}try: _trace_array_access('${acc.arrayName}', ${acc.index}, ${acc.fullAccess})`
            );
            instrumented.push(`${indent}except: pass`);
          });
        }

        instrumented.push(line);

        // Track ALL variables
        chainedVars.forEach((v) => {
          instrumented.push(`${indent}${createVarTracker(v)}`);
        });
      } else {
        // Regular single assignment
        const isNewVar =
          !declaredVars.has(assignedVar) && !functionParams.has(assignedVar);
        if (isNewVar) {
          declaredVars.add(assignedVar);
        }

        const varTrace = createTraceCall({
          type: isNewVar ? "var_declaration" : "assignment",
          name: assignedVar,
          id: traceId++,
          line: i + 1,
        });

        instrumented.push(`${indent}${varTrace}`);

        const accesses = extractArrayAccesses(line, functionParams);
        if (accesses.length > 0) {
          accesses.forEach((acc) => {
            instrumented.push(
              `${indent}try: _trace_array_access('${acc.arrayName}', ${acc.index}, ${acc.fullAccess})`
            );
            instrumented.push(`${indent}except: pass`);
          });
        }

        instrumented.push(line);
        instrumented.push(`${indent}${createVarTracker(assignedVar)}`);
      }

      continue;
    }

    // Method calls that modify variables
    const methodCallMatch = trimmed.match(
      /^(\w+)\.(append|extend|insert|remove|pop|clear|sort|reverse)\(/
    );
    if (methodCallMatch) {
      const varName = methodCallMatch[1];

      instrumented.push(line);

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

    // Default: track array accesses (but skip for if/elif lines)
    if (!trimmed.startsWith("if ") && !trimmed.startsWith("elif ")) {
      const accesses = extractArrayAccesses(line, functionParams);
      if (accesses.length > 0) {
        accesses.forEach((acc) => {
          instrumented.push(
            `${indent}try: _trace_array_access('${acc.arrayName}', ${acc.index}, ${acc.fullAccess})`
          );
          instrumented.push(`${indent}except: pass`);
        });
      }
    }

    instrumented.push(line);

    // ✅ NEW: Track compound assignments (i += 1, j -= 1, etc.)
    const compoundMatch = trimmed.match(/^(\w+)\s*([+\-*/%]=)/);
    if (compoundMatch) {
      const varName = compoundMatch[1];
      if (declaredVars.has(varName) || functionParams.has(varName)) {
        instrumented.push(`${indent}${createVarTracker(varName)}`);
      }
    }
  }

  return instrumented.join("\n");
}

module.exports = { instrumentPythonCode };
