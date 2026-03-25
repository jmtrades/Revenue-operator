"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Volume2, Phone, Check } from "lucide-react";
import { SOCIAL_PROOF } from "@/lib/constants";

const SCENARIOS = [
  "New Customer Inquiry",
  "Appointment Booking",
  "After-Hours Call",
  "Follow-Up Call"
];

const SCENARIO_GREETINGS: Record<string, { greeting: string; voiceId: string }> = {
  "New Customer Inquiry": {
    greeting: "Hi there, thanks so much for calling! This is Sarah. I'd love to help you out, what can I do for you today?",
    voiceId: "us-female-warm-agent"
  },
  "Appointment Booking": {
    greeting: "Hey, I'd be happy to get you scheduled. Let me take a quick look at what we have open. What day works best for you?",
    voiceId: "us-female-professional"
  },
  "After-Hours Call": {
    greeting: "Thanks for calling! So our office is closed right now, but don't worry, I can absolutely help you. What's going on?",
    voiceId: "us-male-warm"
  },
  "Follow-Up Call": {
    greeting: "Hi, this is Alex. I'm just following up from our conversation earlier. I wanted to make sure we got everything squared away for you.",
    voiceId: "us-male-confident"
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
  const [selectedScenario, setSelectedScenario] = useState<string>("New Customer Inquiry");
  const [_isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [conversationStep, setConversationStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
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
      const greeting = SCENARIO_GREETINGS[selectedScenario];
      const biz = businessName.trim();
      const personalizedGreeting = biz
        ? greeting.greeting.replace(/calling!/i, `calling ${biz}!`).replace(/Thanks for calling!/i, `Thanks for calling ${biz}!`)
        : greeting.greeting;

      const response = await fetch(
        `/api/demo/voice-preview?voice_id=${greeting.voiceId}&text=${encodeURIComponent(personalizedGreeting)}&scenario=${selectedScenario}`
      );

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(err => console.error("Playback error:", err));

          await new Promise(resolve => {
            setTimeout(() => {
              setTranscript(prev => [...prev, { speaker: "ai", text: personalizedGreeting }]);
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
        `/api/demo/voice-preview?voice_id=${SCENARIO_GREETINGS[selectedScenario].voiceId}&text=${encodeURIComponent(generateAIResponse(prompt, selectedScenario))}&scenario=${selectedScenario}`
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

          const aiResponse = generateAIResponse(prompt, selectedScenario);
          setTranscript(prev => [...prev, { speaker: "ai", text: aiResponse }]);
        }
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = (userInput: string, scenario: string): string => {
    const responses: Record<string, string[]> = {
      "New Customer Inquiry": [
        "I'd be happy to help with that. Can you tell me a bit more about what you're looking for?",
        "Absolutely. Let me get some details so I can better assist you.",
        "Perfect. What's the best way to reach you so we can follow up?"
      ],
      "Appointment Booking": [
        "Great! I can check our availability. Do you have a preferred time in mind?",
        "Perfect. Let me get your name and contact information to secure the booking.",
        "Excellent. You're all set. Is there anything else I can help you with?"
      ],
      "After-Hours Call": [
        "Of course, I can definitely help you with that. What's your main concern right now?",
        "I understand. Let me capture your information so our team can follow up first thing in the morning.",
        "Thank you for calling. We've got all your details and will reach out to you soon."
      ],
      "Follow-Up Call": [
        "Great to hear from you. Did you have a chance to review the information we sent over?",
        "Fantastic. Is there anything else you'd like to discuss or any questions I can answer?",
        "Perfect. We're all set then. Thank you for choosing us."
      ]
    };

    return responses[scenario][Math.min(conversationStep - 1, 2)];
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
          scenario: selectedScenario,
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
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-6"
          style={{
            background: "var(--accent-primary-subtle)",
            color: "var(--accent-primary)",
            border: "1px solid rgba(37, 99, 235, 0.1)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--accent-primary)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--accent-primary)" }} />
          </span>
          Live AI Voice Demo — No Signup Required
        </div>
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-4"
          style={{ letterSpacing: "-0.035em", lineHeight: 1.08, color: "var(--text-primary)" }}
        >
          AI So Human, Your Callers<br />Won&apos;t Know the Difference
        </h1>
        <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Hear how AI handles every common call scenario. No robotic voices. No awkward pauses. Just natural, revenue-generating conversations — 24/7.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm" style={{ color: "var(--text-tertiary)" }}>
          {[`${SOCIAL_PROOF.businessCount} businesses live`, `${SOCIAL_PROOF.callsHandled} calls handled`, "99.97% uptime SLA"].map((text) => (
            <span key={text} className="flex items-center gap-1.5">
              <svg className="w-4 h-4" style={{ color: "var(--accent-secondary)" }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
              </svg>
              {text}
            </span>
          ))}
        </div>
        <button
          onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}
          className="btn-marketing-primary btn-lg inline-flex items-center gap-2"
        >
          <Phone className="w-5 h-5" />
          Try It Live — Free
        </button>
      </section>

      {/* Interactive Demo Section */}
      <section
        id="demo-section"
        className="py-16 px-4"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-default)" }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold mb-3 text-center" style={{ letterSpacing: "-0.025em" }}>Hear Your AI in Action</h2>
          <p className="text-center mb-8 text-sm" style={{ color: "var(--text-secondary)" }}>
            Type your business name to personalize the demo
          </p>

          {/* Business name personalization */}
          <div className="max-w-sm mx-auto mb-8">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name (e.g., Acme Dental)"
              className="w-full px-4 py-3 rounded-xl text-sm text-center transition-colors focus:outline-none focus:ring-2"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Scenario Selector */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {SCENARIOS.map(scenario => (
              <button
                key={scenario}
                onClick={() => {
                  setSelectedScenario(scenario);
                  setTranscript([]);
                  setConversationStep(0);
                }}
                className="px-5 py-3 rounded-lg font-medium transition-[background-color,border-color,color,transform] text-sm"
                style={{
                  background: selectedScenario === scenario ? "var(--accent-primary)" : "var(--bg-primary)",
                  color: selectedScenario === scenario ? "#fff" : "var(--text-primary)",
                  border: selectedScenario === scenario ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                  boxShadow: selectedScenario === scenario ? "var(--shadow-sm)" : undefined,
                }}
              >
                {scenario}
              </button>
            ))}
          </div>

          {/* Mock Phone UI */}
          <div className="max-w-md mx-auto mb-8">
            <div
              className="rounded-3xl overflow-hidden"
              style={{ border: "8px solid #1F2937", boxShadow: "var(--shadow-xl)" }}
            >
              {/* Phone Header */}
              <div className="px-6 py-3 flex justify-between items-center text-sm" style={{ background: "#111827", color: "#fff" }}>
                <span>9:41</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>

              {/* Call Interface */}
              <div className="px-6 py-12 text-center" style={{ background: "linear-gradient(to bottom, #1F2937, #111827)", color: "#fff" }}>
                <div className="mb-4">
                  <Phone className="w-12 h-12 mx-auto mb-3 opacity-80" />
                </div>
                <p className="text-sm opacity-80">Incoming Call</p>
                <p className="text-xl font-semibold">{selectedScenario}</p>
                <p className="text-sm opacity-80 mt-1">You</p>
              </div>

              {/* Transcript Area */}
              <div className="px-4 py-4 min-h-64 max-h-64 overflow-y-auto space-y-3" style={{ background: "#0A0A0B" }}>
                {transcript.length === 0 && conversationStep === 0 && (
                  <p className="text-sm italic text-center mt-20" style={{ color: "#6B7280" }}>Tap &quot;Start Call&quot; to begin...</p>
                )}
                {transcript.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.speaker === "ai" ? "justify-start" : "justify-end"}`}>
                    <div
                      className="px-4 py-2 rounded-lg max-w-xs text-sm"
                      style={{
                        background: msg.speaker === "ai" ? "#1F2937" : "#374151",
                        color: "#fff",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>

              {/* Call Controls */}
              <div className="px-4 py-4 flex justify-center gap-4" style={{ background: "#111827" }}>
                <button
                  onClick={startCall}
                  disabled={isLoading}
                  className="rounded-full p-4 transition-colors"
                  style={{
                    background: isLoading ? "#4B5563" : "var(--accent-secondary)",
                    color: "#fff",
                  }}
                >
                  <Phone className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Follow-up Prompts */}
          {conversationStep > 0 && conversationStep < 3 && (
            <div className="max-w-md mx-auto mb-8">
              <p className="text-sm mb-3 text-center" style={{ color: "var(--text-tertiary)" }}>Try saying:</p>
              <div className="space-y-2">
                {FOLLOW_UP_PROMPTS.slice(0, 3 - (conversationStep - 1)).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFollowUp(prompt)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-lg transition-[background-color,border-color,color,transform] disabled:opacity-50 text-sm text-left"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-primary)",
                    }}
                  >
                    &quot;{prompt}&quot;
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversion CTA */}
          {conversationStep >= 3 && (
            <div
              className="max-w-md mx-auto rounded-xl p-6 text-center"
              style={{
                background: "var(--accent-primary)",
                color: "#fff",
              }}
            >
              <Check className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Want this for your business?</h3>
              <p className="text-sm mb-4 opacity-90">Start capturing calls and converting them into revenue.</p>
              <button
                onClick={() => document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full font-semibold py-2.5 rounded-lg transition-colors text-sm"
                style={{ background: "#fff", color: "var(--accent-primary)" }}
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
          <h2 className="text-3xl font-semibold mb-12 text-center" style={{ letterSpacing: "-0.025em" }}>The Quality Difference</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Robot Voice */}
            <div
              className="rounded-xl p-6"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Volume2 className="w-5 h-5" />
                Typical AI Voice System
              </h3>
              <div className="rounded-lg p-4 mb-4" style={{ background: "var(--bg-inset)", border: "1px solid var(--border-default)" }}>
                <audio
                  ref={robotAudioRef}
                  controls
                  className="w-full"
                  style={{ height: "40px" }}
                >
                  <source src="/samples/robot.mp3" type="audio/mpeg" />
                </audio>
              </div>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>&quot;Thank. You. For. Calling. Please. State. Your. Name.&quot;</p>
            </div>

            {/* Recall Touch Voice */}
            <div
              className="rounded-xl p-6"
              style={{
                background: "var(--accent-primary)",
                color: "#fff",
              }}
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Recall Touch AI
              </h3>
              <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(0,0,0,0.15)" }}>
                <audio
                  ref={humanAudioRef}
                  controls
                  className="w-full"
                  style={{ height: "40px" }}
                >
                  <source src="/samples/human.mp3" type="audio/mpeg" />
                </audio>
              </div>
              <p className="text-sm opacity-90">&quot;Hey, thanks for calling — what can I help you with today?&quot;</p>
            </div>
          </div>

          <div
            className="rounded-xl p-6 text-center"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Callers hang up when they hear a robot.</p>
            <p className="text-xl font-semibold" style={{ color: "var(--accent-primary)" }}>Recall Touch sounds human. They stay on the line.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing-section"
        className="py-16 px-4"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-default)" }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold mb-4 text-center" style={{ letterSpacing: "-0.025em" }}>Simple, Transparent Pricing</h2>
          <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            No hidden fees. Cancel anytime. 14-day free trial on every plan.
          </p>

          <div className="grid md:grid-cols-4 gap-5 mb-12">
            {[
              {
                name: "Starter", price: "$97", features: ["1 AI agent", "500 voice minutes/month", "Appointment booking", "SMS follow-up"], popular: false,
              },
              {
                name: "Growth", price: "$297", features: ["5 AI agents", "2,500 voice minutes/month", "No-show recovery", "Revenue analytics", "Priority support"], popular: true,
              },
              {
                name: "Business", price: "$597", features: ["15 AI agents", "6,000 voice minutes/month", "Outbound campaigns", "Advanced analytics + API", "Phone support"], popular: false,
              },
              {
                name: "Agency", price: "$997", features: ["Unlimited AI agents", "15,000 voice minutes/month", "White-label branding", "Multi-client dashboard", "Dedicated account manager"], popular: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl p-6 flex flex-col"
                style={{
                  background: "var(--bg-primary)",
                  border: tier.popular ? "2px solid var(--accent-primary)" : "1px solid var(--border-default)",
                  boxShadow: tier.popular ? "var(--shadow-glow-primary)" : undefined,
                }}
              >
                {tier.popular && (
                  <div
                    className="mb-4 inline-block self-start text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: "var(--accent-primary)", color: "#fff" }}
                  >
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{tier.name}</h3>
                <p className="text-3xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                  {tier.price}<span className="text-sm font-normal" style={{ color: "var(--text-tertiary)" }}>/mo</span>
                </p>
                <ul className="space-y-3 mb-6 text-sm flex-1">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: "var(--accent-secondary)" }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/activate"
                  className={`${tier.popular ? "btn-marketing-primary" : "btn-marketing-ghost"} w-full block text-center py-2.5 rounded-lg no-underline text-sm`}
                >
                  Try Free for 14 Days
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-4" style={{ letterSpacing: "-0.025em" }}>The Industry&apos;s Leading AI Phone Platform</h2>
          <p className="mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Trusted by {SOCIAL_PROOF.businessCount} businesses across {SOCIAL_PROOF.industryCount} industries in {SOCIAL_PROOF.stateCount} states and 12 countries.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { stat: "<0.8s", label: "Answer Time" },
              { stat: "24/7", label: "Always On" },
              { stat: "99.97%", label: "Uptime SLA" },
              { stat: "41", label: "AI Voices" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-4"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
              >
                <p className="text-2xl font-semibold" style={{ color: "var(--accent-primary)" }}>{item.stat}</p>
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="py-20 px-4 text-center"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-default)" }}
      >
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-semibold mb-6"
            style={{ letterSpacing: "-0.025em", color: "var(--text-primary)" }}
          >
            Your AI Revenue Operator Is Ready.
          </h2>
          <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>
            Start your 14-day free trial. No credit card required.
          </p>

          {signupSuccess && (
            <div
              className="rounded-lg p-4 mb-6 text-sm"
              style={{
                background: "var(--accent-secondary-subtle)",
                border: "1px solid var(--accent-secondary)",
                color: "var(--accent-secondary)",
              }}
            >
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
              className="flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="submit"
              disabled={signupLoading}
              className="btn-marketing-primary px-6 py-3 disabled:opacity-50"
            >
              {signupLoading ? "..." : "Get Started Free"}
            </button>
          </form>

          <p className="text-sm mb-6" style={{ color: "var(--text-tertiary)" }}>
            No credit card required. 14-day free trial.
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            <Link href="/demo" className="no-underline transition-colors" style={{ color: "var(--text-secondary)" }}>Book a demo</Link>
            <span style={{ color: "var(--border-default)" }}>|</span>
            <Link href="#pricing-section" className="no-underline transition-colors" style={{ color: "var(--text-secondary)" }}>See pricing</Link>
            <span style={{ color: "var(--border-default)" }}>|</span>
            <Link href="/contact" className="no-underline transition-colors" style={{ color: "var(--text-secondary)" }}>Talk to sales</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
