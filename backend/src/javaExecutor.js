const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Executes instrumented Java code in a sandboxed environment
 * @param {string} instrumentedCode - The instrumented Java code
 * @param {string} testCaseStr - Test case input as string
 * @param {string} dataStructure - The detected data structure type
 * @returns {Promise<object>} - Execution result with trace and output
 */
async function executeJavaCode(
  instrumentedCode,
  testCaseStr,
  dataStructure = "array"
) {
  // Parse test case
  let testCaseArgs;
  try {
    const cleaned = testCaseStr.trim();
    testCaseArgs = parseTestCase(cleaned, dataStructure);
  } catch (error) {
    return {
      trace: [],
      error: `Failed to parse test case: ${error.message}`,
      success: false,
    };
  }

  // Extract class and method names
  const classMatch = instrumentedCode.match(/class\s+(\w+)\s*\{/);
  const methodMatch = instrumentedCode.match(
    /public\s+(\w+(?:\[\])?)\s+(\w+)\s*\(/
  );

  if (!classMatch || !methodMatch) {
    return {
      trace: [],
      error: "Could not find class or method declaration in Java code",
      success: false,
    };
  }

  const className = classMatch[1];
  const returnType = methodMatch[1];
  const methodName = methodMatch[2];

  // Build complete Java program
  const javaProgram = buildJavaProgram(
    instrumentedCode,
    className,
    methodName,
    returnType,
    testCaseArgs,
    dataStructure
  );

  // Create temporary directory and files
  const tempDir = path.join(
    os.tmpdir(),
    `leetcode_java_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  try {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    const javaFile = path.join(tempDir, "LeetCodeRunner.java");

    // Write Java code to file
    fs.writeFileSync(javaFile, javaProgram, "utf8");

    // Compile Java code
    const compilationResult = await compileJavaFile(javaFile, tempDir);

    if (!compilationResult.success) {
      return {
        trace: [],
        error: `Compilation error: ${compilationResult.error}`,
        success: false,
      };
    }

    // Execute compiled Java program
    const executionResult = await executeJavaProgram(tempDir);

    // Clean up
    cleanupDirectory(tempDir);

    return executionResult;
  } catch (error) {
    // Clean up on error
    cleanupDirectory(tempDir);

    return {
      trace: [],
      error: `Execution error: ${error.message}`,
      success: false,
    };
  }
}

/**
 * Build complete Java program with trace collection
 */
function buildJavaProgram(
  instrumentedCode,
  className,
  methodName,
  returnType,
  testCaseArgs,
  dataStructure
) {
  // Convert test case args to Java literals
  const javaArgs = generateJavaTestCaseCall(testCaseArgs, dataStructure);
  const resultConversion = generateResultConversion(returnType);

  return `import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.util.*;

// ===== TRACE COLLECTION SYSTEM =====
class Tracer {
    static List<Map<String, Object>> trace = new ArrayList<>();
    static Map<String, Object> variableState = new HashMap<>();
    
    public static void trace(Map<String, Object> metadata) {
        metadata.put("variables", new HashMap<>(variableState));
        trace.add(metadata);
    }
    
    public static void setVar(String name, Object value) {
        variableState.put(name, value);
    }
    
    public static <T> T traceAccess(String arrayName, int index, T value) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", "array_access");
        event.put("array", arrayName);
        event.put("index", index);
        event.put("value", value);
        trace(event);
        return value;
    }
}

// ===== TREE/LINKEDLIST CLASSES =====
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class ListNode {
    int val;
    ListNode next;
    
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

// ===== DATA STRUCTURE CONVERTERS =====
class DataStructures {
    static TreeNode arrayToTree(Integer[] arr) {
        if (arr == null || arr.length == 0) return null;
        
        TreeNode root = new TreeNode(arr[0]);
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        int i = 1;
        
        while (!queue.isEmpty() && i < arr.length) {
            TreeNode node = queue.poll();
            
            if (i < arr.length && arr[i] != null) {
                node.left = new TreeNode(arr[i]);
                queue.offer(node.left);
            }
            i++;
            
            if (i < arr.length && arr[i] != null) {
                node.right = new TreeNode(arr[i]);
                queue.offer(node.right);
            }
            i++;
        }
        
        return root;
    }
    
    static ListNode arrayToLinkedList(int[] arr) {
        if (arr == null || arr.length == 0) return null;
        
        ListNode head = new ListNode(arr[0]);
        ListNode current = head;
        
        for (int i = 1; i < arr.length; i++) {
            current.next = new ListNode(arr[i]);
            current = current.next;
        }
        
        return head;
    }
    
    static Object serializeResult(Object result) {
        if (result == null) return null;
        
        if (result instanceof TreeNode) {
            return treeToMap((TreeNode) result);
        } else if (result instanceof ListNode) {
            return linkedListToArray((ListNode) result);
        } else if (result instanceof int[]) {
            return result;
        } else if (result instanceof Integer[]) {
            return result;
        } else if (result.getClass().isArray()) {
            return result;
        }
        
        return result;
    }
    
    static Map<String, Object> treeToMap(TreeNode node) {
        if (node == null) return null;
        
        Map<String, Object> map = new HashMap<>();
        map.put("val", node.val);
        if (node.left != null) map.put("left", treeToMap(node.left));
        if (node.right != null) map.put("right", treeToMap(node.right));
        return map;
    }
    
    static List<Integer> linkedListToArray(ListNode head) {
        List<Integer> result = new ArrayList<>();
        ListNode current = head;
        while (current != null) {
            result.add(current.val);
            current = current.next;
        }
        return result;
    }
}

// ===== USER'S INSTRUMENTED CODE =====
${instrumentedCode}

// ===== MAIN EXECUTION =====
public class LeetCodeRunner {
    public static void main(String[] args) {
        try {
            // Add input trace
            Map<String, Object> inputEvent = new HashMap<>();
            inputEvent.put("type", "input_params");
            inputEvent.put("dataStructure", "${dataStructure}");
            inputEvent.put("id", -1);
            Tracer.trace(inputEvent);
            
            // Create solution instance and execute
            ${className} solution = new ${className}();
            ${returnType} result = solution.${methodName}(${javaArgs});
            
            // Add result trace
            Map<String, Object> resultEvent = new HashMap<>();
            resultEvent.put("type", "final_result");
            resultEvent.put("result", ${resultConversion});
            resultEvent.put("id", 999999);
            Tracer.trace(resultEvent);
            
            // Output trace as JSON
            Map<String, Object> output = new HashMap<>();
            output.put("trace", Tracer.trace);
            output.put("result", ${resultConversion});
            output.put("success", true);
            
            Gson gson = new GsonBuilder().serializeNulls().create();
            System.out.println(gson.toJson(output));
            
        } catch (Exception e) {
            // Output error with partial trace
            Map<String, Object> output = new HashMap<>();
            output.put("trace", Tracer.trace);
            output.put("error", e.getMessage());
            output.put("errorType", e.getClass().getName());
            output.put("success", false);
            
            Gson gson = new Gson();
            System.out.println(gson.toJson(output));
            System.exit(1);
        }
    }
}
`;
}

/**
 * Generate Java test case method call
 */
function generateJavaTestCaseCall(testCaseArgs, dataStructure) {
  const args = testCaseArgs.map((arg, index) => {
    if (index === 0 && dataStructure === "tree" && Array.isArray(arg)) {
      const arrStr =
        "new Integer[]{" +
        arg.map((v) => (v === null ? "null" : String(v))).join(", ") +
        "}";
      return `DataStructures.arrayToTree(${arrStr})`;
    }
    if (index === 0 && dataStructure === "linkedlist" && Array.isArray(arg)) {
      const arrStr = "new int[]{" + arg.join(", ") + "}";
      return `DataStructures.arrayToLinkedList(${arrStr})`;
    }
    return convertToJavaLiteral(arg);
  });

  return args.join(", ");
}

/**
 * Generate result serialization code
 */
function generateResultConversion(returnType) {
  if (returnType.includes("TreeNode")) {
    return "DataStructures.serializeResult(result)";
  }
  if (returnType.includes("ListNode")) {
    return "DataStructures.serializeResult(result)";
  }
  return "result";
}

/**
 * Convert JavaScript value to Java literal
 */
function convertToJavaLiteral(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }

  if (Array.isArray(value)) {
    // Determine array type
    const hasNull = value.some((v) => v === null);
    const arrayType = hasNull ? "Integer" : "int";

    const elements = value
      .map((v) => (v === null ? "null" : String(v)))
      .join(", ");
    return `new ${arrayType}[]{${elements}}`;
  }

  return "null";
}

/**
 * Compile Java file
 */
function compileJavaFile(javaFile, workingDir) {
  return new Promise((resolve) => {
    const javac = spawn("javac", [javaFile], {
      cwd: workingDir,
      timeout: 10000, // 10 second compile timeout
    });

    let stderr = "";

    javac.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    javac.on("close", (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          error: stderr || "Compilation failed with unknown error",
        });
      } else {
        resolve({ success: true });
      }
    });

    javac.on("error", (err) => {
      if (err.code === "ENOENT") {
        resolve({
          success: false,
          error: "Java compiler (javac) not found. Please install JDK.",
        });
      } else {
        resolve({
          success: false,
          error: `Failed to run Java compiler: ${err.message}`,
        });
      }
    });
  });
}

/**
 * Execute compiled Java program
 */
function executeJavaProgram(workingDir) {
  return new Promise((resolve) => {
    const java = spawn("java", ["-cp", workingDir, "LeetCodeRunner"], {
      cwd: workingDir,
      timeout: 5000, // 5 second execution timeout
      killSignal: "SIGTERM",
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    java.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    java.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      java.kill("SIGTERM");

      setTimeout(() => {
        if (!java.killed) {
          java.kill("SIGKILL");
        }
      }, 1000);
    }, 5000);

    java.on("close", (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        resolve({
          trace: [],
          error: "Execution timed out after 5 seconds",
          success: false,
        });
        return;
      }

      try {
        if (!stdout.trim()) {
          resolve({
            trace: [],
            error: stderr || "No output from Java execution",
            success: false,
          });
          return;
        }

        const output = JSON.parse(stdout);

        if (output.success) {
          resolve({
            trace: output.trace || [],
            result: output.result,
            success: true,
          });
        } else {
          resolve({
            trace: output.trace || [],
            error: output.error || "Unknown error",
            errorType: output.errorType,
            success: false,
          });
        }
      } catch (parseError) {
        resolve({
          trace: [],
          error: `Failed to parse output: ${parseError.message}\nStdout: ${stdout}\nStderr: ${stderr}`,
          success: false,
        });
      }
    });

    java.on("error", (err) => {
      clearTimeout(timeout);

      if (err.code === "ENOENT") {
        resolve({
          trace: [],
          error: "Java runtime (java) not found. Please install JRE/JDK.",
          success: false,
        });
      } else {
        resolve({
          trace: [],
          error: `Failed to run Java program: ${err.message}`,
          success: false,
        });
      }
    });
  });
}

/**
 * Parse test case string into arguments array
 */
function parseTestCase(testCaseStr, dataStructure) {
  try {
    return JSON.parse(`[${testCaseStr}]`);
  } catch (e) {
    const parts = [];
    let current = "";
    let depth = 0;
    let inString = false;

    for (let i = 0; i < testCaseStr.length; i++) {
      const char = testCaseStr[i];

      if (char === '"' && testCaseStr[i - 1] !== "\\") {
        inString = !inString;
        current += char;
      } else if (inString) {
        current += char;
      } else if (char === "[" || char === "{") {
        depth++;
        current += char;
      } else if (char === "]" || char === "}") {
        depth--;
        current += char;
      } else if (char === "," && depth === 0) {
        if (current.trim()) {
          parts.push(JSON.parse(current.trim()));
        }
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(JSON.parse(current.trim()));
    }

    return parts;
  }
}

/**
 * Clean up temporary directory
 */
function cleanupDirectory(dir) {
  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        fs.unlinkSync(path.join(dir, file));
      }
      fs.rmdirSync(dir);
    }
  } catch (error) {
    console.warn("Failed to clean up temp directory:", error.message);
  }
}

module.exports = { executeJavaCode };
