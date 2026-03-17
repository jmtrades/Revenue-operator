-- Seed industry_templates table with production-quality data for launch verticals.
-- Safe to run: Uses INSERT OR REPLACE to allow re-runs without errors.

INSERT INTO revenue_operator.industry_templates (
  industry_slug,
  name,
  description,
  default_greeting,
  default_scripts,
  default_faq,
  default_follow_up_cadence,
  recommended_features
) VALUES

-- 1. DENTAL
(
  'dental',
  'Dental Practice',
  'AI receptionist for dental offices: handle patient scheduling, insurance questions, emergency triage, and recall reminders',
  'Thanks for calling [Practice Name]. This is our AI assistant. Are you a new patient or calling about an existing appointment?',
  '[
    {
      "name": "Appointment Scheduling",
      "trigger": "Patient requests appointment",
      "content": "Id be happy to help schedule your appointment. Are you looking for a cleaning, exam, or specific procedure? What day and time work best for you? I can book you with Dr. [Name] on [Available Slots]."
    },
    {
      "name": "Insurance Questions",
      "trigger": "Patient asks about insurance",
      "content": "We accept most major insurance plans. Can you tell me your insurance provider? I can verify your coverage and let you know what your out-of-pocket cost would be for your visit."
    },
    {
      "name": "Emergency Triage",
      "trigger": "Patient reports pain or emergency",
      "content": "I understand youre in pain. Can you describe where it hurts? Are you experiencing severe pain, swelling, or trauma? If this is a severe emergency, please hang up and call 911. Otherwise, Ill get you our emergency line."
    },
    {
      "name": "Recall Reminders",
      "trigger": "Automated outbound campaign",
      "content": "Hi [Patient Name], this is a friendly reminder that youre due for your 6-month cleaning and exam at [Practice Name]. Would you like to schedule your appointment? We have availability next week."
    }
  ]',
  '[
    {
      "q": "What are your office hours?",
      "a": "Monday-Thursday 8am-5pm, Friday 8am-2pm, Saturday 9am-1pm. We are closed Sundays and major holidays."
    },
    {
      "q": "What insurance do you accept?",
      "a": "We accept most major plans including Deltacare, Aetna, United, Cigna, Anthem, and more. Call us to verify your specific plan."
    },
    {
      "q": "Do you handle emergency dental issues?",
      "a": "Yes, we reserve same-day emergency slots. For severe emergencies after hours, we can refer you to our emergency partner or advise you to visit an ER."
    },
    {
      "q": "What is your new patient process?",
      "a": "New patients start with a comprehensive exam and X-rays. Please arrive 10 minutes early to complete paperwork. We recommend starting with a cleaning within 1-2 weeks."
    },
    {
      "q": "Do you offer payment plans?",
      "a": "Yes, we partner with CareCredit, Lending Club, and offer in-house payment plans for treatment over $1000."
    }
  ]',
  '[
    {
      "name": "Appointment Reminder",
      "triggers": ["appointment_scheduled"],
      "steps": [
        { "days_before": 2, "channel": "sms", "message": "Reminder: Your appointment with [Doctor] is in 2 days at [Time]. Reply CONFIRM or call us to reschedule." },
        { "days_before": 0.08, "channel": "sms", "message": "Reminder: Your appointment is in 2 hours at [Time]. We look forward to seeing you!" }
      ]
    },
    {
      "name": "No-Show Recovery",
      "triggers": ["appointment_missed"],
      "steps": [
        { "minutes_after": 30, "channel": "call", "message": "Hi [Patient], we noticed you missed your appointment. Was there an issue? We want to reschedule you." },
        { "hours_after": 4, "channel": "sms", "message": "We noticed you missed your appointment today. Please call us to reschedule at your earliest convenience." }
      ]
    },
    {
      "name": "6-Month Recall Campaign",
      "triggers": ["recall_due"],
      "steps": [
        { "days_after_last_visit": 180, "channel": "sms", "message": "[Patient Name], its time for your 6-month cleaning and exam. Reply with your preferred time." },
        { "days_after_first": 7, "channel": "call", "message": "Hi [Patient], this is a reminder that youre due for your cleaning. Can I schedule you?" },
        { "days_after_first": 14, "channel": "sms", "message": "Last chance! Schedule your 6-month cleaning before your benefits reset. Call us today." }
      ]
    }
  ]',
  ARRAY['appointment_booking', 'reminders', 'no_show_recovery', 'patient_reactivation', 'review_requests']
),

-- 2. HVAC
(
  'hvac',
  'HVAC & Home Services',
  'AI dispatcher for HVAC and home service companies: handle emergency dispatch, service scheduling, estimate follow-ups, and seasonal maintenance',
  'Thanks for calling [Company Name]. This is our AI dispatcher. Do you have an existing appointment or need emergency service?',
  '[
    {
      "name": "Service Scheduling",
      "trigger": "Customer requests service",
      "content": "I can help schedule your service visit. What type of service do you need? HVAC, plumbing, electrical, or general maintenance? And how soon do you need us? We can often get someone out same-day or next available."
    },
    {
      "name": "Emergency Dispatch",
      "trigger": "Customer reports emergency",
      "content": "I understand this is urgent. Are you without heat in winter or AC in summer? Tell me your location and I'll dispatch our emergency team. Your service call will incur an emergency fee of $99."
    },
    {
      "name": "Estimate Follow-Up",
      "trigger": "Customer calls about quote",
      "content": "Thanks for following up on your estimate. Did you have any questions about the pricing or scope of work? I can email you a new copy or we can discuss your options for financing the work."
    },
    {
      "name": "Maintenance Reminders",
      "trigger": "Seasonal campaign trigger",
      "content": "Hi [Customer], its time for your seasonal HVAC maintenance check. Regular tune-ups prevent breakdowns and save you money. Can I schedule you for a spring or fall cleaning?"
    }
  ]',
  '[
    {
      "q": "What service areas do you cover?",
      "a": "We service [City Name] and surrounding areas within [20-mile radius]. Service outside our area may include travel fees."
    },
    {
      "q": "Are you available for emergency calls?",
      "a": "Yes, 24/7 emergency service available. Emergency calls after 6pm incur a $99 emergency fee plus service charges."
    },
    {
      "q": "What are your pricing ranges?",
      "a": "Service calls start at $79-99 depending on complexity. Repairs average $300-800. We provide free estimates on all replacement systems."
    },
    {
      "q": "Do you offer warranties?",
      "a": "All work includes a 1-year labor warranty. Equipment carries manufacturer warranty (typically 5-10 years). Extended warranties available."
    },
    {
      "q": "Do you work with insurance for storm damage?",
      "a": "Yes, we handle all hail and wind damage claims. We work directly with insurance companies to get your system replaced or repaired."
    }
  ]',
  '[
    {
      "name": "Estimate Follow-Up",
      "triggers": ["estimate_sent"],
      "steps": [
        { "hours_after": 2, "channel": "sms", "message": "Got your estimate? Any questions about pricing or next steps? Reply YES to book the work." },
        { "hours_after": 24, "channel": "call", "message": "Hi [Customer], just checking in on your estimate. Ready to move forward?" },
        { "hours_after": 72, "channel": "sms", "message": "Estimate expires in 7 days. Lock in this price now!" }
      ]
    },
    {
      "name": "Seasonal Maintenance",
      "triggers": ["spring_campaign", "fall_campaign"],
      "steps": [
        { "channel": "sms", "message": "[Season] is here! Schedule your HVAC maintenance to prevent summer/winter emergencies. Special: $79 tune-up." },
        { "days_after": 7, "channel": "call", "message": "Hi, just following up on seasonal maintenance. Ready to schedule?" },
        { "days_after": 14, "channel": "sms", "message": "[Season] maintenance special ending soon. Book today!" }
      ]
    }
  ]',
  ARRAY['appointment_booking', 'estimate_chase', 'emergency_routing', 'seasonal_campaigns']
),

-- 3. LEGAL
(
  'legal',
  'Legal Intake',
  'AI intake coordinator for law firms: handle client qualification, case type routing, consultation scheduling, and conflict checks',
  'Thank you for contacting [Law Firm Name]. This is our intake assistant. I''ll help get your information and connect you with an attorney. What is your legal matter regarding?',
  '[
    {
      "name": "Intake Qualification",
      "trigger": "New caller with legal matter",
      "content": "I understand youre dealing with a [case type] issue. Can you briefly describe what happened? When did it occur? This helps us determine if this is within our area of practice and route you to the right attorney."
    },
    {
      "name": "Case Type Routing",
      "trigger": "Intake information gathered",
      "content": "Based on what youve shared, this is a [specific practice area] matter. We have specialists in this area. Let me get your contact information and schedule a consultation with [Attorney Name]."
    },
    {
      "name": "Consultation Scheduling",
      "trigger": "Client ready to book",
      "content": "Great. Would you prefer a phone, video, or in-person consultation? We have availability [dates/times]. All initial consultations are [free/fee amount]. You can also request a specific attorney."
    },
    {
      "name": "Conflict Check Prompt",
      "trigger": "Before scheduling",
      "content": "Before we proceed, I need to verify one thing for conflict-of-interest purposes. Are you or your matter connected to [opposing party names if known] or are you representing both sides?"
    }
  ]',
  '[
    {
      "q": "What practice areas do you specialize in?",
      "a": "We practice in Family Law, Personal Injury, Real Estate, Business Formation, and Criminal Defense. Each attorney specializes in specific areas within these."
    },
    {
      "q": "What are your consultation fees?",
      "a": "Initial consultations are free for qualified matters. Retainer agreements start at [amount] and vary by case complexity. We offer flexible payment plans."
    },
    {
      "q": "How long does the legal process take?",
      "a": "Timeline varies greatly by case type. Simple matters: 30-60 days. Contested cases: 6-18 months. We provide timelines after our initial consultation."
    },
    {
      "q": "Is our communication confidential?",
      "a": "Absolutely. All client communications are protected by attorney-client privilege and remain completely confidential."
    },
    {
      "q": "Do you take payment plans?",
      "a": "Yes, we offer flexible payment plans, accept credit cards, and work with legal financing companies."
    }
  ]',
  '[
    {
      "name": "Intake Follow-Up",
      "triggers": ["intake_completed"],
      "steps": [
        { "minutes_after": 60, "channel": "sms", "message": "Thank you for your intake. [Attorney Name] will review your case and call you within 24 hours." },
        { "hours_after": 24, "channel": "call", "message": "[Attorney Name] from [Law Firm] calling to discuss your legal matter." }
      ]
    },
    {
      "name": "Consultation Reminders",
      "triggers": ["consultation_scheduled"],
      "steps": [
        { "hours_before": 24, "channel": "sms", "message": "Reminder: Consultation with [Attorney] tomorrow at [time]. Have any documents ready." },
        { "minutes_before": 120, "channel": "sms", "message": "Consultation in 2 hours. Have your case details and questions ready." }
      ]
    },
    {
      "name": "Retainer Follow-Up",
      "triggers": ["retainer_sent"],
      "steps": [
        { "hours_after": 48, "channel": "call", "message": "[Attorney Name] calling to discuss your retainer agreement and next steps." },
        { "days_after": 3, "channel": "sms", "message": "Ready to move forward? Sign your retainer agreement to get started." }
      ]
    }
  ]',
  ARRAY['intake_qualification', 'consultation_booking', 'case_routing', 'document_collection']
),

-- 4. MED SPA
(
  'medspa',
  'Med Spa & Aesthetics',
  'AI concierge for med spas: handle luxury consultation booking, treatment inquiries, pre/post-care instructions, and membership upselling',
  'Welcome to [Med Spa Name]. This is [Assistant Name], your aesthetic concierge. Are you looking to book a consultation or inquire about our treatments?',
  '[
    {
      "name": "Consultation Booking",
      "trigger": "New client inquiry",
      "content": "We''d love to help you achieve your aesthetic goals. What concerns would you like to address—wrinkles, volume loss, skin texture, or something else? Our specialists offer complimentary consultations to discuss your options."
    },
    {
      "name": "Treatment Inquiry",
      "trigger": "Client asks about specific treatment",
      "content": "Our [Treatment Name] treatment is perfect for that. It uses [technology] to achieve [results]. Results typically appear in [timeline], and the procedure takes [duration]. The investment is [price]. Shall we schedule your consultation?"
    },
    {
      "name": "Pre-Treatment Instructions",
      "trigger": "Consultation booked",
      "content": "Your appointment is [date/time]. Before your treatment, please avoid sun exposure, retinoids, and blood thinners for [number] days. We''ll send you complete pre-care instructions via email."
    },
    {
      "name": "Membership Upsell",
      "trigger": "First treatment discussion",
      "content": "Many of our clients love our membership program. You save 20-30% on treatments and get priority booking. We have monthly and annual options. Would you like more details?"
    }
  ]',
  '[
    {
      "q": "What treatments do you offer?",
      "a": "We offer Botox, dermal fillers, laser skin resurfacing, microneedling, chemical peels, and body contouring. Each treatment is customized to your goals."
    },
    {
      "q": "How much do treatments cost?",
      "a": "Consultations are complimentary. Treatments range from $300 (peels) to $2000+ (procedures). We offer package pricing and memberships for savings."
    },
    {
      "q": "Is there downtime?",
      "a": "Most treatments have minimal downtime. Injectables: 24 hours. Lasers: 3-7 days. We provide detailed aftercare to minimize redness or swelling."
    },
    {
      "q": "What is your consultation process?",
      "a": "Your complimentary consultation includes a skin analysis, discussion of goals, and a customized treatment plan with pricing. No pressure to book immediately."
    },
    {
      "q": "Do you offer memberships?",
      "a": "Yes! Our membership saves 20-30% on treatments, includes priority booking, and comes with exclusive perks. Great for regular clients."
    }
  ]',
  '[
    {
      "name": "Consultation Reminder",
      "triggers": ["consultation_booked"],
      "steps": [
        { "hours_before": 24, "channel": "sms", "message": "Your consultation with [Provider] is tomorrow at [time]. Come makeup-free if possible. Any questions?" },
        { "minutes_before": 30, "channel": "sms", "message": "See you in 30 minutes! We''re excited to help you look your best." }
      ]
    },
    {
      "name": "Post-Treatment Check-In",
      "triggers": ["treatment_completed"],
      "steps": [
        { "hours_after": 24, "channel": "sms", "message": "How are you feeling after your treatment? Reply with any concerns. Remember: avoid sun and follow your aftercare plan." },
        { "days_after": 7, "channel": "call", "message": "[Provider] calling to check your results and answer any questions about your aftercare." }
      ]
    },
    {
      "name": "Reactivation Campaign",
      "triggers": ["inactive_90_days"],
      "steps": [
        { "channel": "sms", "message": "We miss you, [Client]! Your next treatment is waiting. Book now and get 20% off your next service." },
        { "days_after": 14, "channel": "email", "message": "Refresh your glow! See what''s new at our spa. Schedule your appointment—your aesthetic goals matter." }
      ]
    }
  ]',
  ARRAY['consultation_booking', 'treatment_reminders', 'reactivation', 'review_requests', 'membership_upsell']
),

-- 5. REAL ESTATE
(
  'real-estate',
  'Real Estate',
  'AI agent for real estate teams: handle instant lead qualification, showing scheduling, property inquiries, and market updates',
  'Hi, thanks for calling [Agent/Team Name]. Im your AI assistant. Are you looking to buy a home, sell a property, or just curious about the market?',
  '[
    {
      "name": "Buyer Qualification",
      "trigger": "Caller interested in buying",
      "content": "Great! Im excited to help you find your next home. What price range are you targeting? What areas interest you? And are you pre-approved with a lender? This helps me show you homes that fit your timeline."
    },
    {
      "name": "Seller Inquiry",
      "trigger": "Caller wants to sell",
      "content": "Perfect, Ill get you a free home valuation and discuss our marketing strategy. What area is your home in? When are you looking to list? Do you have a mortgage you need to pay off?"
    },
    {
      "name": "Showing Scheduling",
      "trigger": "Client wants to see property",
      "content": "Id love to show you [Address]. Its available for showings [times]. Which time works best for you? The home features [key details]. Let me lock in your showing time."
    },
    {
      "name": "Market Update",
      "trigger": "Lead nurturing campaign",
      "content": "Thought youd like to know: [Area] homes are averaging [price/stats]. If youre thinking about selling, now is a great time. [Agent Name] is offering free home evaluations this week."
    }
  ]',
  '[
    {
      "q": "What areas do you serve?",
      "a": "We specialize in [City/County/Metro Area] with expertise in neighborhoods including [list neighborhoods]. We can assist anywhere in the state."
    },
    {
      "q": "What is your buying process?",
      "a": "We help you get pre-approved, search homes that match your criteria, schedule showings, make offers, and navigate closing. Expect 30-90 days from offer to closing."
    },
    {
      "q": "How do you help me sell?",
      "a": "We provide a free home evaluation, create a marketing strategy, list your home, schedule showings, negotiate offers, and handle closing. We typically sell homes in [30-60 days]."
    },
    {
      "q": "What are your commission rates?",
      "a": "Our buyer agent commission is typically 2.5% (paid by seller). Selling your home is [rate]% commission. Volume discounts available."
    },
    {
      "q": "Do you have properties available now?",
      "a": "Yes! We have [number] homes currently listed in your price range and area of interest. Id be happy to send you detailed listings."
    }
  ]',
  '[
    {
      "name": "Instant Lead Response",
      "triggers": ["lead_created"],
      "steps": [
        { "minutes_after": 5, "channel": "sms", "message": "Thanks for your interest! [Agent Name] will follow up with homes matching your criteria within the hour." }
      ]
    },
    {
      "name": "Showing Follow-Up",
      "triggers": ["showing_completed"],
      "steps": [
        { "minutes_after": 120, "channel": "sms", "message": "Thanks for the showing! What did you think? Ready to make an offer or see more homes?" },
        { "hours_after": 24, "channel": "call", "message": "[Agent Name] calling to discuss the property and answer any questions." }
      ]
    },
    {
      "name": "Weekly Nurture",
      "triggers": ["lead_nurture_campaign"],
      "steps": [
        { "days_after": 0, "channel": "email", "message": "Weekly market update: [New listings in your area]. Which homes interest you?" },
        { "days_after": 3, "channel": "sms", "message": "Market heating up! New listings in your price range. Check your email for details." }
      ]
    }
  ]',
  ARRAY['instant_response', 'showing_booking', 'drip_campaigns', 'market_updates']
),

-- 6. ROOFING
(
  'roofing',
  'Roofing & Restoration',
  'AI dispatcher for roofing companies: handle storm damage urgency, inspection scheduling, insurance claims, and estimate follow-ups',
  'Thank you for calling [Roofing Company]. This is our emergency dispatcher. Did your roof sustain storm damage or are you calling about routine maintenance?',
  '[
    {
      "name": "Inspection Scheduling",
      "trigger": "Customer requests inspection",
      "content": "Id like to get you scheduled for an inspection right away. Is the damage from a recent storm, hail, wind, or a leak? I can send an inspector out today or tomorrow. Whats your address?"
    },
    {
      "name": "Insurance Claim Guidance",
      "trigger": "Customer mentions insurance",
      "content": "We work with insurance companies regularly. Heres how it works: We document the damage, you file a claim, insurance approves, and we repair. We can handle all the paperwork and communicate directly with your adjuster."
    },
    {
      "name": "Estimate Follow-Up",
      "trigger": "Customer calls about quote",
      "content": "Thanks for following up on your estimate. Did you have questions about the work or pricing? Have you heard back from your insurance yet? I can discuss financing options or lock in the price."
    },
    {
      "name": "Annual Inspection Reminder",
      "trigger": "Seasonal maintenance campaign",
      "content": "Hi [Customer], its been a year since we inspected your roof. Id recommend a free annual inspection before storm season to catch any issues early."
    }
  ]',
  '[
    {
      "q": "How do I know if I need a roof replacement?",
      "a": "Common signs: shingles are curling/missing, leaks in attic, sagging, or moss/algae growth. A free inspection tells you if repair or replacement is needed."
    },
    {
      "q": "How does insurance work for hail/storm damage?",
      "a": "File a claim with your insurer. We provide documentation of damage. Most policies cover hail damage. There may be a deductible ($500-$2000 typical)."
    },
    {
      "q": "How long does a roof replacement take?",
      "a": "Most roofs take 1-3 days depending on size and complexity. We work efficiently and clean up after ourselves."
    },
    {
      "q": "What warranties do you offer?",
      "a": "We offer a 10-year workmanship warranty on all installations. Shingles come with manufacturer warranty (20-30 years typically)."
    },
    {
      "q": "Are you available for emergency tarping?",
      "a": "Yes! We offer emergency tarping service 24/7 to prevent water damage until a full repair/replacement is completed."
    }
  ]',
  '[
    {
      "name": "Inspection Follow-Up",
      "triggers": ["inspection_completed"],
      "steps": [
        { "hours_after": 2, "channel": "sms", "message": "Thanks for letting us inspect. Well send your estimate within 24 hours. Questions?" },
        { "hours_after": 24, "channel": "call", "message": "[Inspector Name] calling to review the inspection findings and discuss next steps." }
      ]
    },
    {
      "name": "Estimate Chase",
      "triggers": ["estimate_sent"],
      "steps": [
        { "hours_after": 24, "channel": "sms", "message": "Got your estimate? Questions about pricing? Reply YES to book the work immediately." },
        { "hours_after": 72, "channel": "call", "message": "[Company] following up—ready to move forward with repairs?" },
        { "days_after": 7, "channel": "sms", "message": "Estimate expires soon! Lock in this price today." }
      ]
    },
    {
      "name": "Annual Inspection",
      "triggers": ["annual_maintenance_due"],
      "steps": [
        { "channel": "sms", "message": "Its time for your annual roof inspection. Were seeing heavy storm season—get ahead with a free inspection." },
        { "days_after": 7, "channel": "call", "message": "[Company] calling to schedule your yearly inspection." }
      ]
    }
  ]',
  ARRAY['inspection_booking', 'estimate_chase', 'insurance_guidance', 'storm_campaigns']
),

-- 7. RECRUITING
(
  'recruiting',
  'Recruiting & Staffing',
  'AI recruiter for staffing agencies: handle candidate screening, interview scheduling, offer follow-ups, and reference collection',
  'Hello, thank you for your interest in [Recruiting Firm]. This is our recruiting assistant. Are you applying for a position or calling about your interview?',
  '[
    {
      "name": "Candidate Screening",
      "trigger": "New application received",
      "content": "Thanks for applying for the [Position] role. Let me ask you a few quick qualifying questions. How many years of [relevant] experience do you have? Are you available to start by [date]? What is your salary expectation?"
    },
    {
      "name": "Interview Scheduling",
      "trigger": "Candidate passes screening",
      "content": "Great news! Youve been selected for an interview with [Hiring Manager]. We have availability [times/dates]. This is a [phone/video/in-person] interview. Which time works best?"
    },
    {
      "name": "Offer Follow-Up",
      "trigger": "Offer extended",
      "content": "Congratulations! [Company] is pleased to offer you the [Position] role at [Compensation]. You have until [date] to accept. Do you have questions about the offer, benefits, or start date?"
    },
    {
      "name": "Reference Collection",
      "trigger": "Pre-employment",
      "content": "We need 3 professional references before we can finalize your offer. Please provide names, titles, phone numbers, and how they know you. Can you send this information by [date]?"
    }
  ]',
  '[
    {
      "q": "What positions do you currently have available?",
      "a": "We recruit for [roles/departments]: Engineering, Sales, Marketing, Operations, and Support. Check our website or call to hear about current openings."
    },
    {
      "q": "What is your hiring process and timeline?",
      "a": "Application → Screening call (24h) → Interview (3-5 days) → Offer (2-3 days) → Start date (2-4 weeks). Fast-track roles may move quicker."
    },
    {
      "q": "What qualifications do you require?",
      "a": "Requirements vary by role. We look for relevant experience, skills, cultural fit, and growth potential. Entry-level to senior roles available."
    },
    {
      "q": "Do you offer contract or permanent roles?",
      "a": "Both! Direct hire permanent positions and contract-to-hire assignments. Contract roles typically lead to permanent placement."
    },
    {
      "q": "How do I apply?",
      "a": "Submit your resume and cover letter on our website, or email us directly. You can also call to apply over the phone for immediate consideration."
    }
  ]',
  '[
    {
      "name": "Application Follow-Up",
      "triggers": ["application_received"],
      "steps": [
        { "hours_after": 24, "channel": "sms", "message": "[Recruiter] from [Agency] calling about your [Position] application. We''d like to move you forward!" }
      ]
    },
    {
      "name": "Interview Reminders",
      "triggers": ["interview_scheduled"],
      "steps": [
        { "hours_before": 24, "channel": "sms", "message": "Reminder: Interview with [Hiring Manager] tomorrow at [time]. Well send you the [Zoom/location] details in an email." },
        { "minutes_before": 120, "channel": "sms", "message": "Interview in 2 hours. Gather your questions and join the Zoom link." }
      ]
    },
    {
      "name": "Offer Follow-Up",
      "triggers": ["offer_extended"],
      "steps": [
        { "hours_after": 48, "channel": "call", "message": "[Recruiter] following up on your offer. Any questions about compensation, start date, or benefits?" },
        { "days_after": 7, "channel": "sms", "message": "Offer expires [date]. Ready to accept and start your new role?" }
      ]
    }
  ]',
  ARRAY['candidate_screening', 'interview_booking', 'offer_tracking', 'pipeline_management']
),

-- 8. COACHING
(
  'coaching',
  'Coaching & Consulting',
  'AI concierge for coaches and consultants: handle discovery call booking, program inquiry, objection handling, and enrollment follow-up',
  'Hi there! Welcome. This is [Assistant] with [Coach Name]. Im here to help you figure out if coaching is right for you. What brings you here today?',
  '[
    {
      "name": "Discovery Call Booking",
      "trigger": "Prospect expresses interest",
      "content": "Perfect! A discovery call is the best way to see if were a good fit. We''ll discuss your goals, challenges, and how [Coach Name] can help. Discovery calls are 30 minutes, complimentary, and help us both decide if working together makes sense."
    },
    {
      "name": "Program Inquiry",
      "trigger": "Prospect asks about offerings",
      "content": "We offer several programs: [Program 1] for [outcome], [Program 2] for [outcome], and [Program 3] for [outcome]. Each is customized. A discovery call will help us recommend the best fit for your situation."
    },
    {
      "name": "Objection Handling",
      "trigger": "Prospect hesitates",
      "content": "I hear you. Many people worry about [cost/time/results]. Heres what I know: [Coach Name] has [results/testimonials]. A discovery call is free and zero pressure. What if it changed your trajectory?"
    },
    {
      "name": "Enrollment Follow-Up",
      "trigger": "Post-discovery",
      "content": "Did you enjoy the call with [Coach Name]? Are you ready to move forward? We can schedule your first session and discuss payment options—we offer payment plans."
    }
  ]',
  '[
    {
      "q": "What programs do you offer?",
      "a": "We offer 1-on-1 coaching, group programs, and workshops. Topics include [areas]. Each program is tailored to your specific goals."
    },
    {
      "q": "How much does coaching cost?",
      "a": "Pricing ranges from [amount for 1-on-1] to [amount for group] depending on depth and duration. We offer payment plans and often see ROI within 30-60 days."
    },
    {
      "q": "What results should I expect?",
      "a": "Results vary based on your commitment and goals. Typical outcomes: [specific results]. Our clients report [transformation]. Success stories available upon request."
    },
    {
      "q": "How do I schedule a discovery call?",
      "a": "Its simple! Reply to schedule a 30-minute discovery call at [link]. No credit card needed. We discuss your situation and recommend the best program for you."
    },
    {
      "q": "What if I''m not sure coaching is for me?",
      "a": "The discovery call is designed to help you decide. [Coach Name] has a [guarantee/refund policy]. Many coaches offer a 30-day money-back guarantee if unsatisfied."
    }
  ]',
  '[
    {
      "name": "Discovery Follow-Up",
      "triggers": ["discovery_call_completed"],
      "steps": [
        { "minutes_after": 120, "channel": "sms", "message": "Thanks for the great call with [Coach]. Heres the link to your recap and next steps: [link]" },
        { "hours_after": 24, "channel": "email", "message": "[Coach Name] wanted to send you your discovery call notes and the program recommendation. Ready to get started?" }
      ]
    },
    {
      "name": "Enrollment Follow-Up",
      "triggers": ["enrollment_decision_pending"],
      "steps": [
        { "hours_after": 48, "channel": "call", "message": "[Coach Name] calling to answer any remaining questions about the program. Ready to start?" },
        { "days_after": 7, "channel": "sms", "message": "Still thinking about it? [Coach] has one spot opening up. Enrollment available through [date]." }
      ]
    },
    {
      "name": "Client Check-In",
      "triggers": ["enrolled"],
      "steps": [
        { "days_after": 30, "channel": "call", "message": "[Coach] checking in on your progress. How are you doing? Any wins or challenges?" },
        { "days_after": 60, "channel": "sms", "message": "Halfway through your program! Reflecting on your wins so far? Lets celebrate progress in your next session." }
      ]
    }
  ]',
  ARRAY['discovery_booking', 'enrollment_tracking', 'client_reminders', 'testimonial_requests']
)

ON CONFLICT (industry_slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_greeting = EXCLUDED.default_greeting,
  default_scripts = EXCLUDED.default_scripts,
  default_faq = EXCLUDED.default_faq,
  default_follow_up_cadence = EXCLUDED.default_follow_up_cadence,
  recommended_features = EXCLUDED.recommended_features,
  updated_at = now();

-- Verify seed success
SELECT COUNT(*) as template_count FROM revenue_operator.industry_templates;
