/**
 * Instruments Java code to track execution steps
 * Includes array access tracking for visualization
 */
function instrumentJavaCode(code, dataStructure = "array") {
  let traceId = 0;
  const lines = code.split("\n");
  const instrumented = [];
  const functionParams = new Set();

  const createTraceCall = (metadata) => {
    const entries = Object.entries(metadata)
      .map(([key, value]) => {
        let valueStr;
        if (value === null || value === undefined) {
          valueStr = "null";
        } else if (typeof value === "string") {
          // Escape quotes and backslashes
          const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          valueStr = `"${escaped}"`;
        } else if (typeof value === "boolean") {
          valueStr = value.toString();
        } else {
          valueStr = value.toString();
        }
        return `put("${key}", ${valueStr})`;
      })
      .join("; ");

    return `Tracer.trace(new HashMap<String, Object>() {{ ${entries}; }});`;
  };

  const createVarTracker = (varName, indent) => {
    return `${" ".repeat(indent)}Tracer.setVar("${varName}", ${varName});`;
  };

  const getIndent = (line) => {
    return (line.match(/^\s*/) || [""])[0].length;
  };

  const instrumentArrayAccess = (line, currentParams) => {
    // Find all array[index] patterns
    const pattern = /(\w+)\[([^\]]+)\]/g;
    let result = line;
    const matches = [];
    let match;

    // Collect all matches
    while ((match = pattern.exec(line)) !== null) {
      matches.push({
        full: match[0],
        arrayName: match[1],
        index: match[2],
        start: match.index,
      });
    }

    // Replace from right to left to preserve positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];

      // Only instrument if it's a function parameter
      if (currentParams.has(m.arrayName)) {
        const replacement = `Tracer.traceAccess("${m.arrayName}", ${m.index}, ${m.full})`;
        result =
          result.slice(0, m.start) +
          replacement +
          result.slice(m.start + m.full.length);
      }
    }

    return result;
  };

  const isMethodDeclaration = (trimmed) => {
    // Match: [modifiers] ReturnType methodName(params)
    const methodPattern =
      /^(public|private|protected)?\s*(static)?\s*([\w<>\[\]]+)\s+(\w+)\s*\([^)]*\)\s*\{?$/;

    if (!methodPattern.test(trimmed)) return null;

    // Exclude control structures
    if (
      trimmed.startsWith("if") ||
      trimmed.startsWith("for") ||
      trimmed.startsWith("while") ||
      trimmed.startsWith("switch")
    ) {
      return null;
    }

    // Exclude lines with semicolons (method calls)
    if (trimmed.includes(";")) return null;

    const match = trimmed.match(methodPattern);
    if (match) {
      return {
        methodName: match[4],
        paramsStr: trimmed.match(/\(([^)]*)\)/)[1],
      };
    }

    return null;
  };

  // First pass: identify function parameters
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const methodInfo = isMethodDeclaration(trimmed);
    if (methodInfo) {
      const params = methodInfo.paramsStr;

      if (params.trim()) {
        // Parse: "int[] nums, int target" or "List<Integer> list, int n"
        const paramList = params.split(",");

        paramList.forEach((param) => {
          const parts = param.trim().split(/\s+/);
          if (parts.length >= 2) {
            // Last part is parameter name
            const paramName = parts[parts.length - 1];
            // Remove any array brackets or special chars
            const cleanName = paramName.replace(/[\[\]]/g, "");
            if (cleanName) {
              functionParams.add(cleanName);
            }
          }
        });
      }
    }
  }

  // Second pass: instrument code
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = getIndent(line);
    const spaces = " ".repeat(indent);

    // Skip empty lines, comments, imports, package declarations
    if (
      !trimmed ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("import ") ||
      trimmed.startsWith("package ")
    ) {
      instrumented.push(line);
      continue;
    }

    // Method declaration
    const methodInfo = isMethodDeclaration(trimmed);
    if (methodInfo) {
      const methodName = methodInfo.methodName;
      instrumented.push(line);

      const trace = createTraceCall({
        type: "function_enter",
        name: methodName,
        data_structure: dataStructure,
        id: traceId++,
        line: i + 1,
      });

      if (trimmed.includes("{")) {
        instrumented.push(`${spaces}    ${trace}`);
      } else {
        // Opening brace on next line
        i++;
        if (i < lines.length && lines[i].trim() === "{") {
          instrumented.push(lines[i]);
          instrumented.push(`${spaces}    ${trace}`);
        }
      }
      continue;
    }

    // For loop
    if (trimmed.startsWith("for")) {
      const loopId = traceId++;
      const varMatch = trimmed.match(
        /for\s*\(\s*(?:int|long|float|double|char)?\s*(\w+)/
      );
      const loopVar = varMatch ? varMatch[1] : null;

      const loopStart = createTraceCall({
        type: "loop_start",
        loop_type: "for",
        id: loopId,
        line: i + 1,
      });

      instrumented.push(`${spaces}${loopStart}`);

      // Instrument array access in for loop header
      const instrumentedLine = instrumentArrayAccess(line, functionParams);
      instrumented.push(instrumentedLine);

      const iterTrace = createTraceCall({
        type: "loop_iteration",
        loop_type: "for",
        id: loopId,
        line: i + 1,
      });

      if (trimmed.includes("{")) {
        instrumented.push(`${spaces}    ${iterTrace}`);
        if (loopVar) {
          instrumented.push(createVarTracker(loopVar, indent + 4));
        }
      } else {
        // Opening brace on next line
        i++;
        if (i < lines.length && lines[i].trim() === "{") {
          instrumented.push(lines[i]);
          instrumented.push(`${spaces}    ${iterTrace}`);
          if (loopVar) {
            instrumented.push(createVarTracker(loopVar, indent + 4));
          }
        }
      }
      continue;
    }

    // Enhanced while loop
    if (trimmed.startsWith("while")) {
      const loopId = traceId++;

      // Instrument array access in while condition
      const instrumentedLine = instrumentArrayAccess(line, functionParams);
      instrumented.push(instrumentedLine);

      const iterTrace = createTraceCall({
        type: "loop_iteration",
        loop_type: "while",
        id: loopId,
        line: i + 1,
      });

      if (trimmed.includes("{")) {
        instrumented.push(`${spaces}    ${iterTrace}`);
      } else {
        i++;
        if (i < lines.length && lines[i].trim() === "{") {
          instrumented.push(lines[i]);
          instrumented.push(`${spaces}    ${iterTrace}`);
        }
      }
      continue;
    }

    // If statement
    if (trimmed.startsWith("if")) {
      const condTrace = createTraceCall({
        type: "condition_check",
        id: traceId++,
        line: i + 1,
      });

      instrumented.push(`${spaces}${condTrace}`);

      // Instrument array access in condition
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

      instrumented.push(`${spaces}${returnTrace}`);

      // Instrument array access in return
      const instrumentedLine = instrumentArrayAccess(line, functionParams);
      instrumented.push(instrumentedLine);
      continue;
    }

    // Variable declaration
    const varMatch = trimmed.match(
      /^(int|long|double|float|char|boolean|String|byte|short)\s+(\w+)\s*=/
    );
    if (varMatch) {
      const varName = varMatch[2];
      const varTrace = createTraceCall({
        type: "var_declaration",
        name: varName,
        id: traceId++,
        line: i + 1,
      });

      instrumented.push(`${spaces}${varTrace}`);

      // Instrument array access in declaration
      const instrumentedLine = instrumentArrayAccess(line, functionParams);
      instrumented.push(instrumentedLine);
      continue;
    }

    // Default: check for array access in any line
    const instrumentedLine = instrumentArrayAccess(line, functionParams);
    if (instrumentedLine !== line) {
      // Line was instrumented
      instrumented.push(instrumentedLine);
    } else {
      // No instrumentation needed
      instrumented.push(line);
    }
  }

  return instrumented.join("\n");
}

module.exports = { instrumentJavaCode };
