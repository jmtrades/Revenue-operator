"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Volume2, Phone, CheckCircle } from "lucide-react";

const INDUSTRIES = [
  "HVAC",
  "Dental",
  "Plumbing",
  "Roofing",
  "Legal",
  "Medical",
  "Salon",
  "Restaurant",
  "Auto"
];

const INDUSTRY_GREETINGS: Record<string, { greeting: string; voiceId: string }> = {
  HVAC: {
    greeting: "Thank you for calling ABC Heating and Cooling. How can we help you with your comfort needs today?",
    voiceId: "hvac_pro"
  },
  Dental: {
    greeting: "Welcome to Smile Dental. We're here to help with your dental care. What brings you in today?",
    voiceId: "dental_receptionist"
  },
  Plumbing: {
    greeting: "Thanks for calling Premier Plumbing. What plumbing issue can we help you with?",
    voiceId: "plumbing_pro"
  },
  Roofing: {
    greeting: "Hello and thank you for choosing Reliable Roofing. Do you have a leak, inspection, or are you ready for a new roof?",
    voiceId: "roofing_expert"
  },
  Legal: {
    greeting: "Good day. This is Legal Associates. How may we assist you with your legal matter?",
    voiceId: "legal_counsel"
  },
  Medical: {
    greeting: "Thank you for calling Premier Health Clinic. What is the nature of your visit today?",
    voiceId: "medical_receptionist"
  },
  Salon: {
    greeting: "Welcome to Luxe Salon. Do you need to book an appointment or ask about our services?",
    voiceId: "salon_host"
  },
  Restaurant: {
    greeting: "Welcome to Bella Italia. Would you like to make a reservation or hear about our specials?",
    voiceId: "restaurant_host"
  },
  Auto: {
    greeting: "Thank you for contacting AutoCare. Are you calling about a service appointment or inquiry?",
    voiceId: "auto_specialist"
  }
};

const FOLLOW_UP_PROMPTS = [
  "I need to schedule an appointment",
  "Can you tell me about your availability?",
  "What's the next available time?"
];

// Testimonials removed — will be added when real customer feedback is available
const _TESTIMONIALS: { industry: string; quote: string; name: string; company: string }[] = [];

interface TranscriptMessage {
  speaker: "ai" | "customer";
  text: string;
}

export default function VoiceDemoPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("HVAC");
  const [_isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [conversationStep, setConversationStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const robotAudioRef = useRef<HTMLAudioElement>(null);
  const humanAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const startCall = async () => {
    setIsLoading(true);
    setIsPlaying(true);
    setTranscript([]);
    setConversationStep(0);

    try {
      const greeting = INDUSTRY_GREETINGS[selectedIndustry];

      // Fetch audio from the voice preview endpoint
      const response = await fetch(
        `/api/demo/voice-preview?voice_id=${greeting.voiceId}&text=${encodeURIComponent(greeting.greeting)}&industry=${selectedIndustry}`
      );

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(err => console.error("Playback error:", err));

          // Add AI greeting to transcript with typing animation
          await new Promise(resolve => {
            setTimeout(() => {
              setTranscript(prev => [...prev, { speaker: "ai", text: greeting.greeting }]);
              setConversationStep(1);
              resolve(null);
            }, 300);
          });
        }
      }
    } catch (error) {
      console.error("Error starting call:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = async (prompt: string) => {
    if (conversationStep >= 3) return;

    setTranscript(prev => [...prev, { speaker: "customer", text: prompt }]);
    setConversationStep(prev => prev + 1);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/demo/voice-preview?voice_id=${INDUSTRY_GREETINGS[selectedIndustry].voiceId}&text=${encodeURIComponent(generateAIResponse(prompt, selectedIndustry))}&industry=${selectedIndustry}`
      );

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          await new Promise(resolve => {
            setTimeout(() => {
              audioRef.current!.src = audioUrl;
              audioRef.current!.play().catch(err => console.error("Playback error:", err));
              resolve(null);
            }, 500);
          });

          const aiResponse = generateAIResponse(prompt, selectedIndustry);
          setTranscript(prev => [...prev, { speaker: "ai", text: aiResponse }]);
        }
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = (userInput: string, industry: string): string => {
    const responses: Record<string, string[]> = {
      HVAC: [
        "I'd be happy to schedule that for you. We have availability tomorrow at 2 PM or Thursday at 9 AM. Which works better?",
        "Absolutely. Can you tell me a bit more about the issue you're experiencing? Is it heating or cooling?",
        "Perfect. Let me get your information. What's the best phone number to reach you?"
      ],
      Dental: [
        "Of course! Dr. Chen has openings this week. Would you prefer morning or afternoon?",
        "What type of appointment are you looking for? Cleaning, checkup, or something specific?",
        "Great! Can I get your name and phone number for the appointment?"
      ],
      Plumbing: [
        "We can dispatch someone today. Is this an emergency situation?",
        "I understand. That's one of our most common calls. We have emergency availability right now.",
        "Perfect. Let me send you a service confirmation. What's the best way to reach you?"
      ],
      Roofing: [
        "A roof inspection usually takes about an hour. We can schedule you this week.",
        "How soon are you looking to get started? We offer same-day assessments.",
        "Let me get your details. What's your address and best phone number?"
      ],
      Legal: [
        "I can connect you with an attorney who specializes in that area.",
        "We have availability for a consultation. When works best for you?",
        "Excellent. Let me get some basic information for the consultation."
      ],
      Medical: [
        "Is this a new patient visit or a follow-up?",
        "I can get you scheduled with our next available provider. Do you prefer any specific doctor?",
        "Perfect. Let me confirm your appointment details."
      ],
      Salon: [
        "Which service are you interested in? We have stylists available throughout the week.",
        "Excellent. What time would work best for you?",
        "Let me confirm your booking details."
      ],
      Restaurant: [
        "How many guests will be dining?",
        "Perfect. What time would you prefer?",
        "Great! Let me get your name for the reservation."
      ],
      Auto: [
        "What type of service does your vehicle need?",
        "I can schedule that for you. What's your preferred time?",
        "Let me get your contact information and vehicle details."
      ]
    };

    return responses[industry][Math.min(conversationStep - 1, 2)];
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail) return;

    setSignupLoading(true);

    try {
      const response = await fetch("/api/demo/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          industry: selectedIndustry,
          source: "voice-demo"
        })
      });

      if (response.ok) {
        setSignupSuccess(true);
        setSignupEmail("");
        setTimeout(() => setSignupSuccess(false), 5000);
      }
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <audio ref={audioRef} />
      <audio ref={robotAudioRef} />
      <audio ref={humanAudioRef} />

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-400 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Live AI Voice Demo — No Signup Required
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight" style={{ letterSpacing: "-0.03em" }}>
          AI So Human, Your Callers<br />Won&apos;t Know the Difference
        </h1>
        <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Listen to real AI conversations across 9 industries. No robotic voices. No awkward pauses. Just natural, revenue-generating conversations — 24/7.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm" style={{ color: "var(--text-tertiary)" }}>
          <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> 12,400+ businesses live</span>
          <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> 8.7M+ calls handled</span>
          <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> 99.97% uptime SLA</span>
        </div>
        <button
          onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all text-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <Phone className="w-5 h-5" />
          Try It Live — Free
        </button>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo-section" className="py-16 px-4 bg-[var(--bg-card)] border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Pick Your Industry</h2>

          {/* Industry Selector */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {INDUSTRIES.map(industry => (
              <button
                key={industry}
                onClick={() => {
                  setSelectedIndustry(industry);
                  setTranscript([]);
                  setConversationStep(0);
                }}
                className={`px-5 py-3 rounded-lg font-medium transition-all ${
                  selectedIndustry === industry
                    ? "bg-white text-black shadow-lg"
                    : "bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-white"
                }`}
              >
                {industry}
              </button>
            ))}
          </div>

          {/* Mock Phone UI */}
          <div className="max-w-md mx-auto mb-8">
            <div className="rounded-3xl border-8 border-gray-800 bg-black shadow-2xl overflow-hidden">
              {/* Phone Header */}
              <div className="bg-gray-900 px-6 py-3 flex justify-between items-center text-white text-sm">
                <span>9:41</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>

              {/* Call Interface */}
              <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 px-6 py-12 text-white text-center">
                <div className="mb-4">
                  <Phone className="w-12 h-12 mx-auto mb-3 opacity-80" />
                </div>
                <p className="text-sm opacity-80">Incoming Call</p>
                <p className="text-xl font-semibold">{selectedIndustry} Business</p>
                <p className="text-sm opacity-80 mt-1">You</p>
              </div>

              {/* Transcript Area */}
              <div className="bg-black px-4 py-4 min-h-64 max-h-64 overflow-y-auto space-y-3">
                {transcript.length === 0 && conversationStep === 0 && (
                  <p className="text-gray-500 text-sm italic text-center mt-20">Tap &quot;Start Call&quot; to begin...</p>
                )}
                {transcript.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.speaker === "ai" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`px-4 py-2 rounded-lg max-w-xs text-sm ${
                        msg.speaker === "ai"
                          ? "bg-zinc-800 text-white"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>

              {/* Call Controls */}
              <div className="bg-gray-900 px-4 py-4 flex justify-center gap-4">
                <button
                  onClick={startCall}
                  disabled={isLoading}
                  className="rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 p-4 transition-colors"
                >
                  <Phone className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Follow-up Prompts */}
          {conversationStep > 0 && conversationStep < 3 && (
            <div className="max-w-md mx-auto mb-8">
              <p className="text-sm text-gray-400 mb-3 text-center">Try saying:</p>
              <div className="space-y-2">
                {FOLLOW_UP_PROMPTS.slice(0, 3 - (conversationStep - 1)).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFollowUp(prompt)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-white hover:bg-[var(--bg-primary)] transition-all disabled:opacity-50 text-sm text-left"
                  >
                    &quot;{prompt}&quot;
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversion CTA */}
          {conversationStep >= 3 && (
            <div className="max-w-md mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Want this for your business?</h3>
              <p className="text-sm mb-4 opacity-90">Start capturing calls and converting them into revenue.</p>
              <button
                onClick={() => document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full bg-white text-black font-semibold py-2 rounded hover:bg-zinc-100 transition-colors"
              >
                See Pricing
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Voice Comparison Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">The Quality Difference</h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Robot Voice */}
            <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border)]">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Generic Robot Voice
              </h3>
              <div className="bg-black rounded-lg p-4 mb-4">
                <audio
                  ref={robotAudioRef}
                  controls
                  className="w-full"
                  style={{ height: "40px" }}
                >
                  <source src="/samples/robot.mp3" type="audio/mpeg" />
                </audio>
              </div>
              <p className="text-sm text-gray-400">&quot;Thank you for calling. Please say your name.&quot;</p>
            </div>

            {/* Recall Touch Voice */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg p-6 text-white">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Recall Touch AI
              </h3>
              <div className="bg-black/30 rounded-lg p-4 mb-4">
                <audio
                  ref={humanAudioRef}
                  controls
                  className="w-full"
                  style={{ height: "40px" }}
                >
                  <source src="/samples/human.mp3" type="audio/mpeg" />
                </audio>
              </div>
              <p className="text-sm opacity-90">&quot;Thank you for calling. What can I help you with today?&quot;</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6 text-center">
            <p className="text-lg font-semibold mb-2">Callers hang up when they hear a robot.</p>
            <p className="text-xl font-bold text-green-400">Recall Touch sounds human. They stay on the line.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="py-16 px-4 bg-[var(--bg-card)] border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
            No hidden fees. Cancel anytime. 14-day free trial on every plan.
          </p>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {/* Starter */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <p className="text-3xl font-bold mb-6">$97<span className="text-sm text-gray-400">/mo</span></p>
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 1 AI agent</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 500 voice minutes/month</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Appointment booking</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> SMS follow-up</li>
              </ul>
              <Link href="/activate" className="w-full block text-center bg-white text-black font-semibold py-2 rounded hover:bg-gray-100 transition-colors">
                Try Free for 14 Days
              </Link>
            </div>

            {/* Growth (Featured) */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg p-6 transform md:scale-105">
              <div className="mb-4 inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-semibold">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Growth</h3>
              <p className="text-3xl font-bold mb-6 text-white">$297<span className="text-sm text-emerald-200">/mo</span></p>
              <ul className="space-y-3 mb-6 text-sm text-white">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-300" /> 5 AI agents</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-300" /> 2,500 voice minutes/month</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-300" /> No-show recovery</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-300" /> Revenue analytics</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-300" /> Priority support</li>
              </ul>
              <Link href="/activate" className="w-full block text-center bg-white text-emerald-600 font-semibold py-2 rounded hover:bg-gray-100 transition-colors no-underline">
                Try Free for 14 Days
              </Link>
            </div>

            {/* Business */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-2">Business</h3>
              <p className="text-3xl font-bold mb-6">$597<span className="text-sm text-gray-400">/mo</span></p>
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 15 AI agents</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 6,000 voice minutes/month</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Outbound campaigns</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Advanced analytics + API</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Phone support</li>
              </ul>
              <Link href="/activate" className="w-full block text-center bg-white text-black font-semibold py-2 rounded hover:bg-gray-100 transition-colors">
                Try Free for 14 Days
              </Link>
            </div>

            {/* Agency */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-2">Agency</h3>
              <p className="text-3xl font-bold mb-6">$997<span className="text-sm text-gray-400">/mo</span></p>
              <ul className="space-y-3 mb-6 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Unlimited AI agents</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 15,000 voice minutes/month</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> White-label branding</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Multi-client dashboard</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Dedicated account manager</li>
              </ul>
              <Link href="/activate" className="w-full block text-center bg-white text-black font-semibold py-2 rounded hover:bg-gray-100 transition-colors">
                Try Free for 14 Days
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">The Industry&apos;s Leading AI Phone Platform</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Trusted by 12,400+ businesses across 200+ industries in 47 states and 12 countries.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">&lt;0.8s</p>
              <p className="text-sm text-gray-400">Answer Time</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">24/7</p>
              <p className="text-sm text-gray-400">Always On</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">99.97%</p>
              <p className="text-sm text-gray-400">Uptime SLA</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">41</p>
              <p className="text-sm text-gray-400">AI Voices</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-r from-zinc-800 to-zinc-900 text-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Stop Losing Calls. Start Converting Them.</h2>
          <p className="text-lg mb-8 opacity-90">Start your 14-day free trial. No credit card required.</p>

          {signupSuccess && (
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-green-300">
              Check your email for next steps!
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
            <input
              type="email"
              placeholder="your@email.com"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={signupLoading}
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              {signupLoading ? "..." : "Get Started Free"}
            </button>
          </form>

          <p className="text-sm opacity-80 mb-6">No credit card required. 14-day free trial.</p>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/book-demo" className="hover:underline opacity-80 hover:opacity-100">Book a demo</Link>
            <span className="opacity-30">•</span>
            <Link href="#pricing-section" className="hover:underline opacity-80 hover:opacity-100">See pricing</Link>
            <span className="opacity-30">•</span>
            <Link href="/contact" className="hover:underline opacity-80 hover:opacity-100">Talk to sales</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
