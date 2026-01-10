const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Executes instrumented C++ code in a sandboxed environment
 * @param {string} instrumentedCode - The instrumented C++ code
 * @param {string} testCaseStr - Test case input as string
 * @param {string} dataStructure - The detected data structure type
 * @returns {Promise<object>} - Execution result with trace and output
 */
async function executeCPPCode(
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
    /(\w+(?:\s*\*)?)\s+(\w+)\s*\([^)]*\)/
  );

  if (!classMatch || !methodMatch) {
    return {
      trace: [],
      error: "Could not find class or method declaration in C++ code",
      success: false,
    };
  }

  const className = classMatch[1];
  const returnType = methodMatch[1].trim();
  const methodName = methodMatch[2];

  // Build complete C++ program
  const cppProgram = buildCppProgram(
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
    `leetcode_cpp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  try {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    const cppFile = path.join(tempDir, "leetcode.cpp");
    const exeFile = path.join(tempDir, "leetcode_exe");

    // Write C++ code to file
    fs.writeFileSync(cppFile, cppProgram, "utf8");

    // Compile C++ code
    const compilationResult = await compileCppFile(cppFile, exeFile);

    if (!compilationResult.success) {
      return {
        trace: [],
        error: `Compilation error: ${compilationResult.error}`,
        success: false,
      };
    }

    // Execute compiled program
    const executionResult = await executeCppProgram(exeFile);

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
 * Build complete C++ program with trace collection
 */
function buildCppProgram(
  instrumentedCode,
  className,
  methodName,
  returnType,
  testCaseArgs,
  dataStructure
) {
  // Generate test case initialization code
  const testCaseInit = generateCppTestCaseInit(testCaseArgs, dataStructure);
  const testCaseCall = generateCppTestCaseCall(testCaseArgs.length);
  const resultConversion = generateCppResultConversion(returnType);

  return `#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <queue>
#include <sstream>
#include <algorithm>

using namespace std;

// ===== JSON LIBRARY (Inline simplified version) =====
class JSON {
public:
    enum Type { OBJECT, ARRAY, STRING, NUMBER, BOOLEAN, NULL_TYPE };
    
    Type type;
    map<string, JSON*> objectValue;
    vector<JSON*> arrayValue;
    string stringValue;
    double numberValue;
    bool boolValue;
    
    JSON(Type t) : type(t), numberValue(0), boolValue(false) {}
    
    static JSON* object() { return new JSON(OBJECT); }
    static JSON* array() { return new JSON(ARRAY); }
    static JSON* string(const std::string& s) {
        JSON* j = new JSON(STRING);
        j->stringValue = s;
        return j;
    }
    static JSON* number(double n) {
        JSON* j = new JSON(NUMBER);
        j->numberValue = n;
        return j;
    }
    static JSON* boolean(bool b) {
        JSON* j = new JSON(BOOLEAN);
        j->boolValue = b;
        return j;
    }
    static JSON* null() { return new JSON(NULL_TYPE); }
    
    void set(const string& key, JSON* value) {
        objectValue[key] = value;
    }
    
    void push(JSON* value) {
        arrayValue.push_back(value);
    }
    
    string toString() const {
        stringstream ss;
        switch (type) {
            case OBJECT: {
                ss << "{";
                bool first = true;
                for (auto& p : objectValue) {
                    if (!first) ss << ",";
                    ss << "\\"" << p.first << "\\":" << p.second->toString();
                    first = false;
                }
                ss << "}";
                return ss.str();
            }
            case ARRAY: {
                ss << "[";
                for (size_t i = 0; i < arrayValue.size(); i++) {
                    if (i > 0) ss << ",";
                    ss << arrayValue[i]->toString();
                }
                ss << "]";
                return ss.str();
            }
            case STRING:
                return "\\"" + stringValue + "\\"";
            case NUMBER:
                ss << numberValue;
                return ss.str();
            case BOOLEAN:
                return boolValue ? "true" : "false";
            case NULL_TYPE:
                return "null";
        }
        return "null";
    }
};

// ===== TRACE COLLECTION SYSTEM =====
class Tracer {
public:
    static vector<JSON*> trace;
    static map<string, double> variableState;
    
    static void addTrace(JSON* metadata) {
        // Add variables to metadata
        JSON* vars = JSON::object();
        for (auto& p : variableState) {
            vars->set(p.first, JSON::number(p.second));
        }
        metadata->set("variables", vars);
        trace.push_back(metadata);
    }
    
    static void setVar(const string& name, int value) {
        variableState[name] = value;
    }
    
    template<typename T>
    static T traceAccess(const string& arrayName, int index, T value) {
        JSON* event = JSON::object();
        event->set("type", JSON::string("array_access"));
        event->set("array", JSON::string(arrayName));
        event->set("index", JSON::number(index));
        event->set("value", JSON::number(value));
        addTrace(event);
        return value;
    }
};

vector<JSON*> Tracer::trace;
map<string, double> Tracer::variableState;

// ===== TREE/LINKEDLIST STRUCTURES =====
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

// ===== DATA STRUCTURE CONVERTERS =====
TreeNode* arrayToTree(const vector<int>& arr) {
    if (arr.empty()) return nullptr;
    
    TreeNode* root = new TreeNode(arr[0]);
    queue<TreeNode*> q;
    q.push(root);
    
    int i = 1;
    while (!q.empty() && i < arr.size()) {
        TreeNode* node = q.front();
        q.pop();
        
        if (i < arr.size() && arr[i] != -1) {
            node->left = new TreeNode(arr[i]);
            q.push(node->left);
        }
        i++;
        
        if (i < arr.size() && arr[i] != -1) {
            node->right = new TreeNode(arr[i]);
            q.push(node->right);
        }
        i++;
    }
    
    return root;
}

ListNode* arrayToLinkedList(const vector<int>& arr) {
    if (arr.empty()) return nullptr;
    
    ListNode* head = new ListNode(arr[0]);
    ListNode* current = head;
    
    for (size_t i = 1; i < arr.size(); i++) {
        current->next = new ListNode(arr[i]);
        current = current->next;
    }
    
    return head;
}

JSON* serializeVector(const vector<int>& vec) {
    JSON* arr = JSON::array();
    for (int val : vec) {
        arr->push(JSON::number(val));
    }
    return arr;
}

JSON* serializeTree(TreeNode* root) {
    if (!root) return JSON::null();
    
    JSON* obj = JSON::object();
    obj->set("val", JSON::number(root->val));
    if (root->left) obj->set("left", serializeTree(root->left));
    if (root->right) obj->set("right", serializeTree(root->right));
    return obj;
}

JSON* serializeLinkedList(ListNode* head) {
    JSON* arr = JSON::array();
    ListNode* current = head;
    while (current) {
        arr->push(JSON::number(current->val));
        current = current->next;
    }
    return arr;
}

// ===== USER'S INSTRUMENTED CODE =====
${instrumentedCode}

// ===== MAIN EXECUTION =====
int main() {
    try {
        // Add input trace
        JSON* inputEvent = JSON::object();
        inputEvent->set("type", JSON::string("input_params"));
        inputEvent->set("dataStructure", JSON::string("${dataStructure}"));
        inputEvent->set("id", JSON::number(-1));
        Tracer::addTrace(inputEvent);
        
        // Initialize test case
        ${testCaseInit}
        
        // Create solution instance and execute
        ${className} solution;
        auto result = solution.${methodName}(${testCaseCall});
        
        // Add result trace
        JSON* resultEvent = JSON::object();
        resultEvent->set("type", JSON::string("final_result"));
        resultEvent->set("result", ${resultConversion});
        resultEvent->set("id", JSON::number(999999));
        Tracer::addTrace(resultEvent);
        
        // Build output
        JSON* output = JSON::object();
        
        JSON* traceArray = JSON::array();
        for (auto event : Tracer::trace) {
            traceArray->push(event);
        }
        output->set("trace", traceArray);
        output->set("result", ${resultConversion});
        output->set("success", JSON::boolean(true));
        
        cout << output->toString() << endl;
        
        return 0;
        
    } catch (const exception& e) {
        // Build error output
        JSON* output = JSON::object();
        
        JSON* traceArray = JSON::array();
        for (auto event : Tracer::trace) {
            traceArray->push(event);
        }
        output->set("trace", traceArray);
        output->set("error", JSON::string(e.what()));
        output->set("success", JSON::boolean(false));
        
        cout << output->toString() << endl;
        
        return 1;
    }
}
`;
}

/**
 * Generate C++ test case initialization
 */
function generateCppTestCaseInit(testCaseArgs, dataStructure) {
  const lines = [];

  testCaseArgs.forEach((arg, index) => {
    const varName = `arg${index}`;

    if (index === 0 && dataStructure === "tree" && Array.isArray(arg)) {
      lines.push(`vector<int> ${varName}_vec = ${convertToCppVector(arg)};`);
      lines.push(`TreeNode* ${varName} = arrayToTree(${varName}_vec);`);
    } else if (
      index === 0 &&
      dataStructure === "linkedlist" &&
      Array.isArray(arg)
    ) {
      lines.push(`vector<int> ${varName}_vec = ${convertToCppVector(arg)};`);
      lines.push(`ListNode* ${varName} = arrayToLinkedList(${varName}_vec);`);
    } else if (Array.isArray(arg)) {
      lines.push(`vector<int> ${varName} = ${convertToCppVector(arg)};`);
    } else if (typeof arg === "number") {
      lines.push(`int ${varName} = ${arg};`);
    } else if (typeof arg === "string") {
      lines.push(`string ${varName} = "${arg}";`);
    }
  });

  return lines.join("\n        ");
}

/**
 * Generate C++ test case method call
 */
function generateCppTestCaseCall(argCount) {
  const args = [];
  for (let i = 0; i < argCount; i++) {
    args.push(`arg${i}`);
  }
  return args.join(", ");
}

/**
 * Generate C++ result conversion
 */
function generateCppResultConversion(returnType) {
  if (returnType.includes("TreeNode")) {
    return "serializeTree(result)";
  }
  if (returnType.includes("ListNode")) {
    return "serializeLinkedList(result)";
  }
  if (returnType.includes("vector")) {
    return "serializeVector(result)";
  }
  if (returnType.includes("int")) {
    return "JSON::number(result)";
  }
  if (returnType.includes("bool")) {
    return "JSON::boolean(result)";
  }
  if (returnType.includes("string")) {
    return "JSON::string(result)";
  }
  return "JSON::null()";
}

/**
 * Convert JavaScript array to C++ vector literal
 */
function convertToCppVector(arr) {
  const elements = arr.map((v) => (v === null ? "-1" : String(v))).join(", ");
  return `{${elements}}`;
}

/**
 * Compile C++ file
 */
function compileCppFile(cppFile, exeFile) {
  return new Promise((resolve) => {
    const gpp = spawn("g++", ["-std=c++17", "-O2", "-o", exeFile, cppFile], {
      timeout: 15000, // 15 second compile timeout
    });

    let stderr = "";

    gpp.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    gpp.on("close", (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          error: stderr || "Compilation failed with unknown error",
        });
      } else {
        resolve({ success: true });
      }
    });

    gpp.on("error", (err) => {
      if (err.code === "ENOENT") {
        resolve({
          success: false,
          error: "C++ compiler (g++) not found. Please install g++.",
        });
      } else {
        resolve({
          success: false,
          error: `Failed to run C++ compiler: ${err.message}`,
        });
      }
    });
  });
}

/**
 * Execute compiled C++ program
 */
function executeCppProgram(exeFile) {
  return new Promise((resolve) => {
    const exe = spawn(exeFile, [], {
      timeout: 5000, // 5 second execution timeout
      killSignal: "SIGTERM",
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    exe.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    exe.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      exe.kill("SIGTERM");

      setTimeout(() => {
        if (!exe.killed) {
          exe.kill("SIGKILL");
        }
      }, 1000);
    }, 5000);

    exe.on("close", (code) => {
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
            error: stderr || "No output from C++ execution",
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

    exe.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        trace: [],
        error: `Failed to run C++ program: ${err.message}`,
        success: false,
      });
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

module.exports = { executeCPPCode };
