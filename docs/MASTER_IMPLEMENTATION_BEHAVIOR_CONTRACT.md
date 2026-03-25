# MASTER IMPLEMENTATION BEHAVIOR CONTRACT

**Source contract for implementation behavior. Living contract: [SYSTEM_DOCTRINE.md](./SYSTEM_DOCTRINE.md).**

---

You are not implementing a SaaS application.
You are implementing operational infrastructure.

The primary risk during development is feature drift.
Most software accidentally becomes a tool.
This system must remain an environment.

At every implementation decision you must protect the doctrine.

---

# CORE DECISION RULE

When choosing between:
A) making behavior automatic
B) exposing controls to the user

Always choose A unless it violates authority boundaries.

The system acts.
The interface reveals.

Never reverse this relationship.

---

# WHAT YOU MUST NEVER ADD

Do not add:

- dashboards  
- analytics panels  
- performance metrics  
- activity feeds  
- optimization suggestions  
- recommendations  
- manual workflows  
- automation builders  
- editable pipelines  
- user configuration logic  
- productivity tooling  
- engagement mechanics  
- usage-driving notifications  

If a feature teaches the user how to operate the business, it is incorrect.

---

# HOW FEATURES MUST BE DESIGNED

Every capability must follow this order:

1) detect operational reality  
2) determine authority  
3) enforce outcome or create entry  
4) produce proof  

You may not expose intermediate steps to the user.

The user sees boundaries, not mechanics.

---

# THE AUTOMATION RULE

The system does not offer options.
It executes the only valid operational path.

If multiple paths exist, authority resolution decides.
If authority is unclear, create an entry.

Never ask the user what to do when the system can determine what must happen.

---

# FAILURE HANDLING RULE

Failures are not retried silently.
Failures produce entries.

The system must never appear successful while uncertain.

---

# INTERFACE RULE

The UI is a record surface.

It exists only to show:
- state  
- entries  
- authority boundaries  
- attestations  

If a screen increases interaction time, it is wrong.

The correct UI minimizes visits.

---

# IMPLEMENTATION PRIORITY ORDER

Always build in this order:

1) prevent silent failure  
2) guarantee completion  
3) preserve responsibility clarity  
4) prove outcomes  
5) reduce interaction  

Never build convenience features before reliability behaviors.

---

# FINAL DIRECTIVE

You are not optimizing usability.
You are optimizing operational certainty.

A normal product becomes more valuable when used more.
This system becomes more valuable when it requires less attention.

If the software becomes interesting to explore, you are building the wrong product.
If the software becomes unnecessary to check, you are building the correct one.
