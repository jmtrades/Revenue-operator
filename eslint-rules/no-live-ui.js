/**
 * ui-doctrine/no-live-ui
 * Dashboard UI must not update itself while open. No polling, refetch intervals, or live subscriptions.
 */

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow setInterval, polling setTimeout, refetch intervals, SWR refresh, websocket in dashboard UI" },
    schema: [],
    messages: {
      setInterval: "UI doctrine: setInterval is disallowed. UI changes only on navigation.",
      refetchInterval: "UI doctrine: refetchInterval / live refresh is disallowed. UI changes only on navigation.",
      useSWR: "UI doctrine: SWR/refresh is disallowed. UI changes only on navigation.",
      useSubscription: "UI doctrine: websocket/subscription is disallowed. UI changes only on navigation.",
    },
  },
  create(context) {
    const filename = context.getFilename?.() ?? "";
    const isDashboard = /(?:dashboard|components)(?:\/|\\|$)/.test(filename) && /\.(tsx|jsx)$/.test(filename);
    if (!isDashboard) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        const name = callee.name ?? (callee.type === "MemberExpression" ? callee.property?.name : null);
        if (name === "setInterval") {
          context.report({ node, messageId: "setInterval" });
          return;
        }
        if (name === "useSWR" || name === "useSwr") {
          context.report({ node, messageId: "useSWR" });
          return;
        }
        if (name === "useSubscription" || name === "useRealtime") {
          context.report({ node, messageId: "useSubscription" });
          return;
        }
        if (callee.type === "MemberExpression") {
          const prop = callee.property?.name;
          if (prop === "refetchInterval" || prop === "refetch" && callee.object?.name === "queryClient") {
            context.report({ node, messageId: "refetchInterval" });
          }
        }
      },
      Property(node) {
        const key = node.key?.name ?? node.key?.value;
        if (key === "refetchInterval" || key === "refreshInterval") {
          context.report({ node, messageId: "refetchInterval" });
        }
      },
    };
  },
};
