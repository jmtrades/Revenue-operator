'use client';

import { useState } from 'react';
import {
  Wrench,
  Stethoscope,
  Scale,
  Sparkles,
  Droplets,
  Home,
  Building,
  GraduationCap,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { useWorkspace } from '@/components/WorkspaceContext';

interface Template {
  id: string;
  name: string;
  industry: string;
  icon: React.ReactNode;
  templateCount: number;
  greeting: {
    title: string;
    content: string;
  };
  description: string;
  isPaid: boolean;
}

interface PreviewModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
}

const TEMPLATES: Template[] = [
  {
    id: 'hvac',
    name: 'HVAC & Mechanical',
    industry: 'HVAC & Mechanical',
    icon: <Wrench className="w-8 h-8" />,
    templateCount: 12,
    greeting: {
      title: 'Initial Greeting',
      content:
        'Hi {{firstName}}, thanks for reaching out about your HVAC needs! We specialize in heating, cooling, and maintenance for residential and commercial properties. How can we assist you today?',
    },
    description: 'Greeting templates, FAQ sequences, and follow-up automation for HVAC services',
    isPaid: false,
  },
  {
    id: 'dental',
    name: 'Dental & Orthodontics',
    industry: 'Dental & Orthodontics',
    icon: <Stethoscope className="w-8 h-8" />,
    templateCount: 15,
    greeting: {
      title: 'Patient Welcome',
      content:
        "Welcome {{firstName}}! We're excited to support your dental health journey. Whether it's routine care, cosmetic dentistry, or orthodontic treatment, our team is here to help. What brings you in today?",
    },
    description: 'Patient-focused templates for appointments, follow-ups, and care instructions',
    isPaid: false,
  },
  {
    id: 'legal',
    name: 'Legal & Consulting',
    industry: 'Legal & Consulting',
    icon: <Scale className="w-8 h-8" />,
    templateCount: 18,
    greeting: {
      title: 'Professional Greeting',
      content:
        'Hello {{firstName}}, thank you for contacting our legal practice. We handle matters with the utmost professionalism and confidentiality. Please share details about your situation so we can provide appropriate guidance.',
    },
    description: 'Professional and compliance-aware templates for legal and consulting services',
    isPaid: true,
  },
  {
    id: 'medspa',
    name: 'Med Spa & Beauty',
    industry: 'Med Spa & Beauty',
    icon: <Sparkles className="w-8 h-8" />,
    templateCount: 14,
    greeting: {
      title: 'Spa Welcome',
      content:
        'Hi {{firstName}}, welcome to our spa family! We offer personalized skincare, rejuvenation treatments, and beauty services tailored to you. Ready to discover your glow? Let\'s book your perfect appointment!',
    },
    description: 'Appointment and rebooking templates focused on client retention and upsells',
    isPaid: false,
  },
  {
    id: 'plumbing',
    name: 'Plumbing & Electrical',
    industry: 'Plumbing & Electrical',
    icon: <Droplets className="w-8 h-8" />,
    templateCount: 11,
    greeting: {
      title: 'Emergency Response',
      content:
        'Hi {{firstName}}, thanks for contacting us! We understand plumbing and electrical issues need fast attention. Our team is ready to help with emergency service, repairs, or installations. What\'s the problem?',
    },
    description: 'Emergency-aware templates with rapid response protocols and scheduling',
    isPaid: false,
  },
  {
    id: 'roofing',
    name: 'Roofing & Contracting',
    industry: 'Roofing & Contracting',
    icon: <Home className="w-8 h-8" />,
    templateCount: 16,
    greeting: {
      title: 'Project Inquiry',
      content:
        'Hello {{firstName}}, thanks for reaching out to us for your roofing and contracting needs. We provide comprehensive assessments, quality workmanship, and transparent estimates. Tell us about your project!',
    },
    description: 'Estimate and inspection scheduling templates with project tracking',
    isPaid: true,
  },
  {
    id: 'realestate',
    name: 'Real Estate & Agencies',
    industry: 'Real Estate & Agencies',
    icon: <Building className="w-8 h-8" />,
    templateCount: 19,
    greeting: {
      title: 'Lead Qualification',
      content:
        'Hi {{firstName}}, thanks for your interest in our real estate services! Whether you\'re buying, selling, or investing, we\'re here to guide you. What property goals can we help you achieve?',
    },
    description: 'Lead qualification and pipeline management templates for real estate professionals',
    isPaid: false,
  },
  {
    id: 'coaching',
    name: 'Coaching & Training',
    industry: 'Coaching & Training',
    icon: <GraduationCap className="w-8 h-8" />,
    templateCount: 13,
    greeting: {
      title: 'Coaching Intro',
      content:
        "Hey {{firstName}}, excited to work together! I'm here to help you achieve your goals through personalized coaching and training. Let's schedule a consultation to discuss your aspirations and create your success plan.",
    },
    description: 'Consultation booking and engagement templates for coaches and trainers',
    isPaid: false,
  },
];

function PreviewModal({ template, isOpen, onClose }: PreviewModalProps) {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-[var(--bg-surface)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-label={`Preview ${template.name} template`}
      >
        <div className="p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-[var(--accent-primary)]">{template.icon}</div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {template.name}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {template.templateCount} included templates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Template Preview
            </h3>
            <div className="bg-[var(--bg-primary)] p-4 rounded-lg border border-[var(--border-default)]">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                {template.greeting.title}
              </p>
              <p className="text-[var(--text-primary)] leading-relaxed">
                {template.greeting.content}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Includes
            </h3>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                Initial greeting and response templates
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                FAQ sequences tailored to your industry
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                Follow-up and nurture automation
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
                Fully customizable for your brand
              </li>
            </ul>
          </div>

          {template.isPaid && (
            <div className="bg-[var(--bg-card)]/60 border border-[var(--border-default)] p-3 rounded-lg">
              <p className="text-sm text-blue-300">
                Available with Business+ plan - includes priority support and advanced analytics
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[var(--border-default)] bg-[var(--bg-primary)]">
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onPreview,
  onActivate,
  isActivating,
}: {
  template: Template;
  onPreview: (template: Template) => void;
  onActivate: (templateId: string) => void;
  isActivating: boolean;
}) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 hover:border-[var(--accent-primary)] transition-colors flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-[var(--accent-primary)]">{template.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {template.name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {template.templateCount} templates
            </p>
          </div>
        </div>
        {template.isPaid && (
          <span className="inline-block px-2.5 py-1 text-xs font-medium bg-[var(--bg-card)]/60 text-[var(--text-secondary)] border border-[var(--border-default)] rounded whitespace-nowrap ml-2">
            Business+
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4 flex-1">
        {template.description}
      </p>

      <div className="space-y-3">
        <button
          onClick={() => onPreview(template)}
          className="w-full px-4 py-2 text-sm font-medium text-[var(--accent-primary)] bg-[var(--bg-primary)] border border-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
        >
          Preview Template
        </button>
        <button
          onClick={() => onActivate(template.id)}
          disabled={isActivating}
          className="w-full px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isActivating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Activating...
            </>
          ) : (
            'Activate'
          )}
        </button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { workspaceId } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activatedIds, setActivatedIds] = useState<Set<string>>(new Set());

  const filteredTemplates = TEMPLATES.filter((template) => {
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.industry.toLowerCase().includes(query)
    );
  });

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setTimeout(() => setSelectedTemplate(null), 300);
  };

  const handleActivate = async (templateId: string) => {
    setActivatingId(templateId);

    try {
      const response = await fetch('/api/templates/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          workspace_id: workspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to activate template: ${response.statusText}`);
      }

      setActivatedIds((prev) => new Set([...prev, templateId]));

      // Show success feedback
      setTimeout(() => {
        setActivatingId(null);
      }, 1000);
    } catch (error) {
      // Show error feedback to user
      setActivatingId(null);
      // TODO: Integrate with toast/error notification system
      // For now, silently fail - activation state will update on next page refresh
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Industry Templates
          </h1>
          <p className="text-[var(--text-secondary)]">
            Choose pre-built templates tailored to your industry. Customize and activate in seconds.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search by industry, feature, or template name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              aria-label="Search templates"
            />
          </div>
        </div>

        {/* Results info */}
        <div className="mb-6">
          <p className="text-sm text-[var(--text-secondary)]">
            {filteredTemplates.length} of {TEMPLATES.length} templates available
            {activatedIds.size > 0 && ` • ${activatedIds.size} activated`}
          </p>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={handlePreview}
                onActivate={handleActivate}
                isActivating={activatingId === template.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No templates found
            </h3>
            <p className="text-[var(--text-secondary)]">
              Try adjusting your search or filters to find templates
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <PreviewModal
        template={selectedTemplate}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />
    </div>
  );
}
