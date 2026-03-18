export const colors = {
  background: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F5F0",
  text: {
    primary: "#1A1A1A",
    secondary: "#4A4A4A",
    tertiary: "#8A8A8A",
    inverse: "#FFFFFF",
  },
  accent: {
    teal: "#0D6E6E",
    tealHover: "#0A5A5A",
    tealLight: "#E6F2F2",
    tealMuted: "#B8D8D8",
    amber: "#D4A853",
    amberLight: "#FDF5E6",
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
    default: "#E5E5E0",
    hover: "#D4D4CF",
    focus: "#0D6E6E",
  },
} as const;

export const typography = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  heading: {
    h1: { size: "clamp(2rem, 4vw, 3.5rem)", weight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 },
    h2: { size: "clamp(1.75rem, 3.5vw, 2.75rem)", weight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 },
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
  cardPadding: "24px",
  cardRadius: "12px",
  buttonRadius: "8px",
  inputRadius: "8px",
} as const;

/** Chart / legacy consumers */
export const tokens = {
  colors: {
    accentPrimary: colors.accent.teal,
  },
} as const;
