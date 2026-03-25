export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFBFC",
  text: {
    primary: "#0A0A0B",
    secondary: "#5E6270",
    tertiary: "#71757E",
    inverse: "#FFFFFF",
    onAccent: "#FFFFFF",
  },
  accent: {
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    primaryLight: "#EFF6FF",
    primaryMuted: "#93C5FD",
    primarySubtle: "rgba(37, 99, 235, 0.06)",
    amber: "#D4A853",
    amberLight: "#FDF5E6",
    warning: "#D97706",
    secondary: "#16A34A",
    /** @deprecated use primary instead */
    teal: "#2563EB",
    /** @deprecated use primaryHover instead */
    tealHover: "#1D4ED8",
    /** @deprecated use primaryLight instead */
    tealLight: "#EFF6FF",
    /** @deprecated use primaryMuted instead */
    tealMuted: "#93C5FD",
  },
  status: {
    success: "#16A34A",
    successLight: "#DCFCE7",
    warning: "#D97706",
    warningLight: "#FEF3C7",
    error: "#DC2626",
    errorLight: "#FEE2E2",
    info: "#2563EB",
    infoLight: "#DBEAFE",
  },
  border: {
    default: "rgba(0, 0, 0, 0.08)",
    hover: "rgba(0, 0, 0, 0.14)",
    focus: "#2563EB",
  },
} as const;

export const typography = {
  fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  heading: {
    h1: { size: "clamp(2rem, 4vw, 3.5rem)", weight: 600, letterSpacing: "-0.025em", lineHeight: 1.1 },
    h2: { size: "clamp(1.75rem, 3.5vw, 2.75rem)", weight: 600, letterSpacing: "-0.025em", lineHeight: 1.2 },
    h3: { size: "clamp(1.25rem, 2vw, 1.75rem)", weight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 },
    h4: { size: "1.125rem", weight: 600, letterSpacing: "0", lineHeight: 1.4 },
  },
  body: { size: "1rem", weight: 400, lineHeight: 1.6 },
  small: { size: "0.875rem", weight: 400, lineHeight: 1.5 },
  caption: { size: "0.75rem", weight: 500, lineHeight: 1.4 },
} as const;

export const spacing = {
  sectionPadding: { desktop: "80px 0", mobile: "48px 0" },
  contentMaxWidth: "1200px",
  cardPadding: "32px",
  cardRadius: "14px",
  buttonRadius: "10px",
  inputRadius: "10px",
} as const;

/** Chart / legacy consumers */
export const tokens = {
  colors: {
    accentPrimary: colors.accent.primary,
  },
} as const;
