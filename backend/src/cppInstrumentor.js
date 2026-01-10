/**
 * Instruments C++ code to track execution steps
 * Includes array access tracking for visualization
 */
function instrumentCppCode(code, dataStructure = "array") {
  let traceId = 0;
  const lines = code.split("\n");
  const instrumented = [];
  const functionParams = new Set();

  const createTraceCall = (metadata) => {
    const entries = Object.entries(metadata)
      .map(([key, value]) => {
        let valueStr;
        if (value === null || value === undefined) {
          valueStr = "nullptr";
        } else if (typeof value === "string") {
          // Escape quotes and backslashes
          const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          valueStr = `"${escaped}"`;
        } else if (typeof value === "boolean") {
          valueStr = value ? "true" : "false";
        } else {
          valueStr = value.toString();
        }
        return `{"${key}", ${valueStr}}`;
      })
      .join(", ");

    return `__trace({${entries}});`;
  };

  const createVarTracker = (varName, indent) => {
    return `${" ".repeat(indent)}__set_var("${varName}", ${varName});`;
  };

  const getIndent = (line) => {
    return (line.match(/^\s*/) || [""])[0].length;
  };

  const instrumentArrayAccess = (line, currentParams) => {
    let result = line;

    // Pattern 1: array[index]
    const bracketPattern = /(\w+)\[([^\]]+)\]/g;
    const bracketMatches = [];
    let match;

    while ((match = bracketPattern.exec(line)) !== null) {
      bracketMatches.push({
        full: match[0],
        arrayName: match[1],
        index: match[2],
        start: match.index,
        type: "bracket",
      });
    }

    // Pattern 2: vector.at(index)
    const atPattern = /(\w+)\.at\(([^)]+)\)/g;
    const atMatches = [];

    while ((match = atPattern.exec(line)) !== null) {
      atMatches.push({
        full: match[0],
        arrayName: match[1],
        index: match[2],
        start: match.index,
        type: "at",
      });
    }

    // Combine and sort by position (right to left for replacement)
    const allMatches = [...bracketMatches, ...atMatches].sort(
      (a, b) => b.start - a.start
    );

    // Replace from right to left to preserve positions
    for (const m of allMatches) {
      // Only instrument if it's a function parameter
      if (currentParams.has(m.arrayName)) {
        const replacement = `Tracer::traceAccess("${m.arrayName}", ${m.index}, ${m.full})`;
        result =
          result.slice(0, m.start) +
          replacement +
          result.slice(m.start + m.full.length);
      }
    }

    return result;
  };

  const isFunctionDeclaration = (trimmed) => {
    // Match: ReturnType FunctionName(params)
    // Handle templates: vector<int>, map<string, int>
    const funcPattern = /^([\w:<>,\s\*&]+)\s+(\w+)\s*\(([^)]*)\)\s*\{?$/;

    if (!funcPattern.test(trimmed)) return null;

    // Exclude control structures
    if (
      trimmed.startsWith("if") ||
      trimmed.startsWith("for") ||
      trimmed.startsWith("while") ||
      trimmed.startsWith("switch") ||
      trimmed.startsWith("class") ||
      trimmed.startsWith("struct")
    ) {
      return null;
    }

    // Exclude lines with assignment
    if (trimmed.includes("=") && !trimmed.includes("==")) return null;

    // Exclude constructor calls (has = or () after function name in same line)
    if (trimmed.match(/\w+\s+\w+\s*\([^)]*\)\s*;/)) return null;

    const match = trimmed.match(funcPattern);
    if (match) {
      const returnType = match[1].trim();
      const funcName = match[2];
      const paramsStr = match[3];

      // Validate return type (shouldn't contain parentheses)
      if (returnType.includes("(")) return null;

      // Validate function name (shouldn't be a keyword)
      const keywords = ["if", "for", "while", "switch", "return"];
      if (keywords.includes(funcName)) return null;

      return {
        functionName: funcName,
        returnType: returnType,
        paramsStr: paramsStr,
      };
    }

    return null;
  };

  // First pass: identify function parameters
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const funcInfo = isFunctionDeclaration(trimmed);
    if (funcInfo) {
      const params = funcInfo.paramsStr;

      if (params.trim()) {
        // Parse: "vector<int>& nums, int target" or "int arr[], int n"
        const paramList = params.split(",");

        paramList.forEach((param) => {
          // Remove references, pointers, and const
          let cleaned = param
            .replace(/\bconst\b/g, "")
            .replace(/[&\*]/g, "")
            .trim();

          // Handle array notation: int arr[] -> int arr
          cleaned = cleaned.replace(/\[\s*\]/g, "");

          const parts = cleaned.split(/\s+/);
          if (parts.length >= 2) {
            // Last part is parameter name
            const paramName = parts[parts.length - 1];
            if (
              paramName &&
              !paramName.includes("<") &&
              !paramName.includes(">")
            ) {
              functionParams.add(paramName);
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

    // Skip empty lines, comments, preprocessor directives
    if (
      !trimmed ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("using ") ||
      trimmed.startsWith("namespace ")
    ) {
      instrumented.push(line);
      continue;
    }

    // Function declaration
    const funcInfo = isFunctionDeclaration(trimmed);
    if (funcInfo) {
      const funcName = funcInfo.functionName;
      instrumented.push(line);

      const trace = createTraceCall({
        type: "function_enter",
        name: funcName,
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
        /for\s*\(\s*(?:int|long|double|float|char|size_t|auto)?\s*(\w+)/
      );
      const loopVar = varMatch ? varMatch[1] : null;

      const loopStart = createTraceCall({
        type: "loop_start",
        loop_type: "for",
        id: loopId,
        line: i + 1,
      });

      instrumented.push(`${spaces}${loopStart}`);

      // Instrument array access in for loop
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

    // While loop
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
      /^(int|long|double|float|char|bool|string|vector|auto)\s+(\w+)\s*=/
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

module.exports = { instrumentCppCode };
