import type { Variants } from "framer-motion";

/* ──────────────────────────────────────────────────────────────────────
   Motion tokens — Emil Kowalski design engineering principles

   Custom easing curves, not browser defaults. The punch matters.
   Never animate from scale(0). Never use ease-in on UI elements.
   ────────────────────────────────────────────────────────────────────── */

// Strong ease-out: starts fast, feels responsive (UI interactions)
const easeOutExpo = [0.23, 1, 0.32, 1] as const;

// Strong ease-in-out: natural acceleration/deceleration (on-screen movement)
const easeInOutExpo = [0.77, 0, 0.175, 1] as const;

// iOS-style drawer curve
const easeDrawer = [0.32, 0.72, 0, 1] as const;

/* ── Page transition ─────────────────────────────────────────────────── */
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: easeOutExpo },
};

/* ── Fade in + rise ──────────────────────────────────────────────────── */
export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: easeOutExpo },
};

/* ── Scale in (modals — origin center is correct for modals) ─────── */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.2, ease: easeOutExpo },
};

/* ── Popover scale (origin-aware, NOT center) ────────────────────── */
export const popoverScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15, ease: easeOutExpo },
};

/* ── Sheet slide-in (drawer easing) ──────────────────────────────── */
export const slideInRight = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: { duration: 0.35, ease: easeDrawer },
};

/* ── Slide down (dropdown menus) ─────────────────────────────────── */
export const slideDown = {
  initial: { opacity: 0, y: -4, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.97 },
  transition: { duration: 0.15, ease: easeOutExpo },
};

/* ── Stagger container + items ───────────────────────────────────── */
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOutExpo },
  },
};

/* ── Fast stagger for dense lists (30ms gap) ─────────────────────── */
export const staggerFast: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

/* ── Slow stagger for hero/marketing sections (80ms gap) ─────────── */
export const staggerSlow: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/* ── Toast entry (Sonner-inspired: slightly slower, ease not ease-out) */
export const toastEntry = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
};

/* ── Number counter spring ───────────────────────────────────────── */
export const counterSpring = {
  type: "spring" as const,
  duration: 0.5,
  bounce: 0.15,
};

/* ── Easing exports for direct CSS/inline use ────────────────────── */
export const easings = {
  outExpo: easeOutExpo,
  inOutExpo: easeInOutExpo,
  drawer: easeDrawer,
} as const;
