'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, Lock, Zap, X, Check, Minus } from 'lucide-react';

// CSS variable definitions for theming
const themeVars = {
  bgPrimary: 'var(--bg-primary)',
  bgSurface: 'var(--bg-surface)',
  textPrimary: 'var(--text-primary)',
  accentPrimary: 'var(--accent-primary)',
  borderDefault: 'var(--border-default)',
} as const;

// ============================================================================
// 1. USAGE WALL BANNER
// ============================================================================

interface UsageWallBannerProps {
  type: 'calls' | 'messages';
  used: number;
  limit: number;
  planName: string;
}

export const UsageWallBanner: React.FC<UsageWallBannerProps> = ({
  type,
  used,
  limit,
  planName: _planName,
}) => {
  const percentage = Math.round((used / limit) * 100);
  const isAtLimit = percentage >= 100;
  const isWarning = percentage >= 80;

  if (!isWarning) return null;

  const bgColor = isAtLimit
    ? 'rgba(220, 38, 38, 0.1)' // Red
    : 'rgba(234, 179, 8, 0.1)'; // Yellow

  const borderColor = isAtLimit
    ? 'var(--red-500, #dc2626)'
    : 'var(--yellow-500, #eab308)';

  const textColor = isAtLimit
    ? 'var(--red-400, #f87171)'
    : 'var(--yellow-400, #facc15)';

  const ctaText = `Upgrade to unlock more ${type} →`;

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
        <AlertCircle
          size={20}
          style={{ color: textColor, marginTop: '0.25rem', flexShrink: 0 }}
        />
        <div>
          <p
            style={{
              color: textColor,
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            {isAtLimit ? 'Usage Limit Reached' : 'Approaching Usage Limit'}
          </p>
          <p
            style={{
              color: `var(--text-secondary, rgba(255, 255, 255, 0.7))`,
              fontSize: '0.875rem',
              marginBottom: '0.75rem',
            }}
          >
            {used.toLocaleString()} of {limit.toLocaleString()} {type}{' '}
            <span style={{ opacity: 0.7 }}>({percentage}%)</span>
          </p>
          <Link href="/dashboard/billing" style={{ textDecoration: 'none' }}>
            <button
              style={{
                backgroundColor: textColor,
                color: isAtLimit ? '#000' : '#000',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.opacity = '0.9';
                el.style.transform = 'translateX(2px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
              }}
            >
              {ctaText}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. FEATURE PREVIEW CARD
// ============================================================================

interface FeaturePreviewCardProps {
  featureName: string;
  description: string;
  requiredPlan: string;
  previewImage?: string;
}

export const FeaturePreviewCard: React.FC<FeaturePreviewCardProps> = ({
  featureName,
  description,
  requiredPlan,
  previewImage,
}) => {
  return (
    <div
      style={{
        backgroundColor: themeVars.bgSurface,
        border: `1px solid ${themeVars.borderDefault}`,
        borderRadius: '0.75rem',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = themeVars.accentPrimary;
        el.style.boxShadow = `0 0 20px rgba(59, 130, 246, 0.1)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = themeVars.borderDefault;
        el.style.boxShadow = 'none';
      }}
    >
      {/* Preview Section */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: themeVars.bgPrimary,
          overflow: 'hidden',
        }}
      >
        {previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewImage}
            alt={featureName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(8px)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `rgba(59, 130, 246, 0.1)`,
            }}
          >
            <Zap size={48} style={{ color: themeVars.accentPrimary, opacity: 0.3 }} />
          </div>
        )}

        {/* Lock Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              backgroundColor: `rgba(0, 0, 0, 0.7)`,
              borderRadius: '50%',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${themeVars.accentPrimary}`,
            }}
          >
            <Lock size={32} style={{ color: themeVars.accentPrimary }} />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ padding: '1.5rem' }}>
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: themeVars.textPrimary,
            marginBottom: '0.5rem',
          }}
        >
          {featureName}
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: `var(--text-secondary, rgba(255, 255, 255, 0.7))`,
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>

        <Link href="/dashboard/billing" style={{ textDecoration: 'none' }}>
          <button
            style={{
              width: '100%',
              backgroundColor: themeVars.accentPrimary,
              color: '#000',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = `0 8px 16px rgba(59, 130, 246, 0.3)`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            }}
          >
            Unlock with {requiredPlan} →
          </button>
        </Link>
      </div>
    </div>
  );
};

// ============================================================================
// 3. REVENUE CEILING BANNER
// ============================================================================

interface RevenueCeilingBannerProps {
  monthlyRevenue: number;
  planCost: number;
}

export const RevenueCeilingBanner: React.FC<RevenueCeilingBannerProps> = ({
  monthlyRevenue,
  planCost,
}) => {
  const revenueDifference = monthlyRevenue - planCost;

  if (monthlyRevenue <= planCost) return null;

  const recoverageRate = Math.round((revenueDifference / monthlyRevenue) * 100);

  return (
    <div
      style={{
        backgroundColor: `rgba(59, 130, 246, 0.1)`,
        border: `1px solid ${themeVars.accentPrimary}`,
        borderRadius: '0.5rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Zap size={24} style={{ color: themeVars.accentPrimary }} />
        <div style={{ flex: 1 }}>
          <p
            style={{
              color: themeVars.textPrimary,
              fontSize: '1rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            You&apos;re recovering{' '}
            <span style={{ color: themeVars.accentPrimary, fontWeight: 700 }}>
              ${monthlyRevenue.toLocaleString()}
            </span>
            /mo on a{' '}
            <span style={{ color: themeVars.accentPrimary, fontWeight: 700 }}>
              ${planCost.toLocaleString()}
            </span>{' '}
            plan.
          </p>
          <p
            style={{
              color: `var(--text-secondary, rgba(255, 255, 255, 0.7))`,
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            Imagine what you could do with Scale. You&apos;re at {recoverageRate}% plan utilization.
          </p>

          <Link href="/dashboard/billing" style={{ textDecoration: 'none' }}>
            <button
              style={{
                backgroundColor: themeVars.accentPrimary,
                color: '#000',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.opacity = '0.9';
                el.style.transform = 'translateX(2px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
              }}
            >
              Explore Scale Plan →
            </button>
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          backgroundColor: `rgba(59, 130, 246, 0.2)`,
          borderRadius: '0.25rem',
          height: '0.5rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: themeVars.accentPrimary,
            height: '100%',
            width: `${Math.min(recoverageRate, 100)}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// 4. UPGRADE MODAL
// ============================================================================

interface PlanComparison {
  calls: number;
  messages: number;
  customIntegrations: boolean;
  analytics: boolean;
  support: string;
  price: number;
}

interface UpgradeModalProps {
  currentPlan: string;
  recommendedPlan: string;
  isOpen: boolean;
  onClose: () => void;
}

const PLAN_DETAILS: Record<string, PlanComparison> = {
  Starter: {
    calls: 1000,
    messages: 2000,
    customIntegrations: false,
    analytics: false,
    support: 'Email',
    price: 147,
  },
  Growth: {
    calls: 3000,
    messages: 10000,
    customIntegrations: true,
    analytics: true,
    support: 'Priority',
    price: 297,
  },
  Business: {
    calls: 8000,
    messages: 25000,
    customIntegrations: true,
    analytics: true,
    support: 'Phone',
    price: 597,
  },
  Agency: {
    calls: 15000,
    messages: 50000,
    customIntegrations: true,
    analytics: true,
    support: 'Dedicated Account Manager',
    price: 997,
  },
};

interface PlanCardProps {
  name: string;
  details: PlanComparison;
  isCurrent: boolean;
  isRecommended: boolean;
  onUpgrade: () => void;
}

const PlanComparisonCard: React.FC<PlanCardProps> = ({
  name,
  details,
  isCurrent,
  isRecommended,
  onUpgrade,
}) => {
  return (
    <div
      style={{
        backgroundColor: isRecommended
          ? `rgba(59, 130, 246, 0.1)`
          : themeVars.bgSurface,
        border: isRecommended
          ? `2px solid ${themeVars.accentPrimary}`
          : `1px solid ${themeVars.borderDefault}`,
        borderRadius: '0.75rem',
        padding: '1.5rem',
        position: 'relative',
        transition: 'all 0.3s ease',
      }}
    >
      {isRecommended && (
        <div
          style={{
            position: 'absolute',
            top: '-0.75rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: themeVars.accentPrimary,
            color: '#000',
            padding: '0.25rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Recommended
        </div>
      )}

      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: themeVars.textPrimary,
          marginBottom: '0.5rem',
          marginTop: isRecommended ? '1rem' : 0,
        }}
      >
        {name}
      </h3>

      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: themeVars.textPrimary }}>
          ${details.price}
        </span>
        <span style={{ color: `var(--text-secondary, rgba(255, 255, 255, 0.7))` }}>
          /month
        </span>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <FeatureRow label="Calls" value={`${details.calls.toLocaleString()}/mo`} />
        <FeatureRow label="Messages" value={`${details.messages.toLocaleString()}/mo`} />
        <FeatureRow label="Custom Integrations" value={details.customIntegrations} />
        <FeatureRow label="Advanced Analytics" value={details.analytics} />
        <FeatureRow label="Support" value={details.support} />
      </div>

      <Link href="/dashboard/billing" style={{ textDecoration: 'none' }}>
        <button
          style={{
            width: '100%',
            backgroundColor: isCurrent ? themeVars.borderDefault : themeVars.accentPrimary,
            color: isCurrent ? themeVars.textPrimary : '#000',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isCurrent ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: isCurrent ? 0.6 : 1,
          }}
          disabled={isCurrent}
          onMouseEnter={(e) => {
            if (!isCurrent) {
              const el = e.currentTarget;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = `0 8px 16px rgba(59, 130, 246, 0.3)`;
            }
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.transform = 'translateY(0)';
            el.style.boxShadow = 'none';
          }}
          onClick={onUpgrade}
        >
          {isCurrent ? 'Current Plan' : `Upgrade to ${name}`}
        </button>
      </Link>
    </div>
  );
};

interface FeatureRowProps {
  label: string;
  value: string | boolean;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ label, value }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: `var(--text-secondary, rgba(255, 255, 255, 0.7))` }}>
        {label}
      </span>
      {typeof value === 'boolean' ? (
        <span style={{ color: themeVars.accentPrimary, fontWeight: 600 }}>
          {value ? <Check className="w-4 h-4 inline-block" /> : <Minus className="w-4 h-4 inline-block" />}
        </span>
      ) : (
        <span style={{ color: themeVars.textPrimary, fontWeight: 600 }}>
          {value}
        </span>
      )}
    </div>
  );
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  currentPlan,
  recommendedPlan,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const plans = Object.keys(PLAN_DETAILS);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: themeVars.bgPrimary,
            borderRadius: '1rem',
            border: `1px solid ${themeVars.borderDefault}`,
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2rem',
              borderBottom: `1px solid ${themeVars.borderDefault}`,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: themeVars.textPrimary,
                  marginBottom: '0.5rem',
                }}
              >
                Upgrade Your Plan
              </h2>
              <p
                style={{
                  color: `var(--text-secondary, rgba(255, 255, 255, 0.7))`,
                  fontSize: '0.875rem',
                }}
              >
                Choose the perfect plan for your needs
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: themeVars.textPrimary,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = `rgba(255, 255, 255, 0.1)`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = 'transparent';
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Plans Grid */}
          <div
            style={{
              padding: '2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
            }}
          >
            {plans.map((plan) => (
              <PlanComparisonCard
                key={plan}
                name={plan}
                details={PLAN_DETAILS[plan]}
                isCurrent={plan === currentPlan}
                isRecommended={plan === recommendedPlan}
                onUpgrade={onClose}
              />
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '2rem',
              borderTop: `1px solid ${themeVars.borderDefault}`,
              backgroundColor: `rgba(59, 130, 246, 0.05)`,
              borderBottomLeftRadius: '1rem',
              borderBottomRightRadius: '1rem',
            }}
          >
            <p
              style={{
                color: `var(--text-secondary, rgba(255, 255, 255, 0.7))`,
                fontSize: '0.875rem',
                textAlign: 'center',
              }}
            >
              All plans include full access to every feature. Cancel anytime. Need a custom plan?{' '}
              <a
                href="mailto:support@revenueoperator.ai"
                style={{ color: themeVars.accentPrimary, textDecoration: 'none' }}
              >
                Contact sales
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
