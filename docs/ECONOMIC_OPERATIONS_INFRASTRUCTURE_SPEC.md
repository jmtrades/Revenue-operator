# ECONOMIC OPERATIONS INFRASTRUCTURE — SPEC

**Canonical spec. Living contract: [SYSTEM_DOCTRINE.md](./SYSTEM_DOCTRINE.md). Build all future architecture and code to preserve these properties.**

---

You are building a production system called **ECONOMIC OPERATIONS INFRASTRUCTURE**.

This is NOT software used by a business.  
This is an **environment a business operates inside**.

The system's job is to **continuously move real-world operations toward successful outcomes** while **preventing silent failure**.

The interface is only a record surface.  
Behavior is the product.

---

## CORE PRINCIPLE

The system must **eliminate operational entropy**.

Businesses naturally decay:

- leads cool  
- staff forget  
- payments stall  
- responsibility blurs  
- customers drift  

The system **continuously counteracts this** without requiring human supervision.

**If a user must manage, configure, or monitor the system — the implementation is wrong.**

---

## WHAT THE SYSTEM GUARANTEES

1. Every commitment reaches an outcome.  
2. Lost revenue is detected and recovered when possible.  
3. Responsibility is always clear.  
4. No failure is silent.  
5. Business state is provable from records.  

---

## OPERATIONAL CHAIN (MANDATORY)

All behavior MUST follow this pipeline:

**Signal → State → Decision → Authority → Action → Delivery → Reconciliation → Closure → Integrity → Proof**

Nothing may execute outside the chain.  
External integrations are adapters only.  
**The chain owns reality.**

---

## AUTHORITY RULE

Before any action:

- **If within authority** → proceed automatically  
- **If authority unclear** → create entry  
- **If outside authority** → create entry and suspend reliance  

Entries never perform work.  
Entries expose responsibility boundaries.

---

## THE FIVE ENGINES

**Completion Engine:** Ensures promises reach a clear outcome.  

**Recovery Engine:** Restores value when work stalls or fails.  

**Acceleration Engine:** Reduces time between operational steps.  

**Alignment Engine:** Maintains human coordination automatically.  

**Reputation Engine:** Prevents negative customer experience due to silence or uncertainty.  

These engines do not suggest actions.  
They **enforce outcomes or create entries.**

---

## IMPLEMENTATION RULES

Always prefer **automatic behavior** over controls.  
Never ask the user what to do if determinable.

Failures must **produce entries**, never hidden retries.

**Do NOT add:** dashboards, analytics, metrics, activity feeds, recommendations, workflow builders, automation editors, manual pipelines, productivity tooling.

**If a feature increases interaction → reject.**  
**If it reduces checking → accept.**

---

## INSTALLATION MODEL

The system installs through **observation → alignment → stabilization**.

Users do not configure the system.  
The system **learns operational patterns** and **derives authority boundaries**.

Humans only resolve **true responsibility decisions.**

---

## SUCCESS CONDITION

**With system present:** business runs predictably without supervision.

**When removed:** operations degrade and uncertainty returns.

**If users enjoy exploring the software, the product is incorrect.**  
**If users stop checking operations, the product is correct.**

---

**Build all future architecture and code to preserve these properties.**
