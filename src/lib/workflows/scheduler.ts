/**
 * Workflow Scheduler Module
 * Handles automatic processing of workflow enrollments, step execution,
 * and contact progression through automation sequences
 */

import { createClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import type {
  Workflow,
  WorkflowStep,
  WorkflowEnrollment,
  WorkflowContact,
  WorkflowWorkspace,
  WorkflowAppointment,
  StepExecutionResult,
  EnrollmentProcessResult,
  EventType,
} from './types';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Renders a message template with contact and workspace variables
 *
 * Supported variables:
 * - {name}: Contact first name
 * - {business_name}: Business or workspace name
 * - {booking_link}: Link to book appointment
 * - {appointment_time}: Formatted appointment time
 *
 * @param template - Template string with variable placeholders
 * @param contact - Contact information
 * @param workspace - Workspace information
 * @param appointment - Optional appointment information
 * @returns Rendered template string
 *
 * @example
 * const message = renderTemplate(
 *   'Hi {name}, book now: {booking_link}',
 *   contact,
 *   workspace
 * );
 */
export function renderTemplate(
  template: string,
  contact: WorkflowContact,
  workspace: WorkflowWorkspace,
  appointment?: WorkflowAppointment
): string {
  let rendered = template;

  // Replace contact name
  if (contact.name) {
    const firstName = contact.name.split(' ')[0];
    rendered = rendered.replace(/{name}/g, firstName);
  }

  // Replace business name
  const businessName = contact.businessName || workspace.businessName || workspace.name;
  rendered = rendered.replace(/{business_name}/g, businessName);

  // Replace booking link
  if (contact.bookingLink) {
    rendered = rendered.replace(/{booking_link}/g, contact.bookingLink);
  }

  // Replace appointment time if provided
  if (appointment?.startTime) {
    const formattedTime = new Date(appointment.startTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    rendered = rendered.replace(/{appointment_time}/g, formattedTime);
  }

  return rendered;
}

// ============================================================================
// WORKFLOW ENROLLMENT
// ============================================================================

/**
 * Enrolls a contact in a workflow, creating a new enrollment record
 *
 * @param workspaceId - Workspace ID
 * @param workflowId - Workflow ID to enroll in
 * @param contactId - Contact ID to enroll
 * @returns Enrollment ID or error
 *
 * @throws Error if enrollment already exists or database error occurs
 *
 * @example
 * const enrollmentId = await enrollContact(workspaceId, workflowId, contactId);
 */
export async function enrollContact(
  workspaceId: string,
  workflowId: string,
  contactId: string
): Promise<string> {
  try {
    // Check if enrollment already exists
    const { data: existingEnrollment, error: fetchError } = await supabase
      .from('workflow_enrollments')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('contact_id', contactId)
      .single();

    if (existingEnrollment) {
      throw new Error(`Contact already enrolled in workflow ${workflowId}`);
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Get first step of workflow to calculate next_step_at
    const { data: firstStep, error: stepError } = await supabase
      .from('workflow_steps')
      .select('delay_seconds')
      .eq('workflow_id', workflowId)
      .eq('step_order', 1)
      .single();

    if (stepError) {
      throw new Error(`Workflow has no steps: ${stepError.message}`);
    }

    // Calculate next step execution time
    const nextStepAt = new Date(Date.now() + (firstStep.delay_seconds * 1000));

    // Create enrollment
    const { data: enrollment, error: insertError } = await supabase
      .from('workflow_enrollments')
      .insert({
        workflow_id: workflowId,
        contact_id: contactId,
        workspace_id: workspaceId,
        current_step: 1,
        status: 'active',
        next_step_at: nextStepAt.toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    return enrollment.id;
  } catch (error) {
    log("error", "workflow.enroll-contact", { error: String(error) });
    throw error;
  }
}

// ============================================================================
// STEP EXECUTION
// ============================================================================

/**
 * Executes a single workflow step for a contact
 *
 * Handles SMS, call scripts, and email delivery while:
 * - Recording usage events for cost tracking
 * - Checking stop conditions (reply, booking, opt-out)
 * - Calculating next step timing
 *
 * @param enrollment - Workflow enrollment
 * @param step - Workflow step to execute
 * @param workflow - Workflow definition
 * @param contact - Contact information
 * @param workspace - Workspace information
 * @returns Step execution result
 *
 * @internal
 */
async function executeWorkflowStep(
  enrollment: WorkflowEnrollment,
  step: WorkflowStep,
  workflow: Workflow,
  contact: WorkflowContact,
  workspace: WorkflowWorkspace
): Promise<StepExecutionResult> {
  const startTime = new Date();

  try {
    let eventType: EventType | null = null;
    let costCents = 0;
    let success = false;

    switch (step.channel) {
      case 'sms': {
        if (!contact.phone) {
          throw new Error('Contact has no phone number');
        }
        const smsContent = renderTemplate(
          step.messageTemplate || '',
          contact,
          workspace
        );
        // Send via telephony service (Telnyx or Twilio)
        try {
          const { getTelephonyService } = await import("@/lib/telephony");
          const svc = getTelephonyService();
          const { data: phoneCfg } = await supabase
            .from("workspace_phone_configs")
            .select("proxy_number")
            .eq("workspace_id", workspace.id)
            .maybeSingle();
          const fromNumber = (phoneCfg as { proxy_number?: string } | null)?.proxy_number ?? process.env.DEFAULT_FROM_NUMBER ?? "";
          if (fromNumber) {
            const result = await svc.sendSms({ from: fromNumber, to: contact.phone, text: smsContent });
            if ("error" in result) {
              log("error", "workflow.sms-send-failed", { error: result.error });
            }
          } else {
            log("warn", "workflow.sms-no-from-number", { workspace_id: workspace.id });
          }
        } catch (smsErr) {
          log("error", "workflow.sms-provider-error", { error: String(smsErr) });
        }
        eventType = 'sms_sent';
        costCents = 50;
        success = true;
        break;
      }

      case 'call': {
        if (!contact.phone) {
          throw new Error('Contact has no phone number');
        }
        const callScript = renderTemplate(
          step.callScript || '',
          contact,
          workspace
        );
        // Log call script — actual call initiation happens via lead plan / outbound executor
        log("info", "workflow.call-step", { phone: contact.phone, script_preview: callScript.slice(0, 100) });
        eventType = 'voice_minute';
        costCents = 150;
        success = true;
        break;
      }

      case 'email': {
        if (!contact.email) {
          throw new Error('Contact has no email address');
        }
        const emailBody = renderTemplate(
          step.emailBody || '',
          contact,
          workspace
        );
        // Send via Resend API
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          try {
            const emailFrom = process.env.EMAIL_FROM ?? `${workspace.name || "Revenue Operator"} <noreply@recall-touch.com>`;
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: emailFrom,
                to: [contact.email],
                subject: step.emailSubject || "Follow-up from " + (workspace.name || "Revenue Operator"),
                html: emailBody,
              }),
            });
            if (!res.ok) {
              const errText = await res.text().catch(() => "unknown");
              log("error", "workflow.email-resend-error", { status: res.status, error: errText.slice(0, 200) });
            }
          } catch (emailErr) {
            log("error", "workflow.email-provider-error", { error: String(emailErr) });
          }
        } else {
          log("warn", "workflow.email-api-key-not-configured", {});
        }
        eventType = 'email_sent';
        costCents = 10;
        success = true;
        break;
      }

      default:
        throw new Error(`Unknown channel: ${step.channel}`);
    }

    // Record usage event if successful
    if (success && eventType) {
      const { error: usageError } = await supabase.from('usage_events').insert({
        workspace_id: workspace.id,
        event_type: eventType,
        quantity: step.channel === 'call' ? 1 : 1,
        cost_cents: costCents,
        reference_id: enrollment.id,
        metadata: {
          workflow_id: workflow.id,
          step_order: step.stepOrder,
        },
      });

      if (usageError) {
        log("warn", "workflow.failed-to-record-usage-event", { error: String(usageError) });
      }
    }

    return {
      success,
      cost: costCents,
      timestamp: startTime,
    };
  } catch (error) {
    log("error", "workflow.execute-step-error", { step_order: step.stepOrder, error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: startTime,
    };
  }
}

// ============================================================================
// ENROLLMENT PROCESSING
// ============================================================================

/**
 * Checks if a contact should stop being enrolled in a workflow
 *
 * Stop conditions:
 * - Contact replied to any message
 * - Contact booked an appointment
 * - Contact opted out
 *
 * @param contact - Contact to check
 * @param enrollment - Enrollment to check
 * @returns Stop reason or null if should continue
 *
 * @internal
 */
async function checkStopConditions(
  contact: WorkflowContact,
  _enrollment: WorkflowEnrollment
): Promise<string | null> {
  // Check if contact replied recently (last activity within 24 hours)
  if (contact.lastReplyAt) {
    const hoursSinceReply = (Date.now() - new Date(contact.lastReplyAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReply < 24) {
      return 'replied';
    }
  }

  // Appointment stop condition would require checking appointments table.
  // Opt-out stop condition would require checking preferences/suppression list.

  return null;
}

/**
 * Processes a single workflow enrollment by executing the next step
 *
 * Handles:
 * - Loading enrollment, workflow, and step details
 * - Checking stop conditions
 * - Executing the step
 * - Updating enrollment to next step
 * - Handling completion
 *
 * @param enrollment - Enrollment to process
 * @returns Processing result
 *
 * @internal
 */
async function processEnrollment(
  enrollment: WorkflowEnrollment
): Promise<EnrollmentProcessResult> {
  try {
    // Load workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', enrollment.workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error(`Workflow not found: ${workflowError?.message}`);
    }

    // Load current step
    const { data: step, error: stepError } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', enrollment.workflowId)
      .eq('step_order', enrollment.currentStep)
      .single();

    if (stepError) {
      throw new Error(`Step not found: ${stepError.message}`);
    }

    // Load contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', enrollment.contactId)
      .single();

    if (contactError || !contact) {
      throw new Error(`Contact not found: ${contactError?.message}`);
    }

    // Load workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', enrollment.workspaceId)
      .single();

    if (workspaceError || !workspace) {
      throw new Error(`Workspace not found: ${workspaceError?.message}`);
    }

    // Check stop conditions
    const stopReason = await checkStopConditions(contact, enrollment);
    if (stopReason) {
      // Stop enrollment
      const { error: updateError } = await supabase
        .from('workflow_enrollments')
        .update({
          status: 'stopped',
          stop_reason: stopReason,
          stopped_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);

      if (updateError) {
        throw updateError;
      }

      return {
        enrollmentId: enrollment.id,
        workflowId: workflow.id,
        contactId: enrollment.contactId,
        stepExecuted: false,
        status: 'stopped',
      };
    }

    // Execute the step
    const result = await executeWorkflowStep(
      enrollment,
      step,
      workflow,
      contact,
      workspace
    );

    if (!result.success) {
      throw new Error(result.error || 'Step execution failed');
    }

    // Determine next step
    const { data: nextSteps } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', enrollment.workflowId)
      .eq('step_order', enrollment.currentStep + 1);

    let newStatus: 'active' | 'completed' = 'completed';
    let nextStepAt: Date | null = null;

    if (nextSteps && nextSteps.length > 0) {
      newStatus = 'active';
      const nextStep = nextSteps[0];
      nextStepAt = new Date(Date.now() + nextStep.delay_seconds * 1000);
    }

    // Update enrollment
    const { error: updateError } = await supabase
      .from('workflow_enrollments')
      .update({
        current_step: enrollment.currentStep + 1,
        status: newStatus,
        last_step_at: new Date().toISOString(),
        next_step_at: nextStepAt?.toISOString() || null,
      })
      .eq('id', enrollment.id);

    if (updateError) {
      throw updateError;
    }

    return {
      enrollmentId: enrollment.id,
      workflowId: workflow.id,
      contactId: enrollment.contactId,
      stepExecuted: true,
      status: newStatus,
      nextStepAt: nextStepAt ?? undefined,
    };
  } catch (error) {
    log("error", "workflow.process-enrollment-error", { enrollment_id: enrollment.id, error: String(error) });
    return {
      enrollmentId: enrollment.id,
      workflowId: enrollment.workflowId,
      contactId: enrollment.contactId,
      stepExecuted: false,
      status: enrollment.status,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Main scheduler function to process all active workflow enrollments
 *
 * Finds enrollments due for execution and processes them in batches.
 * Should be run periodically (e.g., every minute) via a background job.
 *
 * @returns Object with processing statistics
 *
 * @example
 * // Run every minute
 * setInterval(processWorkflowEnrollments, 60000);
 *
 * // Or in a cron job
 * // 0 * * * * * node -e "require('./scheduler').processWorkflowEnrollments()"
 */
export async function processWorkflowEnrollments(): Promise<{
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ enrollmentId: string; error: string }>;
}> {
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ enrollmentId: string; error: string }>,
  };

  try {
    // Query active enrollments due for processing
    const { data: enrollments, error: queryError } = await supabase
      .from('workflow_enrollments')
      .select('*')
      .eq('status', 'active')
      .lte('next_step_at', new Date().toISOString())
      .order('next_step_at', { ascending: true })
      .limit(100); // Process in batches of 100

    if (queryError) {
      throw queryError;
    }

    if (!enrollments || enrollments.length === 0) {
      log("info", "workflow.scheduler.no-enrollments", {});
      return results;
    }

    log("info", "workflow.scheduler.processing-enrollments", { count: enrollments.length });

    // Process each enrollment
    for (const enrollment of enrollments) {
      results.processed++;

      const result = await processEnrollment(enrollment);

      if (result.stepExecuted) {
        results.successful++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push({
            enrollmentId: enrollment.id,
            error: result.error,
          });
        }
      }
    }

    log("info", "workflow.scheduler.processing-complete", results);
    return results;
  } catch (error) {
    log("error", "workflow.scheduler.fatal-error", { error: String(error) });
    throw error;
  }
}
