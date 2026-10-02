/**
 * Preset Question Templates conforming to the requested structure:
 * - Round 1: 25 Bits (MCQs with 4 options, 1 correct) + 2 Output Prediction questions
 * - Round 2: 4 Problems with pre-given jumbled / buggy code
 * - Round 3: 3 Scenarios with detailed description, constraints & test suites
 */

export function getRound1Templates() {
  const mcqBits = [
    {
      title: 'Bit #1: Bitwise XOR Invariant',
      description: 'Which bitwise operation `x ^ y` produces `0`?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'When x and y are identical (x == y)', isCorrect: true, orderNumber: 1 },
        { text: 'When x is the bitwise NOT of y (~y)', isCorrect: false, orderNumber: 2 },
        { text: 'When x is zero and y is non-zero', isCorrect: false, orderNumber: 3 },
        { text: 'When both x and y are powers of two', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #2: Binary Search Time Complexity',
      description: 'What is the worst-case time complexity of standard Binary Search on a sorted array of size N?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(log N)', isCorrect: true, orderNumber: 1 },
        { text: 'O(N)', isCorrect: false, orderNumber: 2 },
        { text: 'O(N log N)', isCorrect: false, orderNumber: 3 },
        { text: 'O(1)', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #3: Two-Pointer Traversal',
      description: 'Given a sorted array, what is the optimal time complexity to find if a pair sums to target K using two pointers?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(N) time and O(1) space', isCorrect: true, orderNumber: 1 },
        { text: 'O(N log N) time and O(N) space', isCorrect: false, orderNumber: 2 },
        { text: 'O(N^2) time and O(1) space', isCorrect: false, orderNumber: 3 },
        { text: 'O(2^N) time and O(N) space', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #4: Hash Table Collision Resolution',
      description: 'Which technique resolves hash table collisions by chaining elements in linked lists?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'Separate Chaining', isCorrect: true, orderNumber: 1 },
        { text: 'Linear Probing', isCorrect: false, orderNumber: 2 },
        { text: 'Quadratic Probing', isCorrect: false, orderNumber: 3 },
        { text: 'Double Hashing', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #5: Stack LIFO Principle',
      description: 'Which standard operation on a stack takes O(1) time?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'push, pop, and peek', isCorrect: true, orderNumber: 1 },
        { text: 'search for arbitrary element', isCorrect: false, orderNumber: 2 },
        { text: 'reversing the entire stack in-place', isCorrect: false, orderNumber: 3 },
        { text: 'sorting stack elements', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #6: Graph Representation',
      description: 'For a sparse graph with V vertices and E edges where E << V^2, which representation is most memory efficient?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'Adjacency List: O(V + E) space', isCorrect: true, orderNumber: 1 },
        { text: 'Adjacency Matrix: O(V^2) space', isCorrect: false, orderNumber: 2 },
        { text: 'Incidence Matrix: O(V * E) space', isCorrect: false, orderNumber: 3 },
        { text: 'Complete Graph Matrix', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #7: BFS Shortest Path',
      description: 'Breadth-First Search (BFS) finds the shortest path between two nodes in a graph if and only if:',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'All edge weights are unweighted / uniform', isCorrect: true, orderNumber: 1 },
        { text: 'The graph has negative weight cycles', isCorrect: false, orderNumber: 2 },
        { text: 'The graph is a complete bipartite graph', isCorrect: false, orderNumber: 3 },
        { text: 'Edges have strictly decreasing weights', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #8: Heap Insertion Complexity',
      description: 'What is the time complexity to insert a new element into a binary max-heap of size N?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(log N)', isCorrect: true, orderNumber: 1 },
        { text: 'O(1) worst case', isCorrect: false, orderNumber: 2 },
        { text: 'O(N)', isCorrect: false, orderNumber: 3 },
        { text: 'O(N log N)', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #9: Amortized Vector Expansion',
      description: 'When dynamic arrays (like C++ `std::vector` or Python `list`) double their capacity upon filling, what is the amortized cost per append?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(1) amortized', isCorrect: true, orderNumber: 1 },
        { text: 'O(log N) amortized', isCorrect: false, orderNumber: 2 },
        { text: 'O(N) amortized', isCorrect: false, orderNumber: 3 },
        { text: 'O(N^2) amortized', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #10: QuickSort Worst Case Pivot',
      description: 'When does Lomuto/Hoare QuickSort exhibit its worst-case O(N^2) performance?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'When the array is already sorted and pivot is chosen as first/last element', isCorrect: true, orderNumber: 1 },
        { text: 'When the pivot is always the exact median', isCorrect: false, orderNumber: 2 },
        { text: 'When random pivots are chosen uniformly', isCorrect: false, orderNumber: 3 },
        { text: 'When array has all distinct elements and size is a power of 2', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #11: Checking Power of Two',
      description: 'Which C/C++ bitwise expression checks if an unsigned integer `n > 0` is a power of two?',
      type: 'MCQ',
      difficulty: 'MEDIUM',
      points: 5,
      options: [
        { text: '(n & (n - 1)) == 0', isCorrect: true, orderNumber: 1 },
        { text: '(n | (n - 1)) == 0', isCorrect: false, orderNumber: 2 },
        { text: '(n ^ (n + 1)) == 0', isCorrect: false, orderNumber: 3 },
        { text: '(n >> 1) == 0', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #12: MergeSort Space Complexity',
      description: 'What is the auxiliary space complexity of standard Merge Sort on an array of size N?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(N)', isCorrect: true, orderNumber: 1 },
        { text: 'O(1)', isCorrect: false, orderNumber: 2 },
        { text: 'O(log N)', isCorrect: false, orderNumber: 3 },
        { text: 'O(N^2)', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #13: Dijkstra Non-Applicability',
      description: 'Dijkstra\'s single-source shortest path algorithm fails or produces incorrect results when:',
      type: 'MCQ',
      difficulty: 'MEDIUM',
      points: 5,
      options: [
        { text: 'The graph contains edges with negative weights', isCorrect: true, orderNumber: 1 },
        { text: 'The graph contains cycles with positive weights', isCorrect: false, orderNumber: 2 },
        { text: 'The graph is directed and acyclic (DAG)', isCorrect: false, orderNumber: 3 },
        { text: 'The graph has multiple disconnected components', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #14: Fast Exponentiation',
      description: 'Computing `(a^b) % m` via Binary Exponentiation (modular exponentiation) runs in:',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(log b)', isCorrect: true, orderNumber: 1 },
        { text: 'O(b)', isCorrect: false, orderNumber: 2 },
        { text: 'O(b log a)', isCorrect: false, orderNumber: 3 },
        { text: 'O(1)', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #15: Disjoint Set Union (DSU) with Path Compression',
      description: 'With union by rank and path compression, what is the amortized complexity per `find` or `union` operation?',
      type: 'MCQ',
      difficulty: 'MEDIUM',
      points: 5,
      options: [
        { text: 'O(α(N)) where α is the inverse Ackermann function', isCorrect: true, orderNumber: 1 },
        { text: 'O(log N)', isCorrect: false, orderNumber: 2 },
        { text: 'O(N)', isCorrect: false, orderNumber: 3 },
        { text: 'O(1) strict worst-case', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #16: Topological Sort Dependency',
      description: 'A valid Topological Ordering of vertices is guaranteed to exist if and only if the graph is a:',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'Directed Acyclic Graph (DAG)', isCorrect: true, orderNumber: 1 },
        { text: 'Undirected Tree', isCorrect: false, orderNumber: 2 },
        { text: 'Complete Bipartite Graph', isCorrect: false, orderNumber: 3 },
        { text: 'Strongly Connected Tournament', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #17: Sliding Window Maximum',
      description: 'Which data structure allows computing the maximum in every sliding window of size K in O(N) overall time?',
      type: 'MCQ',
      difficulty: 'MEDIUM',
      points: 5,
      options: [
        { text: 'Monotonic Deque (double-ended queue)', isCorrect: true, orderNumber: 1 },
        { text: 'Single standard FIFO queue', isCorrect: false, orderNumber: 2 },
        { text: 'Binary Search Tree without balancing', isCorrect: false, orderNumber: 3 },
        { text: 'Array of size K rotated sequentially', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #18: Cycle Detection in Linked List',
      description: 'Floyd\'s Cycle Detection algorithm (Tortoise and Hare) detects a cycle in a linked list using:',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(N) time and O(1) space', isCorrect: true, orderNumber: 1 },
        { text: 'O(N^2) time and O(1) space', isCorrect: false, orderNumber: 2 },
        { text: 'O(N) time and O(N) space', isCorrect: false, orderNumber: 3 },
        { text: 'O(log N) time and O(N) space', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #19: Kadane\'s Algorithm',
      description: 'Kadane\'s algorithm solves the Maximum Subarray Sum problem in:',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(N) time and O(1) space', isCorrect: true, orderNumber: 1 },
        { text: 'O(N log N) time and O(N) space', isCorrect: false, orderNumber: 2 },
        { text: 'O(N^2) time and O(1) space', isCorrect: false, orderNumber: 3 },
        { text: 'O(2^N) time', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #20: Prefix Sum Range Query',
      description: 'Given an immutable array of size N, what is the query time to compute sum(L, R) after O(N) prefix sum preprocessing?',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(1) time', isCorrect: true, orderNumber: 1 },
        { text: 'O(log N) time', isCorrect: false, orderNumber: 2 },
        { text: 'O(R - L + 1) time', isCorrect: false, orderNumber: 3 },
        { text: 'O(N) time', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #21: Trie Search Complexity',
      description: 'Searching for a string of length L in a Prefix Tree (Trie) takes:',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'O(L) time, independent of the total words stored', isCorrect: true, orderNumber: 1 },
        { text: 'O(N * L) where N is the number of stored words', isCorrect: false, orderNumber: 2 },
        { text: 'O(log N) time', isCorrect: false, orderNumber: 3 },
        { text: 'O(2^L) time', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #22: Lowest Common Ancestor (LCA)',
      description: 'Using Binary Lifting on a tree with N nodes, what is the per-query time complexity for LCA?',
      type: 'MCQ',
      difficulty: 'MEDIUM',
      points: 5,
      options: [
        { text: 'O(log N) after O(N log N) preprocessing', isCorrect: true, orderNumber: 1 },
        { text: 'O(N) after O(1) preprocessing', isCorrect: false, orderNumber: 2 },
        { text: 'O(1) with no preprocessing', isCorrect: false, orderNumber: 3 },
        { text: 'O(N^2) space and O(1) query', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #23: Minimum Spanning Tree (Kruskal vs Prim)',
      description: 'Kruskal\'s algorithm for Minimum Spanning Tree sorts all edges and processes them with:',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: 'Disjoint Set Union (DSU) to avoid cycles', isCorrect: true, orderNumber: 1 },
        { text: 'Breadth-First Search queue', isCorrect: false, orderNumber: 2 },
        { text: 'A recursive call stack', isCorrect: false, orderNumber: 3 },
        { text: 'Topological sorting of edges', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #24: Bitmask Subset Iteration',
      description: 'What is the total time complexity to iterate over all submasks of all bitmasks of size N?',
      type: 'MCQ',
      difficulty: 'HARD',
      points: 5,
      options: [
        { text: 'O(3^N)', isCorrect: true, orderNumber: 1 },
        { text: 'O(4^N)', isCorrect: false, orderNumber: 2 },
        { text: 'O(2^N)', isCorrect: false, orderNumber: 3 },
        { text: 'O(N * 2^N)', isCorrect: false, orderNumber: 4 },
      ],
    },
    {
      title: 'Bit #25: Pigeonhole Principle in Hashing',
      description: 'If 1001 items are distributed into 1000 buckets, at least one bucket must contain at least:',
      type: 'MCQ',
      difficulty: 'EASY',
      points: 5,
      options: [
        { text: '2 items', isCorrect: true, orderNumber: 1 },
        { text: '1 item', isCorrect: false, orderNumber: 2 },
        { text: '10 items', isCorrect: false, orderNumber: 3 },
        { text: '0 items', isCorrect: false, orderNumber: 4 },
      ],
    },
  ];

  const outputPredictions = [
    {
      title: 'Output Prediction #1: Python Variable Scoping & Closures',
      description: 'Analyze the following Python snippet carefully and predict the exact console output:\n\n```python\ndef outer():\n    funcs = []\n    for i in range(3):\n        funcs.append(lambda: i * 2)\n    return [f() for f in funcs]\n\nprint(outer())\n```',
      type: 'OUTPUT_PREDICTION',
      difficulty: 'MEDIUM',
      points: 15,
      expectedOutput: '[4, 4, 4]',
      constraints: 'Python 3.10+ lexical binding rules apply.',
    },
    {
      title: 'Output Prediction #2: C++ Pre-increment & Bitwise Logic',
      description: 'Analyze the following C++ snippet and write down the exact integer output printed:\n\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a = 5;\n    int b = ++a * 2;\n    int c = (b >> 2) ^ 1;\n    cout << a + b + c << endl;\n    return 0;\n}\n```',
      type: 'OUTPUT_PREDICTION',
      difficulty: 'MEDIUM',
      points: 15,
      expectedOutput: '20',
      constraints: 'Pre-increment operator evaluation: a becomes 6, b = 12, c = (3) ^ 1 = 2.',
    },
  ];

  return { mcqBits, outputPredictions };
}

export function getRound2Templates() {
  return [
    {
      title: 'Round 2 - Challenge #1: Jumbled QuickSelect Reassembly',
      description: '### Objective\nThe function `findKthLargest(nums, k)` is intended to return the k-th largest element using an in-place partition. However, the code lines have been jumbled and swapped!\n\n### Pre-given Jumbled Code Snippet:\n```python\ndef findKthLargest(nums, k):\n    nums[i], nums[right] = nums[right], nums[i]\n    pivot = nums[right]\n    # Jumbled lines below:\n    if p > target: return quickSelect(left, p - 1)\n    for j in range(left, right):\n    target = len(nums) - k\n    p = partition(left, right)\n    def quickSelect(left, right):\n```\n\nReconstruct and correct the code to pass all test cases.',
      type: 'JUMBLED',
      difficulty: 'MEDIUM',
      points: 25,
      initialCode: `import sys

def findKthLargest(nums, k):
    # JUMBLED CODE: Reorder, indent, and reconstruct QuickSelect
    # lines to return the k-th largest element in nums.
    # [Lines available]:
    #   target = len(nums) - k
    #   pivot = nums[r]
    #   if p > target: return quickSelect(l, p - 1)
    #   nums[p], nums[r] = nums[r], nums[p]
    #   for i in range(l, r):
    #   def quickSelect(l, r):
    pass

input_data = sys.stdin.read().split()
if input_data:
    k = int(input_data[0])
    arr = list(map(int, input_data[1:]))
    print(findKthLargest(arr, k))
`,
      testCases: [
        { input: '2 3 2 1 5 6 4', expectedOutput: '5', isPublic: true, weight: 1 },
        { input: '4 3 2 3 1 2 4 5 5 6', expectedOutput: '4', isPublic: true, weight: 1 },
        { input: '1 7 10 4 3 20 15', expectedOutput: '20', isPublic: false, weight: 2 },
      ],
    },
    {
      title: 'Round 2 - Challenge #2: Bug Extermination - Two Sum II Sorted',
      description: '### Objective\nGiven a 1-indexed array of integers `numbers` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific `target` number.\n\n### Pre-given Buggy Code Snippet:\n```python\ndef twoSum(numbers, target):\n    l, r = 0, len(numbers)\n    while l <= r:\n        s = numbers[l] + numbers[r] # IndexError: index out of range\n        if s == target:\n            return [l, r] # 0-indexed bug!\n        elif s < target:\n            r -= 1 # Swapped pointer movement bug!\n        else:\n            l += 1\n```\n\nFix all bugs and return the 1-indexed pair `[index1, index2]`.',
      type: 'DEBUGGING',
      difficulty: 'MEDIUM',
      points: 25,
      initialCode: `import sys

def twoSum(numbers, target):
    # BUGGY CODE: Fix pointer logic, 1-based indexing, and index out of bounds
    l = 0
    r = len(numbers)
    while l <= r:
        s = numbers[l] + numbers[r]
        if s == target:
            return [l, r]
        elif s < target:
            r -= 1
        else:
            l += 1
    return [-1, -1]

data = sys.stdin.read().split()
if data:
    target = int(data[0])
    nums = list(map(int, data[1:]))
    res = twoSum(nums, target)
    print(f"{res[0]} {res[1]}")
`,
      testCases: [
        { input: '9 2 7 11 15', expectedOutput: '1 2', isPublic: true, weight: 1 },
        { input: '6 2 3 4', expectedOutput: '1 3', isPublic: true, weight: 1 },
        { input: '-1 -1 0', expectedOutput: '1 2', isPublic: false, weight: 2 },
      ],
    },
    {
      title: 'Round 2 - Challenge #3: Jumbled Valid Parentheses Decoder',
      description: '### Objective\nGiven a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\n### Pre-given Jumbled Code Snippet:\n```python\n# Scrambled stack processing:\nif char in mapping:\nstack.append(char)\nelif not stack or mapping[char] != stack.pop():\nmapping = {\')\': \'(\', \'}\': \'{\', \']\': \'[\'}\nreturn not stack\n```\n\nReorder the statements and handle empty stacks properly.',
      type: 'JUMBLED',
      difficulty: 'MEDIUM',
      points: 25,
      initialCode: `import sys

def isValid(s):
    # JUMBLED CODE: Reconstruct the stack processing
    # mapping = {')': '(', '}': '{', ']': '['}
    # if char in mapping:
    # stack.append(char)
    # elif not stack or mapping[char] != stack.pop():
    # return not stack
    pass

line = sys.stdin.read().strip()
if line:
    print("true" if isValid(line) else "false")
`,
      testCases: [
        { input: '()[]{}', expectedOutput: 'true', isPublic: true, weight: 1 },
        { input: '(]', expectedOutput: 'false', isPublic: true, weight: 1 },
        { input: '([{}])', expectedOutput: 'true', isPublic: false, weight: 2 },
        { input: '(((', expectedOutput: 'false', isPublic: false, weight: 2 },
      ],
    },
    {
      title: 'Round 2 - Challenge #4: Bug Extermination - Binary Tree Level Order',
      description: '### Objective\nReconstruct a breadth-first level order traversal. The developer left an infinite loop bug where child nodes are pushed to the queue without advancing the parent index.',
      type: 'DEBUGGING',
      difficulty: 'HARD',
      points: 30,
      initialCode: `import sys
from collections import deque

def solve():
    data = sys.stdin.read().split()
    if not data: return
    n = int(data[0])
    values = data[1:n+1]
    print(" ".join(values))

solve()
`,
      testCases: [
        { input: '3 1 2 3', expectedOutput: '1 2 3', isPublic: true, weight: 1 },
        { input: '5 10 20 30 40 50', expectedOutput: '10 20 30 40 50', isPublic: false, weight: 2 },
      ],
    },
  ];
}

export function getRound3Templates() {
  return [
    {
      title: 'Grand Finale #1: Distributed Fault-Tolerant Cache Eviction',
      description: `### Problem Scenario
You are designing the in-memory eviction subsystem for a distributed key-value cache. The cluster operates under a modified **Least Frequently Used with Recency Tie-Breaking (LFU-LRU)** policy.

Given a capacity $C$ and an incoming stream of operations:
* \`PUT key value\`: Inserts or updates the value of the key. When updating, its access frequency increases by 1. When capacity is exceeded, evict the key with the lowest frequency. If a tie exists in lowest frequency, evict the least recently used among them.
* \`GET key\`: Returns the integer value, incrementing frequency by 1. If key is missing, output \`-1\`.

### Constraints
* $1 \\le C \\le 10^4$
* $1 \\le Q \\le 10^5$ operations
* Time Complexity: Each operation must be amortized $O(1)$ or $O(\\log C)$.

### Input Format
First line contains integers $C$ and $Q$.
Next $Q$ lines contain the operation format: \`PUT key val\` or \`GET key\`.

### Output Format
For each \`GET\` operation, print the resulting value on a new line.`,
      type: 'CODING',
      difficulty: 'HARD',
      points: 100,
      timeLimitMs: 2500,
      memoryLimitMb: 256,
      constraints: 'C <= 10000, Q <= 100000. Expected O(1) per operation.',
      initialCode: `import sys

class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.vals = {}
        self.counts = {}

    def get(self, key: int) -> int:
        if key not in self.vals:
            return -1
        self.counts[key] += 1
        return self.vals[key]

    def put(self, key: int, value: int) -> None:
        if self.capacity <= 0: return
        self.vals[key] = value
        self.counts[key] = self.counts.get(key, 0) + 1

def main():
    lines = sys.stdin.read().splitlines()
    if not lines: return
    c, q = map(int, lines[0].split())
    cache = LFUCache(c)
    for line in lines[1:q+1]:
        parts = line.split()
        if parts[0] == 'PUT':
            cache.put(int(parts[1]), int(parts[2]))
        elif parts[0] == 'GET':
            print(cache.get(int(parts[1])))

if __name__ == '__main__':
    main()
`,
      testCases: [
        {
          input: '2 6\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3',
          expectedOutput: '1\n-1\n3',
          isPublic: true,
          weight: 2,
        },
        {
          input: '1 4\nPUT 2 1\nGET 2\nPUT 3 2\nGET 2',
          expectedOutput: '1\n-1',
          isPublic: true,
          weight: 2,
        },
        {
          input: '3 7\nPUT 10 100\nPUT 20 200\nGET 10\nGET 20\nPUT 30 300\nGET 30\nGET 40',
          expectedOutput: '100\n200\n300\n-1',
          isPublic: false,
          weight: 3,
        },
      ],
    },
    {
      title: 'Grand Finale #2: Maximum Flow in Logistics Highway Network',
      description: `### Problem Scenario
An international logistics carrier transports goods between source distribution warehouse $S$ and destination terminal $T$ across $N$ junctions interconnected by $M$ directed pipelines, each with a maximum capacity $C_i$.

Determine the maximum volume of freight that can be concurrently transported from $S$ to $T$ per unit time without exceeding any conduit capacity.

### Constraints
* $2 \\le N \\le 500$
* $1 \\le M \\le 10^4$
* $1 \\le C_i \\le 10^7$

### Input Format
First line: $N, M, S, T$ (1-indexed nodes).
Next $M$ lines: $u, v, c$ indicating a directed conduit from node $u$ to node $v$ with capacity $c$.

### Output Format
Print a single integer: the maximum flow from $S$ to $T$.`,
      type: 'CODING',
      difficulty: 'HARD',
      points: 100,
      timeLimitMs: 2500,
      memoryLimitMb: 256,
      constraints: 'N <= 500, M <= 10000. Dinic or Edmonds-Karp expected.',
      initialCode: `import sys
from collections import deque

def max_flow(n, source, sink, edges):
    adj = [[] for _ in range(n + 1)]
    cap = {}
    for u, v, c in edges:
        adj[u].append(v)
        adj[v].append(u)
        cap[(u, v)] = cap.get((u, v), 0) + c
        if (v, u) not in cap: cap[(v, u)] = 0

    def bfs():
        parent = {source: None}
        q = deque([source])
        while q:
            cur = q.popleft()
            if cur == sink: break
            for nxt in adj[cur]:
                if nxt not in parent and cap.get((cur, nxt), 0) > 0:
                    parent[nxt] = cur
                    q.append(nxt)
        if sink not in parent: return 0, None
        path = []
        cur = sink
        f = float('inf')
        while cur != source:
            prev = parent[cur]
            f = min(f, cap[(prev, cur)])
            path.append((prev, cur))
            cur = prev
        return f, path

    total = 0
    while True:
        f, path = bfs()
        if f == 0: break
        total += f
        for u, v in path:
            cap[(u, v)] -= f
            cap[(v, u)] += f
    return total

def main():
    data = sys.stdin.read().split()
    if not data: return
    n, m, s, t = map(int, data[:4])
    edges = []
    idx = 4
    for _ in range(m):
        u, v, c = map(int, data[idx:idx+3])
        edges.append((u, v, c))
        idx += 3
    print(max_flow(n, s, t, edges))

if __name__ == '__main__':
    main()
`,
      testCases: [
        {
          input: '4 5 1 4\n1 2 10\n1 3 10\n2 3 2\n2 4 4\n3 4 9',
          expectedOutput: '13',
          isPublic: true,
          weight: 2,
        },
        {
          input: '2 1 1 2\n1 2 50',
          expectedOutput: '50',
          isPublic: true,
          weight: 1,
        },
        {
          input: '6 9 1 6\n1 2 10\n1 3 10\n2 3 2\n2 4 4\n2 5 8\n3 5 9\n4 6 10\n5 4 6\n5 6 10',
          expectedOutput: '19',
          isPublic: false,
          weight: 3,
        },
      ],
    },
    {
      title: 'Grand Finale #3: Optimal Energy Grid Load Partitioning',
      description: `### Problem Scenario
An autonomous smart power grid contains $K$ sub-generators that must power $N$ high-capacity industrial machines. Each machine $i$ requires a known continuous energy burst $E_i$.

Partition the $N$ machines into $K$ disjoint subsets such that the **maximum energy allocated to any single generator is minimized**.

### Constraints
* $1 \\le K \\le N \\le 10^5$
* $1 \\le E_i \\le 10^9$

### Input Format
First line contains integers $N$ and $K$.
Second line contains $N$ space-separated integers $E_1, E_2, \\dots, E_N$.

### Output Format
Print the minimum possible maximum generator load.`,
      type: 'CODING',
      difficulty: 'HARD',
      points: 100,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      constraints: 'N, K <= 10^5. Binary search over answer range O(N log(sum(E))).',
      initialCode: `import sys

def min_max_load(n, k, energies):
    def feasible(limit):
        count = 1
        cur = 0
        for e in energies:
            if cur + e > limit:
                count += 1
                cur = e
                if count > k: return False
            else:
                cur += e
        return True

    low = max(energies)
    high = sum(energies)
    ans = high
    while low <= high:
        mid = (low + high) // 2
        if feasible(mid):
            ans = mid
            high = mid - 1
        else:
            low = mid + 1
    return ans

def main():
    data = sys.stdin.read().split()
    if not data: return
    n, k = map(int, data[:2])
    energies = list(map(int, data[2:n+2]))
    print(min_max_load(n, k, energies))

if __name__ == '__main__':
    main()
`,
      testCases: [
        {
          input: '5 2\n7 2 5 10 8',
          expectedOutput: '18',
          isPublic: true,
          weight: 2,
        },
        {
          input: '4 3\n1 2 3 4',
          expectedOutput: '4',
          isPublic: true,
          weight: 1,
        },
        {
          input: '6 1\n10 20 30 40 50 60',
          expectedOutput: '210',
          isPublic: false,
          weight: 3,
        },
      ],
    },
  ];
}
