const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ArrayVisualizationStep {
  stepNumber: number;
  type: string;
  description: string;
  array?: any[];
  arrays?: any[][]; // ✅ Multi-array support
  arrayNames?: string[]; // ✅ Array names
  highlightedIndices?: number[];
  highlightedArrayIndices?: number[][]; // ✅ Per-array highlights
  highlightedVariables?: string[];
  variables?: Record<string, any>;
  result?: any;
  accessedValue?: any;
  accessedArrayIndex?: number; // ✅ Which array is being accessed
  code?: any;
}

export interface TreeVisualizationStep {
  stepNumber: number;
  type: string;
  description: string;
  variables?: Record<string, any>;
  tree?: Record<string, any>;
  highlightedNodes?: number[]; // ✅ Made optional
  visitedNodes?: number[]; // ✅ Made optional
  currentPath?: number[]; // ✅ Made optional
  traversalOrder?: number[]; // ✅ Made optional
  result?: any; // ✅ Added result
  code?: any;
}

export interface VisualizationResponse {
  success: boolean;
  dataStructureType: string;
  visualizationStrategy: string;
  steps: ArrayVisualizationStep[] | TreeVisualizationStep[];
  result: any;
  totalSteps: number;
  aiAnalysis: {
    detectedStructure: string;
    algorithmPattern: string;
    confidence: number;
    reasoning: string;
  };
  error?: string;
  trace?: any[];
}

export async function visualizeCode(
  code: string,
  testCase: string,
  language: string = "javascript"
): Promise<VisualizationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/visualize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        testCase,
        language,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function checkHealth(): Promise<{
  status: string;
  aiEnabled: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Health check failed:", error);
    throw error;
  }
}
