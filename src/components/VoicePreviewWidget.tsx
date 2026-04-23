"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, Phone, Mic, Volume2, Sparkles, Wrench, HeartPulse, Scale, Home, UtensilsCrossed, Building2, Scissors, Car, Shield, Dumbbell, FileText, PawPrint, Sparkle, Camera, Zap, ShoppingCart, Bone, Trees, BookOpen, Truck, Heart, Baby, Bug, Waves, DollarSign, Lightbulb, Key, Droplet } from "lucide-react";

/* ─── Conversation Scripts ─── */
const SCENARIOS = [
  {
    id: "hvac",
    industry: "HVAC",
    label: "Emergency AC Repair",
    icon: Wrench,
    greeting: "Hi, thanks for calling Premier Comfort Heating and Air. This is Sarah, how can I help you today?",
    conversation: [
      { role: "ai" as const, text: "Hi, thanks for calling Premier Comfort Heating and Air. This is Sarah, how can I help you today?", delay: 0 },
      { role: "caller" as const, text: "Yeah, my AC just stopped working and it's like 95 degrees in here. I need someone out here ASAP.", delay: 3200 },
      { role: "ai" as const, text: "Oh no, I completely understand — that sounds miserable, especially in this heat. Let me get you taken care of right away. I have a technician available this afternoon between 2 and 4. Would that work for you, or do you need something even sooner?", delay: 5000 },
      { role: "caller" as const, text: "This afternoon works. What's it gonna cost me?", delay: 4800 },
      { role: "ai" as const, text: "Great, I've got you locked in. The diagnostic visit is seventy-nine dollars, and that gets applied to any repair we do. Most AC issues like this run between one-fifty and three hundred, but our tech will give you the exact number before doing any work. No surprises. Can I grab your address to confirm the appointment?", delay: 6000 },
    ],
  },
  {
    id: "dental",
    industry: "Dental",
    label: "New Patient Booking",
    icon: HeartPulse,
    greeting: "Good morning, Bright Smile Dental, this is Emma. How can I make your day better?",
    conversation: [
      { role: "ai" as const, text: "Good morning, Bright Smile Dental, this is Emma. How can I make your day better?", delay: 0 },
      { role: "caller" as const, text: "Hi, I'm looking for a new dentist. Do you take Blue Cross Blue Shield?", delay: 3000 },
      { role: "ai" as const, text: "We sure do! Blue Cross Blue Shield is one of our most popular plans. Welcome to Bright Smile — you're going to love Dr. Chen. We actually have a new patient special right now: a full exam, cleaning, and X-rays for just forty-nine dollars with your insurance. Would you like to grab one of those appointments?", delay: 5500 },
      { role: "caller" as const, text: "Oh wow, that's a great deal. Yeah, what do you have available?", delay: 3200 },
      { role: "ai" as const, text: "Perfect! I have openings tomorrow at 10 AM or Thursday at 2:30 PM. Both are with Dr. Chen. Which works better for your schedule?", delay: 4500 },
      { role: "caller" as const, text: "Thursday at 2:30 sounds good.", delay: 2000 },
      { role: "ai" as const, text: "You're all set for Thursday at 2:30 with Dr. Chen. I'll text you a confirmation with the address and what to bring. And just so you know — we have complimentary coffee and Netflix in the waiting room. We like to make it easy. See you Thursday!", delay: 5500 },
    ],
  },
  {
    id: "legal",
    industry: "Legal",
    label: "Personal Injury Intake",
    icon: Scale,
    greeting: "Thank you for calling Roth and Associates. This is Alex. How may I assist you?",
    conversation: [
      { role: "ai" as const, text: "Thank you for calling Roth and Associates. This is Alex. How may I assist you?", delay: 0 },
      { role: "caller" as const, text: "I was in a car accident last week and I think I need a lawyer.", delay: 3000 },
      { role: "ai" as const, text: "I'm sorry to hear about your accident — I hope you're feeling okay. You've called the right place. Our attorneys specialize in auto accident cases and we work on contingency, which means you don't pay us anything unless we win your case. Can I ask you a couple quick questions so we can get you a free consultation?", delay: 6000 },
      { role: "caller" as const, text: "Sure, yeah.", delay: 1500 },
      { role: "ai" as const, text: "Great. Were you the driver or a passenger, and have you seen a doctor since the accident?", delay: 3500 },
      { role: "caller" as const, text: "I was driving. I went to the ER that night but haven't followed up yet.", delay: 3000 },
      { role: "ai" as const, text: "Okay, that's really helpful. I'd recommend following up with your doctor as soon as possible — it strengthens your case significantly. I have a consultation slot available tomorrow morning at 9 AM with Attorney Roth. He's recovered over twelve million dollars for clients in cases just like yours. Should I book that for you?", delay: 6500 },
    ],
  },
  {
    id: "roofing",
    industry: "Roofing",
    label: "Storm Damage Estimate",
    icon: Home,
    greeting: "Apex Roofing Group, this is Sarah. Thanks for calling — how can I help?",
    conversation: [
      { role: "ai" as const, text: "Apex Roofing Group, this is Sarah. Thanks for calling — how can I help?", delay: 0 },
      { role: "caller" as const, text: "We had that big storm last night and I think my roof got damaged. There's water coming in.", delay: 3500 },
      { role: "ai" as const, text: "Oh no, I'm so sorry to hear that. Water intrusion is something we want to address quickly before it causes more damage. The good news is we offer free storm damage inspections, and we work directly with your insurance company to handle the entire claims process. Can I get an inspector out to you today?", delay: 6000 },
      { role: "caller" as const, text: "Today would be amazing. How much is this going to run me?", delay: 2800 },
      { role: "ai" as const, text: "The inspection is completely free, and if it's storm damage, your homeowner's insurance typically covers the full repair or replacement. We've helped over two thousand homeowners in the area navigate their claims — our approval rate is ninety-four percent. I have a slot at 3 PM today. Can I grab your address?", delay: 6500 },
    ],
  },
  {
    id: "restaurant",
    industry: "Restaurant",
    label: "Reservation & Catering",
    icon: UtensilsCrossed,
    greeting: "Hi, thanks for calling Bella Notte Italian Kitchen. This is Emma, how can I help you?",
    conversation: [
      { role: "ai" as const, text: "Hi, thanks for calling Bella Notte Italian Kitchen. This is Emma, how can I help you?", delay: 0 },
      { role: "caller" as const, text: "I'd like to make a reservation for Saturday night, party of 8.", delay: 2800 },
      { role: "ai" as const, text: "Wonderful! Saturday night for 8 — let me check what we have. I can offer you our semi-private dining alcove at 7:30 PM, which is perfect for larger groups. You'll have your own space with a dedicated server. Would you like that?", delay: 5000 },
      { role: "caller" as const, text: "That sounds perfect. It's actually for a birthday — do you guys do anything special?", delay: 3000 },
      { role: "ai" as const, text: "Happy birthday to the guest of honor! Absolutely — we'll bring out our house-made tiramisu with a candle, and Chef Marco can prepare a special prix fixe menu for the table if you'd like. It's sixty-five per person and includes four courses with wine pairings. Our guests love it for celebrations. Want me to set that up?", delay: 6500 },
    ],
  },
  {
    id: "realestate",
    industry: "Real Estate",
    label: "Listing Inquiry",
    icon: Building2,
    greeting: "Thanks for calling Pinnacle Realty Group. This is Sarah, how can I help you today?",
    conversation: [
      { role: "ai" as const, text: "Thanks for calling Pinnacle Realty Group. This is Sarah, how can I help you today?", delay: 0 },
      { role: "caller" as const, text: "I saw a listing online for a 3-bedroom on Oak Street. Is it still available?", delay: 3000 },
      { role: "ai" as const, text: "Great taste — that one's getting a lot of interest! Yes, it's still available. It's listed at four twenty-five, 3 bed 2 bath with a renovated kitchen and a backyard. Would you like to schedule a showing?", delay: 5000 },
      { role: "caller" as const, text: "Yeah, what do you have this weekend?", delay: 2500 },
      { role: "ai" as const, text: "I have Saturday at 11 AM or Sunday at 1 PM with our listing agent, David. He knows that property inside and out. Which works better for you?", delay: 4500 },
    ],
  },
  {
    id: "medspa",
    industry: "Med Spa / Salon",
    label: "Appointment Booking",
    icon: Scissors,
    greeting: "Glow Aesthetics, this is Emma. Thanks for calling — how can I help?",
    conversation: [
      { role: "ai" as const, text: "Glow Aesthetics, this is Emma. Thanks for calling — how can I help?", delay: 0 },
      { role: "caller" as const, text: "I'm interested in getting Botox. I've never done it before — what should I know?", delay: 3200 },
      { role: "ai" as const, text: "Great question! Botox is one of our most popular treatments — it's quick, about fifteen minutes, and most clients see results within three to five days. Our nurse injector, Michelle, does a free consultation first so she can customize the treatment for your goals. Would you like to book that?", delay: 6000 },
      { role: "caller" as const, text: "Sure, how much is the consultation?", delay: 2200 },
      { role: "ai" as const, text: "The consultation is completely free, and if you decide to go ahead, we're running a new client special right now — twenty percent off your first treatment. I have availability tomorrow at 3 PM or Friday at 11 AM. Which works?", delay: 5500 },
    ],
  },
  {
    id: "auto",
    industry: "Auto Service",
    label: "Oil Change & Repair",
    icon: Car,
    greeting: "Precision Auto Care, this is Alex. How can I help you today?",
    conversation: [
      { role: "ai" as const, text: "Precision Auto Care, this is Alex. How can I help you today?", delay: 0 },
      { role: "caller" as const, text: "My check engine light came on this morning. Can I bring it in today?", delay: 3000 },
      { role: "ai" as const, text: "Absolutely — we don't want you driving around worried about that. I can get you in for a diagnostic today at 2 PM. The diagnostic is forty-nine ninety-five, and that gets applied to any repair we do. What kind of vehicle do you drive?", delay: 5500 },
      { role: "caller" as const, text: "It's a 2019 Honda Accord.", delay: 2000 },
      { role: "ai" as const, text: "Perfect, our technicians work on Hondas all the time. I've got you down for 2 PM today. We'll run the diagnostic, give you a full report, and you'll know exactly what's going on before we do any work. Can I grab your name and number to confirm?", delay: 6000 },
    ],
  },
  {
    id: "insurance",
    industry: "Insurance",
    label: "Policy Renewal Quote",
    icon: Shield,
    greeting: "Welcome to SafeGuard Insurance, this is Alex. How can I help you today?",
    conversation: [
      { role: "ai" as const, text: "Welcome to SafeGuard Insurance, this is Alex. How can I help you today?", delay: 0 },
      { role: "caller" as const, text: "Hi, my auto insurance policy is coming up for renewal and I want to shop around for a better rate.", delay: 3500 },
      { role: "ai" as const, text: "You're smart to shop around — rates can vary quite a bit. I can help you find coverage that's both better priced and more comprehensive. Do you have your current policy details handy, or would you like me to pull them up based on your driver's license number?", delay: 6000 },
      { role: "caller" as const, text: "I can give you my license number. It's 1-4-5-8-9-2-7-X.", delay: 2500 },
      { role: "ai" as const, text: "Perfect, got that. I'm seeing your current coverage is pretty basic. We can actually get you better liability limits, comprehensive coverage, and a lower premium. Our average customer saves four hundred twelve dollars a year. Should I get a quote running for you?", delay: 6500 },
    ],
  },
  {
    id: "fitness",
    industry: "Fitness / Gym",
    label: "Membership & Classes",
    icon: Dumbbell,
    greeting: "Hey, thanks for calling Peak Fitness! This is Emma. What brings you in today?",
    conversation: [
      { role: "ai" as const, text: "Hey, thanks for calling Peak Fitness! This is Emma. What brings you in today?", delay: 0 },
      { role: "caller" as const, text: "I'm looking to join a gym. What kind of memberships do you offer?", delay: 3200 },
      { role: "ai" as const, text: "Awesome! We've got a few options. Our most popular is the unlimited membership — it's thirty-nine ninety-five a month and gives you access to all our classes, the gym floor, pools, and saunas. We're also running a promotion right now where your first month is just nine ninety-five. Does that sound like something you'd be interested in?", delay: 5800 },
      { role: "caller" as const, text: "That sounds good. Do you have yoga classes?", delay: 2200 },
      { role: "ai" as const, text: "We absolutely do! We have five yoga classes a week — everything from hot yoga to restorative. Our most popular is the Tuesday morning flow at 9 AM with instructor Maria. You can drop in to any class free once you join, and we have a huge community. Want me to get you set up with a membership?", delay: 6200 },
    ],
  },
  {
    id: "accounting",
    industry: "Accounting / Tax",
    label: "Tax Preparation Services",
    icon: FileText,
    greeting: "Good morning, this is Alex with TaxPro Accounting. How can I help you today?",
    conversation: [
      { role: "ai" as const, text: "Good morning, this is Alex with TaxPro Accounting. How can I help you today?", delay: 0 },
      { role: "caller" as const, text: "I need help with my 2024 tax return. I'm self-employed and I'm not sure what I need to bring.", delay: 3300 },
      { role: "ai" as const, text: "Great — we handle a lot of self-employed returns, so you're in good hands. Here's what we'll need: your income records, any business expense receipts or logs, your estimated tax payments from throughout the year, and prior year tax return. Most of our self-employed clients end up saving between one and three thousand dollars by optimizing deductions. Have you kept records of your business expenses?", delay: 6500 },
      { role: "caller" as const, text: "Yeah, I have receipts and a spreadsheet.", delay: 2000 },
      { role: "ai" as const, text: "Perfect — that's exactly what we need. Our standard preparation fee for self-employed returns is three hundred fifty dollars, and we usually have appointments available within two weeks. We can do this in-person or over Zoom, whichever works best for you. What's better — next week or the week after?", delay: 6300 },
    ],
  },
  {
    id: "petcare",
    industry: "Pet Care / Veterinary",
    label: "Appointment Booking",
    icon: PawPrint,
    greeting: "Hi there, thanks for calling Riverside Animal Hospital! This is Sarah, how can I help?",
    conversation: [
      { role: "ai" as const, text: "Hi there, thanks for calling Riverside Animal Hospital! This is Sarah, how can I help?", delay: 0 },
      { role: "caller" as const, text: "My dog has been limping on his back left leg for a couple days. I'd like to get him checked out.", delay: 3400 },
      { role: "ai" as const, text: "Oh, I'm sorry to hear that. We'll get him in and find out what's going on. Dr. Martinez is excellent with orthopedic issues — she'll do a full exam and take X-rays if needed. I have an opening tomorrow at 10 AM or later today at 4 PM. Which would work better for you?", delay: 6000 },
      { role: "caller" as const, text: "Today at 4 would be great.", delay: 2000 },
      { role: "ai" as const, text: "Perfect, I've got you down for today at 4 PM with Dr. Martinez. Just bring his medical records if you have them, and any medications he's currently on. The exam is eighty-five dollars, plus any diagnostics if we need them. Our facility is really pet-friendly, so he'll be comfortable. We'll take great care of him!", delay: 6200 },
    ],
  },
  {
    id: "cleaning",
    industry: "Home Cleaning",
    label: "Cleaning Service Quote",
    icon: Sparkle,
    greeting: "Hi, welcome to Fresh Home Cleaning! This is Emma. What can I help you with?",
    conversation: [
      { role: "ai" as const, text: "Hi, welcome to Fresh Home Cleaning! This is Emma. What can I help you with?", delay: 0 },
      { role: "caller" as const, text: "I need to get my house cleaned. How much do you charge for a full house cleaning?", delay: 3000 },
      { role: "ai" as const, text: "Great question! Our pricing depends on your home size and the level of cleaning. A typical 3-bedroom house runs about two hundred twenty-five to two hundred seventy-five for a standard deep clean. We're eco-friendly, we're insured and bonded, and we guarantee satisfaction. How many bedrooms do you have?", delay: 5800 },
      { role: "caller" as const, text: "Three bedrooms and two bathrooms.", delay: 1800 },
      { role: "ai" as const, text: "Perfect! For your size, we'd estimate about two fifty. We can come weekly, bi-weekly, or monthly — most clients do bi-weekly maintenance. We're fully booked through Friday, but I have Wednesday morning or Thursday afternoon available next week. Which day works?", delay: 6200 },
    ],
  },
  {
    id: "photography",
    industry: "Photography",
    label: "Session Booking",
    icon: Camera,
    greeting: "Hello, this is Sarah with Captured Moments Photography. How can I help?",
    conversation: [
      { role: "ai" as const, text: "Hello, this is Sarah with Captured Moments Photography. How can I help?", delay: 0 },
      { role: "caller" as const, text: "I'm looking to book a family photo session. We want something casual and natural-looking.", delay: 3200 },
      { role: "ai" as const, text: "I love that approach! That's exactly our style — we do lifestyle and candid photography, so it feels relaxed and genuine. A typical family session with us is one hour and includes digital gallery of about 60-80 images. It's three hundred ninety-five dollars. We can do indoor studio, outdoor locations, or even at your home. What sounds best to you?", delay: 6200 },
      { role: "caller" as const, text: "Outdoor sounds nice. When could we schedule something?", delay: 2500 },
      { role: "ai" as const, text: "Wonderful! Spring is perfect for outdoor sessions. I'm pretty booked, but I have availability on Saturday, April 19th at 10 AM or 2 PM, and Saturday, April 26th at 11 AM. Our outdoor location in the park is stunning this time of year. Which date and time works for your family?", delay: 6500 },
    ],
  },
  {
    id: "plumbing",
    industry: "Plumbing",
    label: "Emergency Service Call",
    icon: Zap,
    greeting: "AquaFlow Plumbing, this is Alex. Is this an emergency?",
    conversation: [
      { role: "ai" as const, text: "AquaFlow Plumbing, this is Alex. Is this an emergency?", delay: 0 },
      { role: "caller" as const, text: "Yes! My kitchen sink is completely backed up and water's pooling. I need someone out here today.", delay: 3200 },
      { role: "ai" as const, text: "I understand — water backup is something we want to address immediately before it causes damage. You're in luck, we have a technician available within the hour. There's a one-twenty-five dollar emergency service fee, plus the cost of repairs. Most drain clears run between one-fifty and three-fifty. Can I get your address?", delay: 6500 },
      { role: "caller" as const, text: "It's 247 Maple Drive, apartment 3B.", delay: 2000 },
      { role: "ai" as const, text: "Got it, I'm dispatching our tech right now — he'll be there in about forty-five minutes. His name is John and he'll text you when he's ten minutes away. He'll clear that backup quickly and give you the exact cost before doing any work. We're also doing twenty percent off drain cleaning this month, so that'll help. We'll take care of you!", delay: 6800 },
    ],
  },
  {
    id: "ecommerce",
    industry: "E-Commerce / Retail",
    label: "Order Status & Returns",
    icon: ShoppingCart,
    greeting: "Hi, thanks for calling StyleHub Online! This is Sarah. How can I help?",
    conversation: [
      { role: "ai" as const, text: "Hi, thanks for calling StyleHub Online! This is Sarah. How can I help?", delay: 0 },
      { role: "caller" as const, text: "I ordered a dress last week and it arrived, but it's the wrong size. I need to return it.", delay: 3300 },
      { role: "ai" as const, text: "Oh no, I'm sorry it wasn't the right fit! No problem at all — we have a thirty-day return window, so you're completely covered. Did you want to exchange it for a different size, or get a refund? Either way, I can process that right now and email you a prepaid return label.", delay: 5800 },
      { role: "caller" as const, text: "Can I exchange it for a medium instead of large?", delay: 2200 },
      { role: "ai" as const, text: "Absolutely! One medium coming right up. I'm emailing you a return label and your exchange confirmation. The medium will ship out tomorrow, and once we receive your return, we'll process the refund within three business days. You'll get an update email for both. Anything else I can help with?", delay: 6200 },
    ],
  },
  {
    id: "chiropractic",
    industry: "Chiropractic",
    label: "Back Pain Appointment",
    icon: Bone,
    greeting: "Welcome to Precision Chiropractic! This is Sarah. How can I help?",
    conversation: [
      { role: "ai" as const, text: "Welcome to Precision Chiropractic! This is Sarah. How can I help?", delay: 0 },
      { role: "caller" as const, text: "I've had really bad lower back pain for the last few weeks. I need to see someone soon.", delay: 3200 },
      { role: "ai" as const, text: "I'm so sorry you're dealing with that pain — it can really impact your day. Dr. Morrison is fantastic with lower back issues. Your first visit includes a full consultation, X-rays, and initial adjustment. It's ninety-nine dollars. I have tomorrow at 2 PM or Thursday at 10 AM. Which works?", delay: 6000 },
      { role: "caller" as const, text: "Tomorrow at 2 sounds perfect.", delay: 2000 },
      { role: "ai" as const, text: "Great! You're all set for tomorrow at 2 PM with Dr. Morrison. Please wear comfortable, loose-fitting clothes. The whole first visit takes about forty-five minutes. You'll start feeling better soon!", delay: 5000 },
    ],
  },
  {
    id: "landscaping",
    industry: "Landscaping",
    label: "Lawn Care Quote",
    icon: Trees,
    greeting: "Hi, this is Alex with GreenScape Landscaping. What can I do for you today?",
    conversation: [
      { role: "ai" as const, text: "Hi, this is Alex with GreenScape Landscaping. What can I do for you today?", delay: 0 },
      { role: "caller" as const, text: "My lawn needs work. I'd like a quote for regular maintenance.", delay: 3000 },
      { role: "ai" as const, text: "Absolutely! We offer weekly, bi-weekly, or monthly service. A typical residential lawn runs about fifty-five a week for weekly maintenance. How many square feet is your property?", delay: 5200 },
      { role: "caller" as const, text: "It's about a quarter acre.", delay: 1800 },
      { role: "ai" as const, text: "Perfect, that's right in our wheelhouse. I can schedule a free walkthrough this week to give you an exact quote. Tuesday or Friday work for you?", delay: 4500 },
    ],
  },
  {
    id: "tutoring",
    industry: "Tutoring / Education",
    label: "Math Tutoring Session",
    icon: BookOpen,
    greeting: "Hello, this is Emma with Bright Minds Tutoring! How can I help?",
    conversation: [
      { role: "ai" as const, text: "Hello, this is Emma with Bright Minds Tutoring! How can I help?", delay: 0 },
      { role: "caller" as const, text: "My daughter is struggling with algebra. We need a tutor to help her get ready for her final exam.", delay: 3300 },
      { role: "ai" as const, text: "We can definitely help her ace that exam! Our math tutor, Marcus, specializes in algebra and has a ninety-two percent pass rate. Sessions are sixty dollars an hour, and most students need four to six sessions before a final. Should we get started?", delay: 6000 },
      { role: "caller" as const, text: "Yeah, when can we start?", delay: 1800 },
      { role: "ai" as const, text: "Marcus has openings starting tomorrow evening. He can do in-person or online — your choice. What works best for your daughter's schedule?", delay: 4800 },
    ],
  },
  {
    id: "moving",
    industry: "Moving Company",
    label: "Moving Estimate",
    icon: Truck,
    greeting: "Thanks for calling Swift Movers! This is Alex. Where are you moving from and to?",
    conversation: [
      { role: "ai" as const, text: "Thanks for calling Swift Movers! This is Alex. Where are you moving from and to?", delay: 0 },
      { role: "caller" as const, text: "We're moving from a two-bedroom apartment downtown to a house about twenty miles away. We need movers this weekend.", delay: 3400 },
      { role: "ai" as const, text: "Great! This weekend is doable, but it's getting busy. A two-bedroom apartment with a truck and two movers typically runs between eight hundred fifty and twelve hundred, depending on your stuff. I can schedule a free estimate today, or I can give you a rough quote. Which do you prefer?", delay: 6200 },
      { role: "caller" as const, text: "A rough quote is fine. Do you charge extra for heavy furniture?", delay: 2500 },
      { role: "ai" as const, text: "Nope, it's all included in our flat rate. We handle everything professionally and insure your belongings. I have Saturday at 9 AM or Sunday at 1 PM available. Want me to book one of those?", delay: 5800 },
    ],
  },
  {
    id: "wedding",
    industry: "Wedding Planning",
    label: "Wedding Consultation",
    icon: Heart,
    greeting: "Congratulations on your engagement! This is Sarah with Bliss Weddings. How can I help?",
    conversation: [
      { role: "ai" as const, text: "Congratulations on your engagement! This is Sarah with Bliss Weddings. How can I help?", delay: 0 },
      { role: "caller" as const, text: "We're getting married in October and we need help planning everything. Where do we even start?", delay: 3500 },
      { role: "ai" as const, text: "How exciting! October is a beautiful time to get married. We offer full-service planning or day-of coordination — it really depends on your needs. Most couples book us about twelve months out, so you're perfectly timed. How many guests are you thinking?", delay: 6000 },
      { role: "caller" as const, text: "Around one hundred twenty-five.", delay: 1800 },
      { role: "ai" as const, text: "Perfect! For a wedding that size, full-service planning is around three thousand. We handle venues, vendors, design, and timelines. I'd love to sit down with you and your fiancé. Can you do coffee next Saturday?", delay: 5500 },
    ],
  },
  {
    id: "daycare",
    industry: "Daycare / Childcare",
    label: "Enrollment Inquiry",
    icon: Baby,
    greeting: "Hi! Thanks for calling Sunny Days Daycare. This is Sarah. How can I help?",
    conversation: [
      { role: "ai" as const, text: "Hi! Thanks for calling Sunny Days Daycare. This is Sarah. How can I help?", delay: 0 },
      { role: "caller" as const, text: "We're looking for a daycare for our three-year-old. Do you have any openings?", delay: 3200 },
      { role: "ai" as const, text: "We'd love to meet your little one! We do have one opening in our preschool class. We're state-licensed, have a ten-to-one teacher ratio, and focus on play-based learning. Our rates are fourteen hundred a month for full-time. Would you like to schedule a tour?", delay: 6000 },
      { role: "caller" as const, text: "Yes, a tour would be great. When can we come by?", delay: 2200 },
      { role: "ai" as const, text: "I have tomorrow morning at 10 AM or Wednesday afternoon at 2 PM. We can show you the classrooms, meet our teachers, and answer all your questions. Which works better?", delay: 5000 },
    ],
  },
  {
    id: "pestcontrol",
    industry: "Pest Control",
    label: "Pest Inspection",
    icon: Bug,
    greeting: "This is Alex with BugFree Pest Control. What's bugging you today?",
    conversation: [
      { role: "ai" as const, text: "This is Alex with BugFree Pest Control. What's bugging you today?", delay: 0 },
      { role: "caller" as const, text: "I've been seeing some termites in my basement. I need to get this checked out before it gets worse.", delay: 3300 },
      { role: "ai" as const, text: "Termites are definitely something we want to address fast. I can schedule a free inspection today or tomorrow — our inspector uses a thermal camera to find hidden damage. Most inspections take about an hour. What's your address?", delay: 5800 },
      { role: "caller" as const, text: "It's 456 Oak Lane.", delay: 1500 },
      { role: "ai" as const, text: "Got it. I have today at 3 PM or tomorrow morning at 9 AM. I'll dispatch our inspector and he'll give you a full report with treatment options. Most termite treatments are fully guaranteed. What works for you?", delay: 5500 },
    ],
  },
  {
    id: "spa",
    industry: "Spa & Massage",
    label: "Massage Booking",
    icon: Waves,
    greeting: "Welcome to Serenity Spa! This is Emma. How can we relax you today?",
    conversation: [
      { role: "ai" as const, text: "Welcome to Serenity Spa! This is Emma. How can we relax you today?", delay: 0 },
      { role: "caller" as const, text: "I've been super stressed and need a massage. What options do you have?", delay: 3000 },
      { role: "ai" as const, text: "Perfect timing! We offer Swedish, deep tissue, hot stone, and therapeutic massage. Most clients start with our Swedish massage if they're new — it's super relaxing. Sixty minutes is one hundred dollars, and our therapists are incredibly good. When would you like to come in?", delay: 6200 },
      { role: "caller" as const, text: "This weekend if you have anything.", delay: 2000 },
      { role: "ai" as const, text: "Lucky you — we have Saturday at 2 PM and Sunday at 11 AM available. Both are with our most popular therapist, Lisa. Which feels better for your schedule?", delay: 5200 },
    ],
  },
  {
    id: "financial",
    industry: "Financial Advisor",
    label: "Retirement Planning",
    icon: DollarSign,
    greeting: "Welcome to Wealth Partners Financial. This is Alex. How can I help secure your future?",
    conversation: [
      { role: "ai" as const, text: "Welcome to Wealth Partners Financial. This is Alex. How can I help secure your future?", delay: 0 },
      { role: "caller" as const, text: "I'm thinking about retiring in ten years and I want to make sure I'm on track financially.", delay: 3400 },
      { role: "ai" as const, text: "That's smart planning! Ten years is a solid timeframe to make a real difference. I'd recommend a comprehensive retirement analysis — we look at your current savings, Social Security projections, and create a tailored strategy. The consultation is free. Do you want to schedule that?", delay: 6200 },
      { role: "caller" as const, text: "Yeah, absolutely. What do I need to bring?", delay: 2000 },
      { role: "ai" as const, text: "Just recent statements from your 401k, IRA, and any brokerage accounts. We have openings tomorrow at 1 PM or Friday at 10 AM. Which time works for you?", delay: 5200 },
    ],
  },
  {
    id: "physicaltherapy",
    industry: "Physical Therapy",
    label: "PT Appointment",
    icon: HeartPulse,
    greeting: "Hi there, thanks for calling Motion Therapy Center! This is Sarah. How can I help?",
    conversation: [
      { role: "ai" as const, text: "Hi there, thanks for calling Motion Therapy Center! This is Sarah. How can I help?", delay: 0 },
      { role: "caller" as const, text: "I injured my shoulder and my doctor referred me for physical therapy.", delay: 2800 },
      { role: "ai" as const, text: "We're great with shoulder injuries — our therapists will get you back to full strength. Your first visit is a comprehensive evaluation, and we'll create a personalized treatment plan. We're in-network with most insurance plans. When would you like to come in?", delay: 6000 },
      { role: "caller" as const, text: "I'm pretty busy. Do you have early morning appointments?", delay: 2500 },
      { role: "ai" as const, text: "Absolutely! We open at 6 AM on weekdays. I have Tuesday at 6:30 AM or Thursday at 7 AM available. Most patients come twice a week for six to eight weeks. Which time works?", delay: 5500 },
    ],
  },
  {
    id: "locksmith",
    industry: "Locksmith",
    label: "Emergency Lockout",
    icon: Key,
    greeting: "This is Alex with TrueLock Emergency Services. Is this an emergency lockout?",
    conversation: [
      { role: "ai" as const, text: "This is Alex with TrueLock Emergency Services. Is this an emergency lockout?", delay: 0 },
      { role: "caller" as const, text: "Yes! I'm locked out of my car in a parking lot. I have to pick my kid up in an hour.", delay: 3200 },
      { role: "ai" as const, text: "No problem — we can absolutely get you into your car quickly. We're fifteen minutes away and available right now. The emergency lockout service is sixty-nine dollars, and we accept all major cards. What's your location?", delay: 5800 },
      { role: "caller" as const, text: "Downtown mall parking lot, third level near Macy's.", delay: 2200 },
      { role: "ai" as const, text: "Perfect. I'm dispatching our tech right now — he'll be there in about fifteen minutes. His name is Mike and he'll text you when he's close. We'll have you on your way in minutes. Stay put!", delay: 5500 },
    ],
  },
  {
    id: "poolservice",
    industry: "Pool Service",
    label: "Pool Maintenance Schedule",
    icon: Droplet,
    greeting: "Hi! Thanks for calling Crystal Clear Pools. This is Emma. What can I help with?",
    conversation: [
      { role: "ai" as const, text: "Hi! Thanks for calling Crystal Clear Pools. This is Emma. What can I help with?", delay: 0 },
      { role: "caller" as const, text: "It's our first summer with a pool and we need someone to maintain it. What do you recommend?", delay: 3300 },
      { role: "ai" as const, text: "Weekly service is the way to go — we clean, balance chemicals, and check equipment every week. Most residential pools run about seventy-five a week. We're fully insured, and our customers love the peace of mind. Should we set up a time for me to see your pool?", delay: 6000 },
      { role: "caller" as const, text: "Yeah, let's do it. When can you come out?", delay: 2000 },
      { role: "ai" as const, text: "I can send someone out this Saturday morning between 9 and 11. He'll assess your pool and give you a detailed quote. How does that sound?", delay: 4800 },
    ],
  },
  {
    id: "electrician",
    industry: "Electrician",
    label: "Electrical Inspection",
    icon: Zap,
    greeting: "Hi, this is Alex with Bright Electrical Solutions. What's your electrical issue?",
    conversation: [
      { role: "ai" as const, text: "Hi, this is Alex with Bright Electrical Solutions. What's your electrical issue?", delay: 0 },
      { role: "caller" as const, text: "I keep having outlets go out in my kitchen and I'm not sure what's wrong. Is it safe?", delay: 3300 },
      { role: "ai" as const, text: "Those outlets could be on a bad breaker — we need to get that checked out to keep your family safe. I can schedule a full diagnostic inspection today or tomorrow. It's eighty-nine dollars and includes recommendations. We're licensed and insured. What works for you?", delay: 6000 },
      { role: "caller" as const, text: "Can you come today?", delay: 1500 },
      { role: "ai" as const, text: "Let me check our schedule. We have 4 PM available this afternoon. Our electrician will inspect everything, find the problem, and give you a quote before any repair work. Sound good?", delay: 5500 },
    ],
  },
  {
    id: "florist",
    industry: "Florist",
    label: "Event Flower Arrangement",
    icon: Sparkles,
    greeting: "Welcome to Petals & Stems Florist! This is Sarah. What can we grow for you?",
    conversation: [
      { role: "ai" as const, text: "Welcome to Petals & Stems Florist! This is Sarah. What can we grow for you?", delay: 0 },
      { role: "caller" as const, text: "I'm having a corporate event next month and I need flower arrangements for the tables.", delay: 3200 },
      { role: "ai" as const, text: "How lovely! Corporate events are our specialty. We create custom arrangements that wow your guests. The cost depends on size and flowers, but typically center arrangements run forty to seventy-five each. How many tables are we talking?", delay: 5800 },
      { role: "caller" as const, text: "We have twenty tables and I want something elegant but not too formal.", delay: 2800 },
      { role: "ai" as const, text: "Perfect! For twenty tables with elegant mixed arrangements, we're looking at around fifteen hundred. I'd love to schedule a consultation to show you options. Can you come by this week?", delay: 5200 },
    ],
  },
  {
    id: "catering",
    industry: "Catering",
    label: "Event Catering Quote",
    icon: UtensilsCrossed,
    greeting: "Hi, this is Emma with Gourmet Events Catering! How can we serve you?",
    conversation: [
      { role: "ai" as const, text: "Hi, this is Emma with Gourmet Events Catering! How can we serve you?", delay: 0 },
      { role: "caller" as const, text: "We're throwing a company party for seventy-five people and we need catering.", delay: 3000 },
      { role: "ai" as const, text: "Great! We'd love to cater your event. For seventy-five people, we typically offer several menu packages from casual to upscale. Our most popular is our buffet service at thirty-five per person, which includes three entrees, sides, dessert, and our bartender. What's your vibe?", delay: 6200 },
      { role: "caller" as const, text: "Something nice but not over the top. What dates do you have available?", delay: 2500 },
      { role: "ai" as const, text: "We're booked most weekends, but we have availability next Thursday or the following Saturday. Both work great for corporate events. I can send you our full menu and pricing. What email should I use?", delay: 5500 },
    ],
  },
  {
    id: "itsupport",
    industry: "IT Support",
    label: "Tech Support Ticket",
    icon: Lightbulb,
    greeting: "Hello, thanks for calling TechCare Support. This is Alex. What's happening with your system?",
    conversation: [
      { role: "ai" as const, text: "Hello, thanks for calling TechCare Support. This is Alex. What's happening with your system?", delay: 0 },
      { role: "caller" as const, text: "My laptop won't connect to the internet. I have an important meeting in two hours.", delay: 3200 },
      { role: "ai" as const, text: "Let's get you back online fast! I can remote in right now and diagnose the issue — usually takes ten to fifteen minutes. We're running same-day support, no hold time. Can I connect to your machine?", delay: 5800 },
      { role: "caller" as const, text: "Yeah, please do. How do I let you in?", delay: 1800 },
      { role: "ai" as const, text: "I'll send you a secure link to your email. Click it and I'll be able to see your screen. I'll fix this and have you back online well before your meeting. Check your email now.", delay: 5200 },
    ],
  },
] as const;

/* ─── Animated Waveform ─── */
function VoiceWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full transition-[height]"
          style={{
            height: active ? `${12 + Math.sin(i * 0.8 + Date.now() * 0.005) * 14}px` : "4px",
            background: active
              ? `linear-gradient(to top, rgb(52, 211, 153), rgb(16, 185, 129))`
              : "rgba(255,255,255,0.15)",
            animation: active ? `wave ${0.6 + (i % 5) * 0.15}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes wave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

/* ─── Main Widget ─── */
export function VoicePreviewWidget({ compact = false }: { compact?: boolean }) {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const [audioLoading, setAudioLoading] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scenario = SCENARIOS[selectedScenario];

  const stopPlayback = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Also cancel any browser TTS
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
    setCurrentLine(-1);
  }, []);

  const playConversation = useCallback(async () => {
    if (playing) {
      stopPlayback();
      return;
    }

    // Show loading state immediately for perceived speed
    setAudioLoading(true);
    setPlaying(true);
    setCurrentLine(0);

    // Map scenario voice names to real Recall voice IDs for maximum human realism
    const voiceIdMap: Record<string, string> = {
      hvac: "us-female-warm-receptionist",       // Sarah — warm, empathetic
      dental: "us-female-casual",                 // Emma — casual, friendly
      legal: "us-male-professional",              // Alex — professional, authoritative
      roofing: "us-female-warm-receptionist",     // Sarah — warm, reassuring
      restaurant: "us-female-casual",             // Emma — casual, friendly
      realestate: "us-female-warm-receptionist",  // Sarah — warm, knowledgeable
      medspa: "us-female-casual",                 // Emma — friendly, informative
      auto: "us-male-professional",               // Alex — confident, technical
      insurance: "us-male-professional",          // Alex — professional, expert
      fitness: "us-female-casual",                // Emma — casual, energetic
      accounting: "us-male-professional",         // Alex — professional, knowledgeable
      petcare: "us-female-warm-receptionist",     // Sarah — warm, caring
      cleaning: "us-female-casual",               // Emma — casual, friendly
      photography: "us-female-warm-receptionist", // Sarah — warm, personable
      plumbing: "us-male-professional",           // Alex — confident, technical
      ecommerce: "us-female-warm-receptionist",   // Sarah — warm, helpful
      chiropractic: "us-female-warm-receptionist", // Sarah — warm, caring
      landscaping: "us-male-professional",        // Alex — confident, technical
      tutoring: "us-female-casual",               // Emma — friendly, supportive
      moving: "us-male-professional",             // Alex — professional, organized
      wedding: "us-female-warm-receptionist",     // Sarah — warm, enthusiastic
      daycare: "us-female-warm-receptionist",     // Sarah — warm, nurturing
      pestcontrol: "us-male-professional",        // Alex — professional, reassuring
      spa: "us-female-casual",                    // Emma — casual, relaxing
      financial: "us-male-professional",          // Alex — professional, authoritative
      physicaltherapy: "us-female-warm-receptionist", // Sarah — warm, encouraging
      locksmith: "us-male-professional",          // Alex — professional, urgent
      poolservice: "us-female-casual",            // Emma — casual, friendly
      electrician: "us-male-professional",        // Alex — professional, technical
      florist: "us-female-warm-receptionist",     // Sarah — warm, creative
      catering: "us-female-casual",               // Emma — friendly, enthusiastic
      itsupport: "us-male-professional",          // Alex — professional, technical
    };
    const voiceId = voiceIdMap[scenario.id] || "us-female-warm-receptionist";

    // Try to play the AI greeting via voice API, with browser TTS fallback
    try {
      const res = await fetch(
        `/api/demo/voice-preview?voice_id=${voiceId}&text=${encodeURIComponent(scenario.greeting)}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      }
      // No fallback to browser TTS — better silent than robotic
    } catch {
      // Voice API unavailable — do NOT fall back to robot browser TTS
    } finally {
      setAudioLoading(false);
    }

    // Animate through conversation lines
    let cumulativeDelay = 0;
    scenario.conversation.forEach((line, i) => {
      cumulativeDelay += (i === 0 ? 800 : line.delay);
      const t = setTimeout(() => {
        setCurrentLine(i);
        // Auto-scroll to current line
        if (containerRef.current) {
          const el = containerRef.current.querySelector(`[data-line="${i}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        // Try to play AI lines via voice API with proper human-quality voice
        if (line.role === "ai" && i > 0) {
          fetch(
            `/api/demo/voice-preview?voice_id=${voiceId}&text=${encodeURIComponent(line.text)}`
          )
            .then((r) => (r.ok ? r.blob() : null))
            .then((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = new Audio(url);
                audioRef.current = a;
                a.onended = () => URL.revokeObjectURL(url);
                a.play().catch((e: unknown) => { console.warn("[VoicePreviewWidget] audio play failed:", e instanceof Error ? e.message : String(e)); });
              }
              // No fallback to browser TTS — silence > robot voice
            })
            .catch((e: unknown) => {
              console.warn("[VoicePreviewWidget] fetch failed:", e instanceof Error ? e.message : String(e));
              // Voice API unavailable — do NOT fall back to robot browser TTS
            });
        }
      }, cumulativeDelay);
      timeoutsRef.current.push(t);
    });

    // End playback after last line
    const endT = setTimeout(() => {
      setPlaying(false);
    }, cumulativeDelay + 4000);
    timeoutsRef.current.push(endT);
  }, [playing, scenario, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // Reset when scenario changes
  useEffect(() => {
    stopPlayback();
  }, [selectedScenario, stopPlayback]);

  if (compact) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-black/40 backdrop-blur-sm p-5 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Hear It Live</p>
            <p className="text-xs text-[var(--text-tertiary)]">Click play to hear our AI operator</p>
          </div>
        </div>
        <VoiceWaveform active={playing} />
        <button
          onClick={playConversation}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,border-color,color,transform]"
          style={{
            background: playing ? "rgba(239,68,68,0.2)" : "rgba(52,211,153,0.15)",
            color: playing ? "rgb(248,113,113)" : "rgb(52,211,153)",
            border: `1px solid ${playing ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)"}`,
          }}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {playing ? "Stop" : "Play Sample Call"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-gradient-to-b from-white/[0.03] to-black/40 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Phone className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Hear Our AI In Action</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                Live Preview
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Real conversations. Real AI. Zero robots.
            </p>
          </div>
        </div>

        {/* Industry Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-[background-color,border-color,color] whitespace-nowrap ${
                selectedScenario === i
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-white/70"
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Area */}
      <div ref={containerRef} className="px-6 py-4 min-h-[280px] max-h-[360px] overflow-y-auto space-y-3">
        {!playing && currentLine === -1 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Sparkles className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              Press play to hear a live {scenario.industry} call
            </p>
            <p className="text-xs text-[var(--text-tertiary)] max-w-xs">
              This is an actual AI voice — not a recording. It sounds this natural on every call, 24/7.
            </p>
          </div>
        ) : (
          scenario.conversation.map((line, i) => {
            if (i > currentLine) return null;
            const isAI = line.role === "ai";
            return (
              <div
                key={i}
                data-line={i}
                className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"} ${
                  i === currentLine ? "animate-fadeIn" : ""
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isAI
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {isAI ? <Mic className="w-3.5 h-3.5" /> : "C"}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isAI
                      ? "bg-emerald-500/10 text-white/90 border border-emerald-500/10"
                      : "bg-white/5 text-white/70 border border-white/5"
                  }`}
                >
                  {line.text}
                  {i === currentLine && playing && isAI && (
                    <span className="inline-block ml-1 w-1.5 h-4 bg-emerald-400 rounded-sm animate-pulse" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-4">
          <button
            onClick={playConversation}
            disabled={audioLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,border-color,color,transform]"
            style={{
              background: playing ? "rgba(239,68,68,0.15)" : "rgb(16, 185, 129)",
              color: playing ? "rgb(248,113,113)" : "black",
              border: playing ? "1px solid rgba(239,68,68,0.3)" : "none",
            }}
          >
            {audioLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {audioLoading ? "Loading..." : playing ? "Stop" : "Play Call"}
          </button>
          <VoiceWaveform active={playing} />
        </div>
        {!playing && currentLine === -1 && (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Turn your volume up for the best experience
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
