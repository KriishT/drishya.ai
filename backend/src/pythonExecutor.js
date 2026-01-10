/**
 * Python Code Executor - Fixed to handle all data structures without conflicts
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Execute Python code with trace collection
 */
async function executePythonCode(
  instrumentedCode,
  testCase,
  dataStructure = "array"
) {
  // Parse test case
  const testCaseArgs = parseTestCase(testCase);

  // Extract function name from instrumented code
  const functionName = extractFunctionName(instrumentedCode);

  if (!functionName) {
    return {
      trace: [],
      error: "Could not find function definition in code",
      success: false,
    };
  }

  // Build complete Python module
  const pythonModule = buildPythonModule(
    instrumentedCode,
    functionName,
    testCaseArgs,
    dataStructure
  );

  // Create temporary file
  const tempDir = os.tmpdir();
  const tempFile = path.join(
    tempDir,
    `leetcode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`
  );

  try {
    // Write Python code to file
    fs.writeFileSync(tempFile, pythonModule, "utf8");

    // Execute Python file
    const result = await executePythonFile(tempFile);

    // Clean up
    try {
      fs.unlinkSync(tempFile);
    } catch (cleanupError) {
      console.warn("Failed to clean up temp file:", cleanupError.message);
    }

    return result;
  } catch (error) {
    // Clean up on error
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return {
      trace: [],
      error: `Execution error: ${error.message}`,
      success: false,
    };
  }
}

/**
 * Build complete Python module with trace collection and execution
 */
function buildPythonModule(
  instrumentedCode,
  functionName,
  testCaseArgs,
  dataStructure
) {
  // Convert test case args to Python literals
  const pythonArgs = testCaseArgs
    .map((arg) => convertToPythonLiteral(arg))
    .join(", ");

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
from typing import Optional, List, Any

# ===== TRACE COLLECTION SYSTEM =====
_trace_list = []
_variable_state = {}

def _trace(metadata):
    """Collect trace events with deep copy of variables"""
    import copy
    metadata['variables'] = copy.deepcopy(_variable_state)
    _trace_list.append(metadata)
    return None

def _set_var(name, value):
    """Track variable changes with deep copy to prevent reference issues"""
    import copy
    if isinstance(value, (list, dict)):
        _variable_state[name] = copy.deepcopy(value)
    else:
        _variable_state[name] = value
    return value

def _trace_access(arr_name, index, value):
    """Track array access with logging"""
    _trace({
        'type': 'array_access',
        'array': arr_name,
        'index': index,
        'value': value
    })
    return value

# ===== SERIALIZATION HELPERS =====
def _serialize_node(node, max_depth=100):
    """Recursively serialize any node-like object"""
    if node is None or max_depth <= 0:
        return None
    
    result = {}
    
    # Get all attributes that don't start with underscore
    for attr in dir(node):
        if not attr.startswith('_') and not callable(getattr(node, attr)):
            try:
                value = getattr(node, attr)
                
                # Handle nested nodes
                if hasattr(value, '__dict__') or hasattr(value, 'val'):
                    result[attr] = _serialize_node(value, max_depth - 1)
                elif isinstance(value, (list, tuple)):
                    result[attr] = [_serialize_node(item, max_depth - 1) if hasattr(item, '__dict__') else item for item in value]
                elif isinstance(value, dict):
                    result[attr] = {k: _serialize_node(v, max_depth - 1) if hasattr(v, '__dict__') else v for k, v in value.items()}
                else:
                    result[attr] = value
            except:
                pass
    
    return result if result else None

def _serialize_result(result, max_depth=100):
    """Serialize any result to JSON-compatible format"""
    if result is None:
        return None
    
    # Primitive types
    if isinstance(result, (int, float, str, bool)):
        return result
    
    # Lists
    if isinstance(result, (list, tuple)):
        return [_serialize_result(item, max_depth - 1) for item in result]
    
    # Dictionaries
    if isinstance(result, dict):
        return {str(k): _serialize_result(v, max_depth - 1) for k, v in result.items()}
    
    # Objects with attributes (TreeNode, ListNode, etc.)
    if hasattr(result, '__dict__') or hasattr(result, 'val'):
        return _serialize_node(result, max_depth)
    
    # Fallback: try to convert to string
    try:
        return str(result)
    except:
        return None

# ===== DATA STRUCTURE CONVERTERS =====
def _parse_tree_input(arr):
    """
    Convert array to tree structure using user's TreeNode class if available,
    otherwise create a simple dict-based structure
    """
    if not arr or len(arr) == 0 or arr[0] is None:
        return None
    
    # Try to find user's TreeNode class in globals
    TreeNodeClass = None
    for name, obj in list(globals().items()):
        if name == 'TreeNode' and callable(obj):
            TreeNodeClass = obj
            break
    
    # If no TreeNode class found, create nodes as dicts
    if TreeNodeClass is None:
        class SimpleNode:
            def __init__(self, val):
                self.val = val
                self.left = None
                self.right = None
        TreeNodeClass = SimpleNode
    
    # Build tree
    try:
        root = TreeNodeClass(arr[0])
        queue = [root]
        i = 1
        
        while queue and i < len(arr):
            node = queue.pop(0)
            
            # Left child
            if i < len(arr):
                if arr[i] is not None:
                    node.left = TreeNodeClass(arr[i])
                    queue.append(node.left)
                i += 1
            
            # Right child
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
    """
    Convert array to linked list using user's ListNode class if available
    """
    if not arr or len(arr) == 0:
        return None
    
    # Try to find user's ListNode class
    ListNodeClass = None
    for name, obj in list(globals().items()):
        if name == 'ListNode' and callable(obj):
            ListNodeClass = obj
            break
    
    # If no ListNode class found, create simple nodes
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

def _parse_graph_input(data):
    """Parse graph input (adjacency list or edge list)"""
    # Graph inputs are typically already in the right format
    return data

def _convert_input_by_type(value, param_type):
    """Convert input value based on parameter type"""
    if param_type == 'tree':
        if isinstance(value, list):
            return _parse_tree_input(value)
        return value
    elif param_type == 'linkedlist':
        if isinstance(value, list):
            return _parse_linkedlist_input(value)
        return value
    elif param_type == 'graph':
        return _parse_graph_input(value)
    else:
        # Default: return as-is
        return value

# ===== USER'S INSTRUMENTED CODE =====
${instrumentedCode}

# ===== EXECUTION & OUTPUT =====
if __name__ == "__main__":
    try:
        # Parse input arguments
        raw_args = [${pythonArgs}]
        
        # Convert arguments based on data structure type
        if '${dataStructure}' == 'tree' and len(raw_args) > 0:
            converted_args = [_parse_tree_input(raw_args[0])] + raw_args[1:]
        elif '${dataStructure}' == 'linkedlist' and len(raw_args) > 0:
            converted_args = [_parse_linkedlist_input(raw_args[0])] + raw_args[1:]
        else:
            converted_args = raw_args
        
        # Add input trace
        _trace({
            'type': 'input_params',
            'args': [_serialize_result(arg) for arg in converted_args],
            'dataStructure': '${dataStructure}',
            'id': -1
        })
        
        # Execute function
        result = ${functionName}(*converted_args)
        
        # Add result trace
        _trace({
            'type': 'final_result',
            'result': _serialize_result(result),
            'id': 999999
        })
        
        # Output trace as JSON
        output = {
            'trace': _trace_list,
            'result': _serialize_result(result),
            'success': True
        }
        print(json.dumps(output))
        
    except Exception as e:
        # Output error with partial trace
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

/**
 * Execute Python file and capture output
 */
function executePythonFile(filepath) {
  return new Promise((resolve, reject) => {
    const python = spawn("python", [filepath], {
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
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

    // Handle timeout
    setTimeout(() => {
      python.kill("SIGTERM");
      setTimeout(() => {
        python.kill("SIGKILL");
      }, 1000);
    }, 5000);
  });
}

/**
 * Parse test case string into array of arguments
 */
function parseTestCase(testCase) {
  try {
    // Remove whitespace and parse as JSON array
    const normalized = `[${testCase}]`;
    const parsed = JSON.parse(normalized);
    return parsed;
  } catch (error) {
    // Fallback: split by comma and parse each
    return testCase.split(",").map((arg) => {
      try {
        return JSON.parse(arg.trim());
      } catch {
        return arg.trim();
      }
    });
  }
}

/**
 * Convert JavaScript value to Python literal
 */
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

/**
 * Extract function name from code
 */
function extractFunctionName(code) {
  // Match: def functionName(
  const match = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
  if (match) {
    const name = match[1];
    // Exclude dunder methods
    if (name.startsWith("__") && name.endsWith("__")) {
      // Try to find another function
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
