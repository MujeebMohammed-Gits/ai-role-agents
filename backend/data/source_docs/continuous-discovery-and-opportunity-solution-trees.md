---
module_id: continuous-discovery-and-opportunity-solution-trees
domain: product-discovery-and-user-research
target_roles: [product-manager-agent, product-owner-agent, user-research-agent, business-analyst-agent]
frameworks: [Continuous Discovery Habits (Teresa Torres), SVPG Four Big Risks (Marty Cagan), Jobs-to-be-Done (JTBD), Atomic Research, Assumption Testing]
rag_chunk_strategy: split-by-h2
---

# Framework Architecture: Continuous Discovery & Opportunity Solution Trees (OST)

## 1. Strategic Mandate & Core Philosophy
Continuous Discovery is the disciplined, weekly cadence by which a Product Trio (**Product Manager**, **Product Designer/User Researcher**, and **Tech Lead**) engages directly with customers to discover what to build next, rather than relying on episodic, big-bang upfront research or stakeholder feature wishlists.

* **Core Equation:** Business Outcome = Driven by Product Outcomes = Unlocked by Solving Customer Opportunities = Validated through Rapid Assumption Tests.
* **Dual-Track Agile Integration:** Discovery (learning fast what creates value) and Delivery (building scalable, production-grade software) run continuously in parallel, not as sequential waterfall handoffs.
* **Anti-Pattern Guardrail:** Never fall in love with a single solution idea ("Feature Factory" syndrome). Always compare and contrast multiple candidate solutions against the same target opportunity.

## 2. The Product Trio & Cross-Functional Accountability
To eliminate handoff friction and blind spots across Marty Cagan’s **Four Big Risks** (Value, Usability, Feasibility, Business Viability), discovery is co-owned by a cross-functional Product Trio:

| Role | Primary Discovery Lens | Core Risk Ownership | Key Contribution in Weekly Cadence |
| :--- | :--- | :--- | :--- |
| **Product Manager** | Business viability, strategic alignment, market economics | **Business Viability Risk** & **Value Risk** | Translates company OKRs into actionable Product Outcomes; ensures commercial sustainability and legal/compliance fit. |
| **User Researcher / Designer** | Human behavior, mental models, interaction workflows, accessibility | **Usability Risk** & **Value Risk** | Leads generative interviewing, synthesizes interview snapshots, designs prototypes, and runs evaluative usability tests. |
| **Tech Lead / Staff Engineer** | Technical feasibility, architectural constraints, data availability, effort | **Feasibility Risk** | Identifies low-cost technical spikes, spots hidden architectural enablers, and estimates relative complexity early. |

## 3. Anatomy of an Opportunity Solution Tree (OST)
An Opportunity Solution Tree is a non-linear visual and structural artifact that maps the path from a desired business/product outcome to validated solutions.

### Level 1: Clear Desired Outcome (The Root)
* **Business Outcome:** Lagging financial or market metrics (e.g., *Increase Net Dollar Retention from 105% to 115%* or *Reduce Customer Churn by 15%*). Usually owned at the executive/portfolio level.
* **Product Outcome:** Leading behavioral metrics within the Product Trio’s direct control that predict the Business Outcome (e.g., *Increase weekly active collaboration sessions per workspace from 2 to 5* or *Reduce time-to-first-value from 14 days to <24 hours*).
* **Traction Metrics vs. Health Metrics:** Pair every primary Product Outcome with counter-balancing Health Metrics (e.g., latency, support ticket volume, NPS) to prevent local optimization that harms overall system health.

### Level 2: Opportunity Space (Customer Needs, Pain Points & Desires)
* **Definition:** Opportunities are *unmet customer needs, pain points, or desires* framed strictly from the customer's perspective—never disguised solutions (e.g., *"I don't know if my teammate already reviewed this document"* is an opportunity; *"Add a 'Reviewed' badge"* is a solution).
* **Hierarchical Structuring (Parent -> Child Opportunities):**
  * Decompose broad, abstract parent opportunities into specific, addressable child leaf opportunities using **Experience Mapping** (mapping the end-to-end customer journey chronologically).
  * Group related child opportunities under shared parent themes to maintain a MECE-like structural clarity across the tree.
* **Opportunity Sizing & Prioritization Criteria:**
  1. **Opportunity Sizing:** How many customers experience this pain point, and how frequently? (Backed by behavioral telemetry + interview frequency).
  2. **Market Factors:** Does solving this create competitive differentiation or address table-stakes parity?
  3. **Company Factors:** Does this align with our current strategic vision, competencies, and unit economics?
  4. **Customer Factors:** How severe is the pain, and how dissatisfied are users with existing workarounds?
* **Rule of One Target Opportunity:** At any given moment, the Product Trio selects **one** high-leverage leaf opportunity to pursue, explicitly deprioritizing sibling branches until the target opportunity is either solved or invalidated.

### Level 3: Solution Space (Ideation & Contrast)
* **Multi-Solution Mandate:** Generate **at least 3 distinct, mutually contrasting solutions** for the single target leaf opportunity to avoid confirmation bias ("whether or not" thinking) and foster "compare and contrast" decision-making.
* **Solution Eligibility Rule:** Every solution node on the OST must directly address the parent leaf opportunity. Orphan solutions that do not connect to a validated customer opportunity are pruned immediately.

### Level 4: Assumption Mapping & Experimentation (The Leaves)
Instead of building an entire solution to test if it works, decompose the top 3 candidate solutions into their underlying **leap-of-faith assumptions** and test the riskiest assumptions simultaneously.

## 4. End-to-End Continuous Interviewing & Story-Based Elicitation Protocol
1. **Continuous Recruiting Automation:**
   * Embed in-app triggers, customer support handoffs, and CRM hooks to automatically schedule **at least 1–2 customer interviews every week** without manual calendar chasing.
2. **Story-Based Interviewing (Preventing Cognitive Bias):**
   * **Forbidden Questions:** Never ask speculative or generalized questions (*"Would you use a feature that does X?"*, *"What features do you wish we had?"*, *"How often do you usually do Y?"*).
   * **Required Prompting:** Anchor every question in a specific past instance (*"Tell me about the last time you [performed target behavior]. Walk me through exactly what happened step-by-step."*).
3. **Atomic Research & Interview Snapshots:**
   * Synthesize every interview within 24 hours into a standardized one-page **Interview Snapshot** containing:
     * **Participant Profile & Context** (behavioral segment, role, tenure).
     * **Memorable Quote** (verbatim evidence).
     * **Timeline / Experience Map Highlights** (concrete actions taken, tools used, workarounds).
     * **Extracted Opportunities** (tagged with taxonomy IDs and linked to OST nodes).
     * **Quick Facts & Behavioral Insights** (verifiable observations vs. subjective interpretations).

## 5. Assumption Mapping & Rapid Experimentation Matrix
Deconstruct candidate solutions across **Five Assumption Categories**:
1. **Desirability Assumptions:** *Does the customer actually want this? Will they derive value from it?*
2. **Usability Assumptions:** *Can the customer find it, understand it, and complete the workflow without friction?*
3. **Feasibility Assumptions:** *Can we build, scale, and maintain this within our technical, data, and latency constraints?*
4. **Viability Assumptions:** *Does the unit economics work (LTV:CAC, margin)? Does it comply with legal, privacy, and security rules?*
5. **Ethical Assumptions:** *Could this feature create unintended harm, bias, dark patterns, or data misuse?*

### 2x2 Assumption Prioritization Grid (Importance vs. Evidence)
* **Quadrant 1 (High Importance / Low Evidence — "Leap of Faith"):** **TEST IMMEDIATELY.** If false, the entire solution collapses, and we currently lack empirical proof.
* **Quadrant 2 (High Importance / High Evidence):** Proceed to delivery; risk is already mitigated.
* **Quadrant 3 (Low Importance / Low Evidence):** Ignore for now; do not waste discovery cycles on minor details.
* **Quadrant 4 (Low Importance / High Evidence):** Baseline table-stakes knowledge.

### Rapid Assumption Testing Toolkit (Ranked by Speed & Cost)
| Experiment Method | Target Risk | Setup Time | Execution Mechanics & Success Criteria |
| :--- | :--- | :--- | :--- |
| **1-Question Micro-Survey** | Desirability / Frequency | < 2 hours | Triggered contextually in-product right after a user completes a related workflow to measure prevalence. |
| **Unmoderated Concept / Prototype Test** | Usability / Comprehension | 1–2 days | Present clickable Figma wireframes for 3 competing solutions to 5–8 users; measure task completion & comprehension. |
| **Fake Door / Painted Door Test** | Desirability / Intent | 1–3 days | Expose a lightweight UI entry point (button/menu item) for a proposed capability; measure click-through conversion and capture qualitative intent. |
| **Wizard of Oz / Concierge MVP** | Value / Viability | 3–7 days | Deliver the outcome manually behind the scenes while presenting a seamless front-end experience; validate willingness to pay/adopt before writing backend automation. |
| **Technical Feasibility Spike** | Feasibility / Latency | 1–3 days | Time-boxed engineering prototype testing third-party API limits, ML model accuracy, or database throughput under load. |

## 6. Governance & Handover to Delivery (Product Manager -> Product Owner / Engineering)
* **Definition of Validated Discovery:** A solution graduates from the OST into the **Product Backlog** only when:
  1. It links cleanly to a prioritized Leaf Opportunity and active Product Outcome.
  2. Its top Leap-of-Faith assumptions have passed pre-defined quantitative/qualitative success thresholds.
  3. Technical feasibility and non-functional requirements (security, privacy, scalability) have been verified by the Tech Lead.
* **Post-Launch Outcome Tracking:** Once delivered, the Product Manager and Product Owner track the live **Product Outcome metric** over 2–4 weeks. If the shipped feature fails to move the target metric, the Product Trio conducts a discovery retrospective to diagnose whether the opportunity was mis-sized or the solution execution missed the mark.

## 7. Anti-Patterns Checklist for Agent Self-Audit
* **Disguised Solutions in the Opportunity Space:** Writing *"Users need a bulk-export CSV button"* instead of *"Users struggle to reconcile transaction records across external accounting tools."*
* **Single-Option Tunnel Vision:** Testing only one solution idea and interpreting polite user feedback as validation.
* **Orphan Backlogs:** Allowing sprint tickets into delivery that cannot trace their lineage up to an Opportunity and a Product Outcome.
* **Confirmation Bias in Experiments:** Running tests without defining **explicit pass/fail falsification criteria** before launching the experiment.
