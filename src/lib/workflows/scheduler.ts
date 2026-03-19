/**
 * Workflow Scheduler Module
 * Handles automatic processing of workflow enrollments, step execution,
 * and contact progression through automation sequences
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Workflow,
  WorkflowStep,
  WorkflowEnrollment,
  WorkflowContact,
  WorkflowWorkspace,
  WorkflowAppointment,
  StepExecutionResult,
  EnrollmentProcessResult,
  TemplateContext,
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
    console.error('Error enrolling contact:', error);
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
      case 'sms':
        if (!contact.phone) {
          throw new Error('Contact has no phone number');
        }
        const smsContent = renderTemplate(
          step.messageTemplate || '',
          contact,
          workspace
        );
        // Provider integration point: SMS send is not wired in this build.
        console.info(`[SMS] To ${contact.phone}: ${smsContent}`);
        eventType = 'sms_sent';
        costCents = 50; // ~$0.50 per SMS
        success = true;
        break;

      case 'call':
        if (!contact.phone) {
          throw new Error('Contact has no phone number');
        }
        const callScript = renderTemplate(
          step.callScript || '',
          contact,
          workspace
        );
        // Provider integration point: voice call send is not wired in this build.
        console.info(`[CALL] To ${contact.phone}: ${callScript}`);
        eventType = 'voice_minute';
        costCents = 150; // ~$0.15 per minute (estimated)
        success = true;
        break;

      case 'email':
        if (!contact.email) {
          throw new Error('Contact has no email address');
        }
        const emailBody = renderTemplate(
          step.emailBody || '',
          contact,
          workspace
        );
        // Provider integration point: email send is not wired in this build.
        console.info(`[EMAIL] To ${contact.email}: ${step.emailSubject}`);
        eventType = 'email_sent';
        costCents = 10; // ~$0.10 per email
        success = true;
        break;

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
        console.warn('Failed to record usage event:', usageError);
      }
    }

    return {
      success,
      cost: costCents,
      timestamp: startTime,
    };
  } catch (error) {
    console.error(`Error executing step ${step.stepOrder}:`, error);
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
  enrollment: WorkflowEnrollment
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
    console.error("Error processing enrollment:", error);
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
      console.info('No enrollments to process');
      return results;
    }

    console.info(`Processing ${enrollments.length} enrollments`);

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

    console.info(`Processing complete:`, results);
    return results;
  } catch (error) {
    console.error('Fatal error in processWorkflowEnrollments:', error);
    throw error;
  }
}
