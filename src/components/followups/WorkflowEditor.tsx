'use client';

import { useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';

interface WorkflowStep {
  id: string;
  channel: 'SMS' | 'Call' | 'Email';
  delay: number;
  delayUnit: 'seconds' | 'minutes' | 'hours' | 'days';
  condition: 'after_trigger' | 'after_previous' | 'if_no_reply';
  message: string;
}

interface Workflow {
  name: string;
  trigger: 'missed_call' | 'appointment_booked' | 'no_show' | 'quote_sent' | 'manual' | 'days_inactive';
  steps: WorkflowStep[];
  stopConditions: {
    stopOnReply: boolean;
    stopOnBooked: boolean;
    stopOnOptOut: boolean;
  };
}

interface WorkflowEditorProps {
  initialWorkflow?: Workflow;
  onSave: (workflow: Workflow) => void;
  onCancel: () => void;
}

const TRIGGERS = [
  { value: 'missed_call', label: 'Missed Call' },
  { value: 'appointment_booked', label: 'Appointment Booked' },
  { value: 'no_show', label: 'No Show' },
  { value: 'quote_sent', label: 'Quote Sent' },
  { value: 'manual', label: 'Manual' },
  { value: 'days_inactive', label: 'Days Inactive' },
];

const CHANNELS = [
  { value: 'SMS', label: 'SMS' },
  { value: 'Call', label: 'Call' },
  { value: 'Email', label: 'Email' },
];

const DELAY_UNITS = [
  { value: 'seconds', label: 'Seconds' },
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
];

const CONDITIONS = [
  { value: 'after_trigger', label: 'After trigger' },
  { value: 'after_previous', label: 'After previous step' },
  { value: 'if_no_reply', label: 'If no reply' },
];

const VARIABLES = [
  { label: '{name}', value: '{name}' },
  { label: '{business_name}', value: '{business_name}' },
  { label: '{booking_link}', value: '{booking_link}' },
  { label: '{appointment_time}', value: '{appointment_time}' },
];

export default function WorkflowEditor({
  initialWorkflow,
  onSave,
  onCancel,
}: WorkflowEditorProps) {
  const [workflow, setWorkflow] = useState<Workflow>(
    initialWorkflow || {
      name: '',
      trigger: 'missed_call',
      steps: [],
      stopConditions: {
        stopOnReply: false,
        stopOnBooked: false,
        stopOnOptOut: false,
      },
    }
  );

  const handleNameChange = (name: string) => {
    setWorkflow({ ...workflow, name });
  };

  const handleTriggerChange = (trigger: Workflow['trigger']) => {
    setWorkflow({ ...workflow, trigger });
  };

  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      channel: 'SMS',
      delay: 5,
      delayUnit: 'minutes',
      condition: 'after_trigger',
      message: '',
    };
    setWorkflow({
      ...workflow,
      steps: [...workflow.steps, newStep],
    });
  };

  const handleUpdateStep = (
    stepId: string,
    updates: Partial<WorkflowStep>
  ) => {
    setWorkflow({
      ...workflow,
      steps: workflow.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    });
  };

  const handleRemoveStep = (stepId: string) => {
    setWorkflow({
      ...workflow,
      steps: workflow.steps.filter((step) => step.id !== stepId),
    });
  };

  const handleInsertVariable = (stepId: string, variable: string) => {
    const step = workflow.steps.find((s) => s.id === stepId);
    if (step) {
      const newMessage = step.message + variable;
      handleUpdateStep(stepId, { message: newMessage });
    }
  };

  const handleStopConditionChange = (
    condition: keyof Workflow['stopConditions'],
    value: boolean
  ) => {
    setWorkflow({
      ...workflow,
      stopConditions: {
        ...workflow.stopConditions,
        [condition]: value,
      },
    });
  };

  const handleSave = () => {
    onSave(workflow);
  };

  return (
    <div className="space-y-6 bg-[#FAFAF8] p-6 rounded-lg">
      {/* Workflow Name */}
      <div>
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
          Workflow Name
        </label>
        <input
          type="text"
          value={workflow.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Follow-up on Missed Calls"
          className="w-full px-3 py-2 rounded border border-[#E5E5E0] bg-[#FAFAF8] text-[#1A1A1A] placeholder-[#4A4A4A] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
      </div>

      {/* Trigger Selector */}
      <div>
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
          Trigger
        </label>
        <div className="relative">
          <select
            value={workflow.trigger}
            onChange={(e) =>
              handleTriggerChange(
                e.target.value as Workflow['trigger']
              )
            }
            className="w-full px-3 py-2 rounded border border-[#E5E5E0] bg-[#FAFAF8] text-[#1A1A1A] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] appearance-none cursor-pointer"
          >
            {TRIGGERS.map((trigger) => (
              <option key={trigger.value} value={trigger.value}>
                {trigger.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4A4A4A] pointer-events-none"
          />
        </div>
      </div>

      {/* Steps */}
      <div>
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Steps</h3>
        <div className="space-y-4">
          {workflow.steps.length === 0 ? (
            <p className="text-sm text-[#4A4A4A] py-4">
              No steps added yet. Click &quot;Add step&quot; to get started.
            </p>
          ) : (
            workflow.steps.map((step, index) => (
              <div
                key={step.id}
                className="p-4 border border-[#E5E5E0] rounded-lg bg-white space-y-4"
              >
                {/* Step Header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-primary)] text-[#FAFAF8] font-semibold text-sm">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => handleRemoveStep(step.id)}
                    className="ml-auto p-1 hover:bg-[#E5E5E0] rounded transition-colors"
                    aria-label="Remove step"
                  >
                    <X size={18} className="text-[#4A4A4A]" />
                  </button>
                </div>

                {/* Channel */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Channel
                  </label>
                  <div className="relative">
                    <select
                      value={step.channel}
                      onChange={(e) =>
                        handleUpdateStep(step.id, {
                          channel: e.target.value as WorkflowStep['channel'],
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-[#E5E5E0] bg-white text-[#1A1A1A] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] appearance-none cursor-pointer text-sm"
                    >
                      {CHANNELS.map((channel) => (
                        <option key={channel.value} value={channel.value}>
                          {channel.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4A4A4A] pointer-events-none"
                    />
                  </div>
                </div>

                {/* Delay */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Delay
                    </label>
                    <input
                      type="number"
                      value={step.delay}
                      onChange={(e) =>
                        handleUpdateStep(step.id, {
                          delay: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-[#E5E5E0] bg-white text-[#1A1A1A] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Unit
                    </label>
                    <div className="relative">
                      <select
                        value={step.delayUnit}
                        onChange={(e) =>
                          handleUpdateStep(step.id, {
                            delayUnit: e.target.value as WorkflowStep['delayUnit'],
                          })
                        }
                        className="w-full px-3 py-2 rounded border border-[#E5E5E0] bg-white text-[#1A1A1A] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] appearance-none cursor-pointer text-sm"
                      >
                        {DELAY_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4A4A4A] pointer-events-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Condition
                  </label>
                  <div className="relative">
                    <select
                      value={step.condition}
                      onChange={(e) =>
                        handleUpdateStep(step.id, {
                          condition: e.target.value as WorkflowStep['condition'],
                        })
                      }
                      className="w-full px-3 py-2 rounded border border-[#E5E5E0] bg-white text-[#1A1A1A] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] appearance-none cursor-pointer text-sm"
                    >
                      {CONDITIONS.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4A4A4A] pointer-events-none"
                    />
                  </div>
                </div>

                {/* Message Template */}
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Message
                  </label>
                  <textarea
                    value={step.message}
                    onChange={(e) =>
                      handleUpdateStep(step.id, { message: e.target.value })
                    }
                    placeholder="Enter your message here..."
                    className="w-full px-3 py-2 rounded border border-[#E5E5E0] bg-white text-[#1A1A1A] placeholder-[#4A4A4A] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] text-sm resize-none"
                    rows={3}
                  />

                  {/* Variable Insertion Buttons */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {VARIABLES.map((variable) => (
                      <button
                        key={variable.value}
                        onClick={() =>
                          handleInsertVariable(step.id, variable.value)
                        }
                        className="px-2 py-1 text-xs rounded bg-[#E5E5E0] text-[#1A1A1A] hover:bg-[var(--accent-primary)] hover:text-[#FAFAF8] transition-colors font-medium"
                      >
                        {variable.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Step Button */}
        <button
          onClick={handleAddStep}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded bg-[var(--accent-primary)] hover:bg-[#0a5454] text-[#FAFAF8] font-medium transition-colors"
        >
          <Plus size={16} />
          Add step
        </button>
      </div>

      {/* Stop Conditions */}
      <div className="p-4 border border-[#E5E5E0] rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">
          Stop Conditions
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={workflow.stopConditions.stopOnReply}
              onChange={(e) =>
                handleStopConditionChange('stopOnReply', e.target.checked)
              }
              className="w-4 h-4 rounded border-[#E5E5E0] accent-[var(--accent-primary)] cursor-pointer"
            />
            <span className="text-sm text-[#1A1A1A]">
              Stop when contact replies
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={workflow.stopConditions.stopOnBooked}
              onChange={(e) =>
                handleStopConditionChange('stopOnBooked', e.target.checked)
              }
              className="w-4 h-4 rounded border-[#E5E5E0] accent-[var(--accent-primary)] cursor-pointer"
            />
            <span className="text-sm text-[#1A1A1A]">
              Stop when appointment booked
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={workflow.stopConditions.stopOnOptOut}
              onChange={(e) =>
                handleStopConditionChange('stopOnOptOut', e.target.checked)
              }
              className="w-4 h-4 rounded border-[#E5E5E0] accent-[var(--accent-primary)] cursor-pointer"
            />
            <span className="text-sm text-[#1A1A1A]">Stop on opt-out</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded border border-[#E5E5E0] text-[#1A1A1A] hover:bg-[#E5E5E0] transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded bg-[var(--accent-primary)] hover:bg-[#0a5454] text-[#FAFAF8] font-medium transition-colors"
        >
          Save Workflow
        </button>
      </div>
    </div>
  );
}
