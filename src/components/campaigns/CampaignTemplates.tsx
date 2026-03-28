'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap,
  UserX,
  RefreshCw,
  Star,
  CalendarCheck,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  timing: string;
  icon: React.ComponentType<{ className?: string }>;
  slug: string;
}

const templates: Template[] = [
  {
    id: '1',
    name: 'Speed-to-Lead Recovery',
    description: 'Call missed leads within 5 minutes to capture them before they disappear.',
    bestFor: 'high-intent leads',
    timing: 'immediate',
    icon: Zap,
    slug: 'speed-to-lead-recovery',
  },
  {
    id: '2',
    name: 'No-Show Follow-Up',
    description: 'Re-engage appointment no-shows with a friendly call to reschedule.',
    bestFor: 'service businesses',
    timing: '30 min after missed appointment',
    icon: UserX,
    slug: 'no-show-followup',
  },
  {
    id: '3',
    name: 'Stale Lead Reactivation',
    description: 'Wake up cold leads with a check-in call. Perfect for large existing databases.',
    bestFor: 'databases with 100+ leads',
    timing: '7-day cadence',
    icon: RefreshCw,
    slug: 'stale-lead-reactivation',
  },
  {
    id: '4',
    name: 'Post-Service Review Request',
    description: 'Call after service completion to collect reviews and gather feedback.',
    bestFor: 'local businesses',
    timing: '24h after completion',
    icon: Star,
    slug: 'post-service-review',
  },
  {
    id: '5',
    name: 'Appointment Confirmation',
    description: 'Confirm upcoming appointments to reduce no-shows and increase attendance.',
    bestFor: 'any business with bookings',
    timing: '24h before appointment',
    icon: CalendarCheck,
    slug: 'appointment-confirmation',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export function CampaignTemplates() {
  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Quick Start Templates
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Launch a campaign in seconds using proven templates
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <motion.div key={template.id} variants={itemVariants}>
              <Link href={`/app/campaigns/new?template=${template.slug}`}>
                <div className="group relative p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                  {/* Icon and badge container */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-[var(--bg-hover)] group-hover:bg-[var(--accent-primary)]/10 transition-colors">
                      <Icon className="w-5 h-5 text-[var(--accent-primary)]" />
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      {template.timing}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>

                    {/* Best for tag */}
                    <div className="pt-2 border-t border-[var(--border-default)]">
                      <p className="text-xs font-medium text-[var(--text-tertiary)]">
                        Best for:{' '}
                        <span className="text-[var(--text-secondary)]">
                          {template.bestFor}
                        </span>
                      </p>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-1">
                      <span className="text-xs font-medium text-[var(--accent-primary)] group-hover:underline inline-flex items-center gap-1">
                        Use Template
                        <svg
                          className="w-3 h-3 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
