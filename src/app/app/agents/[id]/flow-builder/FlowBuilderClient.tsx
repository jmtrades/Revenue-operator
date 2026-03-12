"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Save, Plus } from "lucide-react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  Position,
  Background,
  Controls,
  MiniMap,
  Panel,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const NODE_TYPES_LIST = [
  { type: "start", label: "Start" },
  { type: "greeting", label: "Greeting" },
  { type: "question", label: "Question" },
  { type: "branch", label: "Branch" },
  { type: "transfer", label: "Transfer" },
  { type: "book_appointment", label: "Book Appointment" },
  { type: "end_call", label: "End Call" },
  { type: "custom_action", label: "Custom Action" },
] as const;

function BaseFlowNode({
  id: _id,
  data,
  type: nodeType,
}: {
  id: string;
  data: { label?: string };
  type?: string;
}) {
  const label = data?.label ?? nodeType ?? "Node";
  const isSource = nodeType === "start" || nodeType === "end_call";
  const colors: Record<string, string> = {
    start: "bg-green-500/20 border-green-500/50",
    greeting: "bg-blue-500/20 border-blue-500/50",
    question: "bg-amber-500/20 border-amber-500/50",
    branch: "bg-purple-500/20 border-purple-500/50",
    transfer: "bg-orange-500/20 border-orange-500/50",
    book_appointment: "bg-emerald-500/20 border-emerald-500/50",
    end_call: "bg-red-500/20 border-red-500/50",
    custom_action: "bg-zinc-500/20 border-zinc-500/50",
  };
  const style = colors[nodeType ?? ""] ?? "bg-zinc-800 border-zinc-600";

  return (
    <div className={`px-4 py-2 rounded-xl border min-w-[140px] ${style}`}>
      {!isSource && <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-zinc-400" />}
      <span className="text-sm font-medium text-white capitalize">{String(label).replace(/_/g, " ")}</span>
      {nodeType !== "end_call" && <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-zinc-400" />}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  start: (props) => <BaseFlowNode {...props} />,
  greeting: (props) => <BaseFlowNode {...props} />,
  question: (props) => <BaseFlowNode {...props} />,
  branch: (props) => <BaseFlowNode {...props} />,
  transfer: (props) => <BaseFlowNode {...props} />,
  book_appointment: (props) => <BaseFlowNode {...props} />,
  end_call: (props) => <BaseFlowNode {...props} />,
  custom_action: (props) => <BaseFlowNode {...props} />,
};

function serializeFlow(nodes: Node[], edges: Edge[]): { nodes: unknown[]; edges: unknown[] } {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };
}

function deserializeFlow(flow: { nodes?: unknown[]; edges?: unknown[] } | null): { nodes: Node[]; edges: Edge[] } {
  if (!flow?.nodes?.length) {
    return {
      nodes: [{ id: "start-1", type: "start", position: { x: 100, y: 100 }, data: { label: "Start" } }],
      edges: [],
    };
  }
  const nodes = (flow.nodes as Array<{ id: string; type?: string; position: { x: number; y: number }; data?: Record<string, unknown> }>).map(
    (n) => ({
      id: n.id,
      type: (n.type ?? "default") as string,
      position: n.position ?? { x: 0, y: 0 },
      data: n.data ?? {},
    })
  ) as Node[];
  const rawEdges = (flow.edges ?? []) as Array<{ id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
  const edges = rawEdges.map((e) => ({
    id: e.id ?? `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  })) as Edge[];
  return { nodes, edges };
}

export default function FlowBuilderClient({
  agentId,
  agentName,
}: {
  agentId: string;
  agentName: string;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((agent) => {
        const flow = (agent as { conversation_flow?: { nodes?: unknown[]; edges?: unknown[] } | null } | null)?.conversation_flow ?? null;
        const { nodes: n, edges: e } = deserializeFlow(flow);
        setNodes(n);
        setEdges(e);
      })
      .catch(() => setToast("Could not load flow"))
      .finally(() => setLoading(false));
  }, [agentId, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSave = useCallback(() => {
    setSaving(true);
    setToast(null);
    const flow = serializeFlow(nodes, edges);
    fetch(`/api/agents/${agentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_flow: flow }),
    })
      .then((r) => {
        if (r.ok) setToast("Flow saved.");
        else setToast("Could not save.");
      })
      .catch(() => setToast("Could not save."))
      .finally(() => setSaving(false));
  }, [agentId, nodes, edges]);

  const addNode = useCallback(
    (type: string, label: string) => {
      const id = `${type}-${Date.now()}`;
      const lastNode = nodes[nodes.length - 1];
      const x = lastNode ? lastNode.position.x + 220 : 100;
      const y = lastNode ? lastNode.position.y : 100 + nodes.length * 80;
      setNodes((nds) => [...nds, { id, type, position: { x, y }, data: { label } } as Node]);
    },
    [nodes, setNodes]
  );

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center text-zinc-400">
        Loading flow…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
        <Link href="/app/agents" className="hover:text-white">Agents</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/app/agents?selected=${agentId}`} className="hover:text-white">{agentName}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">Flow builder</span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h1 className="text-xl font-semibold text-white">Conversation flow</h1>
        <div className="flex items-center gap-2">
          {toast && <span className="text-sm text-zinc-400">{toast}</span>}
          <div className="flex flex-wrap gap-1 border border-zinc-700 rounded-xl p-1.5 bg-zinc-900/50 max-w-xl">
            {NODE_TYPES_LIST.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type, label)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-lg"
                title={`Add ${label}`}
              >
                <Plus className="w-3 h-3 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save flow
          </button>
        </div>
      </div>
      <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-zinc-950"
        >
          <Background color="#3f3f46" gap={16} />
          <Controls className="!bg-zinc-900 !border-zinc-700 !rounded-xl" />
          <MiniMap className="!bg-zinc-900 !border-zinc-700" />
          <Panel position="top-left" className="text-xs text-zinc-500">
            Drag nodes to connect. Use the toolbar to add nodes.
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
