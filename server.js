const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

// 🔹 Helper: Validate edge
function isValidEdge(str) {
    if (!str) return false;
    str = str.trim();

    if (!/^[A-Z]->[A-Z]$/.test(str)) return false;

    const [p, c] = str.split("->");
    if (p === c) return false; // self-loop invalid

    return true;
}

// 🔹 Build tree recursively
function buildTree(node, graph) {
    let obj = {};
    if (!graph[node]) return obj;

    for (let child of graph[node]) {
        obj[child] = buildTree(child, graph);
    }
    return obj;
}

// 🔹 Calculate depth
function getDepth(node, graph) {
    if (!graph[node] || graph[node].length === 0) return 1;

    let maxDepth = 0;
    for (let child of graph[node]) {
        maxDepth = Math.max(maxDepth, getDepth(child, graph));
    }
    return maxDepth + 1;
}

// 🔹 Detect cycle (DFS)
function hasCycle(node, graph, visited, stack) {
    if (!visited.has(node)) {
        visited.add(node);
        stack.add(node);

        for (let child of (graph[node] || [])) {
            if (!visited.has(child) && hasCycle(child, graph, visited, stack)) {
                return true;
            } else if (stack.has(child)) {
                return true;
            }
        }
    }
    stack.delete(node);
    return false;
}

// 🔥 MAIN API
app.post('/bfhl', (req, res) => {
    const input = req.body.data || [];

    let invalid_entries = [];
    let duplicate_edges = [];

    let seenEdges = new Set();
    let edgeSet = new Set();

    let graph = {};
    let parentMap = {};

    // 🔹 Step 1 & 2: Validate + duplicates
    for (let item of input) {
        if (!isValidEdge(item)) {
            invalid_entries.push(item);
            continue;
        }

        item = item.trim();

        if (seenEdges.has(item)) {
            duplicate_edges.push(item);
            continue;
        }

        seenEdges.add(item);

        const [p, c] = item.split("->");

        // multi-parent check
        if (parentMap[c]) continue;

        parentMap[c] = p;

        if (!graph[p]) graph[p] = [];
        graph[p].push(c);

        edgeSet.add(item);
    }

    // 🔹 Find all nodes
    let nodes = new Set();
    for (let edge of edgeSet) {
        let [p, c] = edge.split("->");
        nodes.add(p);
        nodes.add(c);
    }

    // 🔹 Find roots
    let roots = [];
    for (let node of nodes) {
        if (!parentMap[node]) {
            roots.push(node);
        }
    }

    // If no roots → cycle group
    if (roots.length === 0 && nodes.size > 0) {
        roots.push([...nodes].sort()[0]);
    }

    let visitedGlobal = new Set();
    let hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;

    let maxDepth = 0;
    let largest_tree_root = "";

    // 🔹 Process each root
    for (let root of roots) {
        if (visitedGlobal.has(root)) continue;

        let visited = new Set();
        let stack = new Set();

        let cycle = hasCycle(root, graph, visited, stack);

        // mark visited
        visited.forEach(n => visitedGlobal.add(n));

        if (cycle) {
            total_cycles++;
            hierarchies.push({
                root: root,
                tree: {},
                has_cycle: true
            });
        } else {
            total_trees++;

            let tree = {};
            tree[root] = buildTree(root, graph);

            let depth = getDepth(root, graph);

            if (depth > maxDepth || (depth === maxDepth && root < largest_tree_root)) {
                maxDepth = depth;
                largest_tree_root = root;
            }

            hierarchies.push({
                root: root,
                tree: tree,
                depth: depth
            });
        }
    }

    // 🔹 Response
    res.json({
        user_id: "GaneshMadhavPosa_08032005",
        email_id: "gp8701@srmist.edu.in",
        college_roll_number: "RA2311026010160",
        hierarchies,
        invalid_entries,
        duplicate_edges,
        summary: {
            total_trees,
            total_cycles,
            largest_tree_root
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});