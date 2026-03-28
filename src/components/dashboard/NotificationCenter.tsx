'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Notification {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  message: string;
  timestamp: string;
  actionLink?: string;
}

interface SummaryData {
  missed_calls_today?: number;
  no_shows_this_week?: number;
  stale_leads?: number;
  pending_follow_ups?: number;
  minutes_used?: number;
  minutes_limit?: number;
  appointments_booked?: number;
}

interface NotificationCenterProps {
  workspaceId: string;
}

export function NotificationCenter({ workspaceId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch<SummaryData>(
          `/api/dashboard/summary?workspace_id=${workspaceId}`
        );

        const newNotifications: Notification[] = [];

        // Missed calls notification
        if (data.missed_calls_today && data.missed_calls_today > 0) {
          newNotifications.push({
            id: 'missed-calls',
            type: 'urgent',
            message: `${data.missed_calls_today} unanswered revenue opportunity${data.missed_calls_today > 1 ? 's' : ''} today`,
            timestamp: 'now',
            actionLink: '/app/leads',
          });
        }

        // No-shows notification
        if (data.no_shows_this_week && data.no_shows_this_week > 0) {
          newNotifications.push({
            id: 'no-shows',
            type: 'warning',
            message: `${data.no_shows_this_week} no-show${data.no_shows_this_week > 1 ? 's' : ''} this week`,
            timestamp: 'now',
            actionLink: '/app/campaigns',
          });
        }

        // Stale leads notification
        if (data.stale_leads && data.stale_leads > 0) {
          newNotifications.push({
            id: 'stale-leads',
            type: 'info',
            message: `${data.stale_leads} cold lead${data.stale_leads > 1 ? 's' : ''} waiting for agent reactivation`,
            timestamp: 'now',
            actionLink: '/app/leads',
          });
        }

        // Pending follow-ups notification
        if (data.pending_follow_ups && data.pending_follow_ups > 0) {
          newNotifications.push({
            id: 'pending-followups',
            type: 'info',
            message: `${data.pending_follow_ups} automated recovery action${data.pending_follow_ups > 1 ? 's' : ''} queued`,
            timestamp: 'now',
            actionLink: '/app/campaigns',
          });
        }

        // Minute limit warning
        if (data.minutes_used !== undefined && data.minutes_limit !== undefined && data.minutes_limit > 0) {
          const percentageUsed = (data.minutes_used / data.minutes_limit) * 100;
          if (percentageUsed >= 80) {
            newNotifications.push({
              id: 'minute-limit',
              type: 'warning',
              message: `Agent operating time limit approaching (${Math.round(percentageUsed)}% used)`,
              timestamp: 'now',
              actionLink: '/app/settings',
            });
          }
        }

        // Success notification (if appointments booked this month)
        if (data.appointments_booked && data.appointments_booked > 0) {
          newNotifications.push({
            id: 'appointments-booked',
            type: 'success',
            message: `Your agent has created ${data.appointments_booked} revenue opportunity${data.appointments_booked > 1 ? 'ies' : ''} this month!`,
            timestamp: 'now',
            actionLink: '/app/appointments',
          });
        }

        setNotifications(newNotifications);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-[var(--text-secondary)]" />;
    }
  };

  const getNotificationStyles = (type: Notification['type']) => {
    switch (type) {
      case 'urgent':
        return 'border-l-4 border-red-500 bg-red-500/10';
      case 'warning':
        return 'border-l-4 border-amber-500 bg-amber-500/10';
      case 'info':
        return 'border-l-4 border-blue-500 bg-blue-500/10';
      case 'success':
        return 'border-l-4 border-green-500 bg-green-500/10';
      default:
        return 'border-l-4 border-[var(--border-default)]';
    }
  };

  const getDotColor = (type: Notification['type']) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      case 'info':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      default:
        return 'bg-[var(--text-secondary)]';
    }
  };

  const urgentCount = notifications.filter(n => n.type === 'urgent').length;

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
        {urgentCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getDotColor('urgent')}`}
          />
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Notifications
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      All caught up!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-default)]">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 ${getNotificationStyles(notification.type)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {notification.message}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-1">
                              {notification.timestamp}
                            </p>
                          </div>
                          {notification.actionLink && (
                            <a
                              href={notification.actionLink}
                              onClick={() => setIsOpen(false)}
                              className="text-xs font-medium text-[var(--accent-primary)] hover:underline flex-shrink-0"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
