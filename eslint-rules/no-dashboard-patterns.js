/**
 * ui-doctrine/no-dashboard-patterns
 * Fails build when software-like UI patterns appear (charts, metrics, feeds, etc.).
 */

const FORBIDDEN_NAMES = [
  "Chart", "Graph", "Metric", "Stats", "Analytics", "Activity", "Feed",
  "Notification", "Badge", "Counter", "ProgressBar", "Timeline", "Trend",
];

function isForbidden(name) {
  return FORBIDDEN_NAMES.includes(name);
}

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow dashboard/software UI patterns (Chart, Metric, Stats, etc.)" },
    schema: [],
    messages: {
      forbiddenImport: "UI doctrine: do not import '{{name}}'. Forbidden pattern.",
      forbiddenElement: "UI doctrine: do not render '{{name}}'. Forbidden pattern.",
    },
  },
  create(context) {
    const filename = context.getFilename?.() ?? "";
    const isUi = /(?:dashboard|components)(?:\/|\\|$)/.test(filename) && /\.(tsx|jsx)$/.test(filename);
    if (!isUi) return {};

    return {
      ImportDeclaration(node) {
        for (const spec of node.specifiers) {
          const name = spec.imported?.name ?? spec.imported?.value;
          if (name && isForbidden(name)) {
            context.report({ node: spec, messageId: "forbiddenImport", data: { name } });
          }
        }
      },
      JSXOpeningElement(node) {
        const name = node.name?.name ?? node.name?.property?.name;
        if (name && isForbidden(name)) {
          context.report({ node, messageId: "forbiddenElement", data: { name } });
        }
      },
    };
  },
};
