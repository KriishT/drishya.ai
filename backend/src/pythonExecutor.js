/**
 * Python Code Executor - COMPLETE FIX with array access tracking
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function executePythonCode(
  instrumentedCode,
  testCase,
  dataStructure = "array"
) {
  const testCaseArgs = parseTestCase(testCase);
  const functionName = extractFunctionName(instrumentedCode);

  if (!functionName) {
    return {
      trace: [],
      error: "Could not find function definition in code",
      success: false,
    };
  }

  const pythonModule = buildPythonModule(
    instrumentedCode,
    functionName,
    testCaseArgs,
    dataStructure
  );

  const tempDir = os.tmpdir();
  const tempFile = path.join(
    tempDir,
    `leetcode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`
  );

  try {
    fs.writeFileSync(tempFile, pythonModule, "utf8");
    const result = await executePythonFile(tempFile);

    try {
      fs.unlinkSync(tempFile);
    } catch (cleanupError) {
      console.warn("Failed to clean up temp file:", cleanupError.message);
    }

    return result;
  } catch (error) {
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (cleanupError) {}

    return {
      trace: [],
      error: `Execution error: ${error.message}`,
      success: false,
    };
  }
}

function buildPythonModule(
  instrumentedCode,
  functionName,
  testCaseArgs,
  dataStructure
) {
  const pythonArgs = testCaseArgs
    .map((arg) => convertToPythonLiteral(arg))
    .join(", ");

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
from typing import Optional, List, Any

# ===== TRACE COLLECTION =====
_trace_list = []
_variable_state = {}

def _serialize_value(value, max_depth=100, visited=None):
    """Serialize any value - for variables, show simplified node structure"""
    if max_depth <= 0:
        return None
    
    if visited is None:
        visited = set()
    
    if value is None:
        return None
    
    if isinstance(value, (int, float, str, bool)):
        return value
    
    if isinstance(value, (list, tuple)):
        return [_serialize_value(item, max_depth - 1, visited) for item in value]
    
    if isinstance(value, dict):
        return {str(k): _serialize_value(v, max_depth - 1, visited) for k, v in value.items()}
    
    # Objects with 'val' attribute
    if hasattr(value, 'val'):
        obj_id = id(value)
        if obj_id in visited:
            return None
        visited.add(obj_id)
        
        result = {'val': value.val}
        
        if hasattr(value, 'left'):
            result['left'] = value.left.val if (value.left and hasattr(value.left, 'val')) else None
        
        if hasattr(value, 'right'):
            result['right'] = value.right.val if (value.right and hasattr(value.right, 'val')) else None
        
        if hasattr(value, 'next'):
            result['next'] = value.next.val if (value.next and hasattr(value.next, 'val')) else None
        
        return result
    
    try:
        return str(value)
    except:
        return None

def _serialize_tree_full(node, max_depth=100, visited=None):
    """Serialize full tree structure for tree visualization"""
    if node is None or max_depth <= 0:
        return None
    
    if visited is None:
        visited = set()
    
    obj_id = id(node)
    if obj_id in visited:
        return None
    visited.add(obj_id)
    
    result = {}
    
    if hasattr(node, 'val'):
        result['val'] = node.val
    
    if hasattr(node, 'left'):
        result['left'] = _serialize_tree_full(node.left, max_depth - 1, visited)
    
    if hasattr(node, 'right'):
        result['right'] = _serialize_tree_full(node.right, max_depth - 1, visited)
    
    if hasattr(node, 'next'):
        result['next'] = _serialize_tree_full(node.next, max_depth - 1, visited)
    
    return result

def _trace(metadata):
    """Collect trace events with serialized variables"""
    serialized_vars = {}
    for key, value in _variable_state.items():
        serialized_vars[key] = _serialize_value(value)
    
    metadata['variables'] = serialized_vars
    _trace_list.append(metadata)
    return None

def _set_var(name, value):
    """Track variable changes"""
    _variable_state[name] = value
    return value

def _trace_array_access(arr_name, index, value):
    """Track array access with actual value - matches JavaScript format"""
    _trace({
        'type': 'array_access',
        'array': arr_name,
        'index': index,
        'value': value,
        'code': {'index': index, 'array': arr_name}  # Match JS format
    })
    return None

# ===== DATA STRUCTURE CONVERTERS =====
def _parse_tree_input(arr):
    """Convert array to tree structure"""
    if not arr or len(arr) == 0 or arr[0] is None:
        return None
    
    TreeNodeClass = None
    for name, obj in list(globals().items()):
        if name == 'TreeNode' and callable(obj):
            TreeNodeClass = obj
            break
    
    if TreeNodeClass is None:
        class SimpleNode:
            def __init__(self, val):
                self.val = val
                self.left = None
                self.right = None
        TreeNodeClass = SimpleNode
    
    try:
        root = TreeNodeClass(arr[0])
        queue = [root]
        i = 1
        
        while queue and i < len(arr):
            node = queue.pop(0)
            
            if i < len(arr):
                if arr[i] is not None:
                    node.left = TreeNodeClass(arr[i])
                    queue.append(node.left)
                i += 1
            
            if i < len(arr):
                if arr[i] is not None:
                    node.right = TreeNodeClass(arr[i])
                    queue.append(node.right)
                i += 1
        
        return root
    except Exception as e:
        print(f"Error creating tree: {e}", file=sys.stderr)
        return None

def _parse_linkedlist_input(arr):
    """Convert array to linked list"""
    if not arr or len(arr) == 0:
        return None
    
    ListNodeClass = None
    for name, obj in list(globals().items()):
        if name == 'ListNode' and callable(obj):
            ListNodeClass = obj
            break
    
    if ListNodeClass is None:
        class SimpleNode:
            def __init__(self, val):
                self.val = val
                self.next = None
        ListNodeClass = SimpleNode
    
    try:
        head = ListNodeClass(arr[0])
        current = head
        
        for i in range(1, len(arr)):
            current.next = ListNodeClass(arr[i])
            current = current.next
        
        return head
    except Exception as e:
        print(f"Error creating linked list: {e}", file=sys.stderr)
        return None

# ===== USER CODE =====
${instrumentedCode}

# ===== EXECUTION =====
if __name__ == "__main__":
    try:
        raw_args = [${pythonArgs}]
        
        if '${dataStructure}' == 'tree' and len(raw_args) > 0:
            converted_args = [_parse_tree_input(raw_args[0])] + raw_args[1:]
        elif '${dataStructure}' == 'linkedlist' and len(raw_args) > 0:
            converted_args = [_parse_linkedlist_input(raw_args[0])] + raw_args[1:]
        else:
            converted_args = raw_args
        
        _trace({
            'type': 'input_params',
            'args': [_serialize_tree_full(arg) if hasattr(arg, 'val') else arg for arg in converted_args],
            'dataStructure': '${dataStructure}',
            'id': -1
        })
        
        result = ${functionName}(*converted_args)
        
        _trace({
            'type': 'final_result',
            'result': _serialize_tree_full(result) if hasattr(result, 'val') else result,
            'id': 999999
        })
        
        output = {
            'trace': _trace_list,
            'result': _serialize_tree_full(result) if hasattr(result, 'val') else result,
            'success': True
        }
        print(json.dumps(output))
        
    except Exception as e:
        import traceback
        output = {
            'trace': _trace_list,
            'error': str(e),
            'errorType': type(e).__name__,
            'stackTrace': traceback.format_exc(),
            'success': False
        }
        print(json.dumps(output))
        sys.exit(1)
`;
}

function executePythonFile(filepath) {
  return new Promise((resolve) => {
    const python = spawn("python", [filepath], {
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024,
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", (code) => {
      if (code === 0 && stdout) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          resolve({
            trace: [],
            error: `Failed to parse output: ${parseError.message}`,
            rawOutput: stdout,
            success: false,
          });
        }
      } else {
        resolve({
          trace: [],
          error: stderr || `Process exited with code ${code}`,
          success: false,
        });
      }
    });

    python.on("error", (error) => {
      if (error.code === "ENOENT") {
        resolve({
          trace: [],
          error: "Python3 not found. Please install Python 3.",
          success: false,
        });
      } else {
        resolve({
          trace: [],
          error: `Execution error: ${error.message}`,
          success: false,
        });
      }
    });

    setTimeout(() => {
      python.kill("SIGTERM");
      setTimeout(() => {
        python.kill("SIGKILL");
      }, 1000);
    }, 5000);
  });
}

function parseTestCase(testCase) {
  try {
    const normalized = `[${testCase}]`;
    const parsed = JSON.parse(normalized);
    return parsed;
  } catch (error) {
    return testCase.split(",").map((arg) => {
      try {
        return JSON.parse(arg.trim());
      } catch {
        return arg.trim();
      }
    });
  }
}

function convertToPythonLiteral(value) {
  if (value === null || value === undefined) {
    return "None";
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => convertToPythonLiteral(v)).join(", ") + "]";
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([k, v]) => `${JSON.stringify(k)}: ${convertToPythonLiteral(v)}`)
      .join(", ");
    return "{" + entries + "}";
  }
  return "None";
}

function extractFunctionName(code) {
  const match = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
  if (match) {
    const name = match[1];
    if (name.startsWith("__") && name.endsWith("__")) {
      const matches = code.matchAll(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g);
      for (const m of matches) {
        if (!m[1].startsWith("__") || !m[1].endsWith("__")) {
          return m[1];
        }
      }
    }
    return name;
  }
  return null;
}

module.exports = { executePythonCode };
