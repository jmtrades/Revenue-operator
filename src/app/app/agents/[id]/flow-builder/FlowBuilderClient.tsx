"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
    start: "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/50",
    greeting: "bg-[var(--bg-inset)]/20 border-[var(--border-default)]/50",
    question: "bg-[var(--accent-warning,#f59e0b)]/20 border-[var(--accent-warning,#f59e0b)]/50",
    branch: "bg-[var(--bg-inset)]/20 border-[var(--text-tertiary)]/50",
    transfer: "bg-[var(--accent-warning,#f59e0b)]/20 border-[var(--accent-warning,#f59e0b)]/50",
    book_appointment: "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/50",
    end_call: "bg-[var(--accent-danger,#ef4444)]/20 border-[var(--accent-danger,#ef4444)]/50",
    custom_action: "bg-[var(--bg-inset)]/20 border-[var(--border-default)]/50",
  };
  const style = colors[nodeType ?? ""] ?? "bg-[var(--bg-inset)] border-[var(--border-default)]";

  return (
    <div className={`px-4 py-2 rounded-xl border min-w-[140px] ${style}`}>
      {!isSource && <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[var(--text-tertiary)]" />}
      <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{String(label).replace(/_/g, " ")}</span>
      {nodeType !== "end_call" && <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[var(--text-tertiary)]" />}
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
  const t = useTranslations("flowBuilder");

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((agent) => {
        const flow = (agent as { conversation_flow?: { nodes?: unknown[]; edges?: unknown[] } | null } | null)?.conversation_flow ?? null;
        const { nodes: n, edges: e } = deserializeFlow(flow);
        setNodes(n);
        setEdges(e);
      })
      .catch(() => setToast(t("toast.loadFailed")))
      .finally(() => setLoading(false));
  }, [agentId, setNodes, setEdges, t]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSave = useCallback(() => {
    const start = nodes.find((n) => n.type === "start");
    const hasEdgeFromStart = start ? edges.some((e) => e.source === start.id) : false;
    if (!start || edges.length === 0 || !hasEdgeFromStart) {
      setToast(t("toast.needsConnection"));
      return;
    }
    const hasEndish = nodes.some((n) => n.type === "end_call" || n.type === "book_appointment" || n.type === "transfer");
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
        if (r.ok) setToast(hasEndish ? t("toast.saved") : t("toast.savedDraft"));
        else setToast(t("toast.saveFailed"));
      })
      .catch(() => setToast(t("toast.saveFailed")))
      .finally(() => setSaving(false));
  }, [agentId, nodes, edges, t]);

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
      <div className="h-[70vh] flex items-center justify-center text-[var(--text-tertiary)]">
        Loading flow…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-sm mb-2">
        <Link href="/app/agents" className="hover:text-[var(--text-primary)]">Agents</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/app/agents?selected=${agentId}`} className="hover:text-[var(--text-primary)]">{agentName}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[var(--text-primary)]">Flow builder</span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">Conversation flow</h1>
        <div className="flex items-center gap-2">
          {toast && <span className="text-sm text-[var(--text-tertiary)]">{toast}</span>}
          <div className="flex flex-wrap gap-1 border border-[var(--border-default)] rounded-xl p-1.5 bg-[var(--bg-surface)] max-w-xl">
            {NODE_TYPES_LIST.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type, label)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)] rounded-lg"
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
            className="flex items-center gap-1.5 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save flow
          </button>
        </div>
      </div>
      <div className="flex-1 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-base)] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[var(--bg-base)]"
        >
          <Background color="#3f3f46" gap={16} />
          <Controls className="!bg-[var(--bg-surface)] !border-[var(--border-default)] !rounded-xl" />
          <MiniMap className="!bg-[var(--bg-surface)] !border-[var(--border-default)]" />
          <Panel position="top-left" className="text-xs text-[var(--text-secondary)]">
            Drag nodes to connect. Use the toolbar to add nodes.
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
