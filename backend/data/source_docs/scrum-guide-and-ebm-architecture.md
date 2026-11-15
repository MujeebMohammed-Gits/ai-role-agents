---
module_id: scrum-guide-and-ebm-architecture
domain: agile-delivery-and-product-management
target_agents:
  - scrum-master-agent
  - product-owner-agent
  - product-manager-agent
  - enterprise-agile-coach-agent
  - delivery-management-agent
frameworks:
  - The Scrum Guide (2020 Official Specification - Schwaber & Sutherland)
  - Evidence-Based Management Guide (EBM - Scrum.org)
  - Kanban Guide for Scrum Teams (Scrum.org)
version: 1.0.0
---

# The Official Scrum Guide (2020) & Evidence-Based Management (EBM) Architecture

## 1. Executive Mandate & Foundational Philosophy
Scrum is a lightweight framework that helps people, teams, and organizations generate value through adaptive solutions for complex problems. It is intentionally incomplete, defining only the parts required to implement Scrum theory rather than providing detailed instructions. Evidence-Based Management (EBM) complements Scrum by providing an empirical measurement framework that enables organizations to continuously improve customer outcomes, organizational capabilities, and business results under conditions of high uncertainty.

---

## 2. Scrum Theory: Empiricism & Lean Thinking
Scrum is founded on **Empiricism** (knowledge comes from experience and making decisions based on what is observed) and **Lean Thinking** (reducing waste and focusing on the essentials).

### 2.1 The Three Pillars of Empiricism
1. **Transparency:** The emergent process and work must be visible to those performing the work as well as those receiving the work. Decisions to optimize value and control risk are made based on the perceived state of the artifacts. Artifacts with low transparency lead to decisions that diminish value and increase risk.
2. **Inspection:** The Scrum artifacts and the progress toward agreed goals must be inspected frequently and diligently to detect potentially undesirable variances or problems. Inspection without adaptation is considered pointless.
3. **Adaptation:** If any aspects of a process deviate outside acceptable limits or if the resulting product is unacceptable, the process being applied or the materials being produced must be adjusted as soon as possible to minimize further deviation. Adaptation becomes more difficult when the people involved are not empowered or self-managing.

### 2.2 The Five Scrum Values
Successful use of Scrum depends on people becoming more proficient in living five values, which give direction to the Scrum Team with regard to their work, actions, and behavior:
* **Commitment:** The Scrum Team commits to achieving its goals and to supporting each other.
* **Focus:** Their primary focus is on the work of the Sprint to make the best possible progress toward these goals.
* **Openness:** The Scrum Team and its stakeholders are open about the work and the challenges.
* **Respect:** Scrum Team members respect each other to be capable, independent people, and are respected as such by the people with whom they work.
* **Courage:** The Scrum Team members have the courage to do the right thing, to work on tough problems.

---

## 3. The Scrum Team & Accountabilities
The fundamental unit of Scrum is a small team of people, a **Scrum Team** (typically 10 or fewer people). There are no sub-teams or hierarchies within a Scrum Team. It is a cohesive unit of professionals focused on one objective at a time: the **Product Goal**. Scrum Teams are **cross-functional** (members have all the skills necessary to create value each Sprint) and **self-managing** (they internally decide who does what, when, and how).

### 3.1 Developers
The people in the Scrum Team that are committed to creating any aspect of a usable Increment each Sprint. Specific accountabilities include:
* Creating a plan for the Sprint, the **Sprint Backlog**.
* Instilling quality by adhering to a **Definition of Done**.
* Adapting their plan each day toward the **Sprint Goal**.
* Holding each other accountable as professionals.

### 3.2 Product Owner (PO)
Accountable for maximizing the value of the product resulting from the work of the Scrum Team. The PO is **one person, not a committee**, and the entire organization must respect their decisions for the PO to succeed. Specific accountabilities include:
* Developing and explicitly communicating the **Product Goal**.
* Creating and clearly communicating **Product Backlog** items.
* Ordering Product Backlog items.
* Ensuring that the Product Backlog is transparent, visible, and understood.

### 3.3 Scrum Master (SM)
Accountable for establishing Scrum as defined in the Scrum Guide by helping everyone understand Scrum theory and practice, both within the Scrum Team and the organization. Also accountable for the Scrum Team’s effectiveness.
* **Serving the Scrum Team:** Coaching team members in self-management and cross-functionality; helping the Scrum Team focus on creating high-value Increments that meet the Definition of Done; causing the removal of impediments to the Scrum Team’s progress; ensuring all Scrum events take place and are positive, productive, and kept within the timebox.
* **Serving the Product Owner:** Helping find techniques for effective Product Goal definition and Product Backlog management; helping the Scrum Team understand the need for clear and concise Product Backlog items; helping establish empirical product planning for a complex environment; facilitating stakeholder collaboration as requested or needed.
* **Serving the Organization:** Leading, training, and coaching the organization in its Scrum adoption; planning and advising Scrum implementations within the organization; helping employees and stakeholders understand and enact an empirical approach for complex work; removing barriers between stakeholders and Scrum Teams.

---

## 4. Scrum Events (Formal Opportunities for Inspection & Adaptation)
The Sprint is a container for all other events. Each event in Scrum is a formal opportunity to inspect and adapt Scrum artifacts.

| Event | Timebox (for 1-Month Sprint) | Primary Inspection Target | Mandatory Adaptation Outcome |
| :--- | :--- | :--- | :--- |
| **The Sprint** | 1 month or less (consistent duration) | Product Goal progress & empirical viability | A new Sprint starts immediately after the conclusion of the previous Sprint. No quality degradation; scope may be clarified/renegotiated with PO. |
| **Sprint Planning** | Max 8 hours (shorter for shorter Sprints) | Product Backlog, Team Capacity, Past Performance, Definition of Done | **Topic 1:** Why is this Sprint valuable? (**Sprint Goal**).<br>**Topic 2:** What can be Done this Sprint? (Selected PBIs).<br>**Topic 3:** How will the chosen work get done? (**Sprint Backlog**). |
| **Daily Scrum** | 15 minutes (same time & place every working day) | Progress toward the Sprint Goal & current Sprint Backlog | Actionable plan for the next day of work; self-management adjustments by Developers. |
| **Sprint Review** | Max 4 hours (shorter for shorter Sprints) | Outcome of the Sprint (Increment) & Product Goal progress with stakeholders | Adapted Product Backlog to define probable next steps and optimize value. (Never a passive slide-deck status meeting). |
| **Sprint Retrospective** | Max 3 hours (shorter for shorter Sprints) | How the last Sprint went regarding individuals, interactions, processes, tools, and Definition of Done | Most impactful improvements identified to increase quality and effectiveness; addressed as soon as possible (may be added to next Sprint Backlog). |

*Note on Sprint Cancellation:* A Sprint can be cancelled before the Sprint timebox is over if the **Sprint Goal becomes obsolete**. Only the **Product Owner** has the authority to cancel the Sprint.

---

## 5. Scrum Artifacts & Their Commitments
Scrum’s artifacts represent work or value. Each artifact contains a **commitment** to ensure it provides information that enhances transparency and focus against which progress can be measured.

### 5.1 Product Backlog -> Commitment: Product Goal
* **Product Backlog:** An emergent, ordered list of what is needed to improve the product. It is the single source of work undertaken by the Scrum Team. Product Backlog refinement is the act of breaking down and further defining Product Backlog items into smaller, more precise items.
* **Product Goal:** Describes a future state of the product which can serve as a target for the Scrum Team to plan against. It is the long-term objective for the Scrum Team. The team must fulfill (or abandon) one objective before taking on the next.

### 5.2 Sprint Backlog -> Commitment: Sprint Goal
* **Sprint Backlog:** Composed of the Sprint Goal (why), the set of Product Backlog items selected for the Sprint (what), as well as an actionable plan for delivering the Increment (how). It is a plan by and for the Developers and is updated throughout the Sprint as more is learned.
* **Sprint Goal:** The single objective for the Sprint. Although the Sprint Goal is a commitment by the Developers, it provides flexibility in terms of the exact work needed to achieve it. If the work turns out to be different than expected, Developers collaborate with the PO to negotiate the scope of the Sprint Backlog within the Sprint without affecting the Sprint Goal.

### 5.3 Increment -> Commitment: Definition of Done (DoD)
* **Increment:** A concrete stepping stone toward the Product Goal. Each Increment is additive to all prior Increments and thoroughly verified, ensuring that all Increments work together. In order to provide value, the Increment must be usable. Multiple Increments may be created within a Sprint, and an Increment may be delivered to stakeholders prior to the end of the Sprint.
* **Definition of Done (DoD):** A formal description of the state of the Increment when it meets the quality measures required for the product. The moment a Product Backlog item meets the DoD, an Increment is born. If a PBI does not meet the DoD, it cannot be released or even presented at the Sprint Review; instead, it returns to the Product Backlog for future consideration.

---

## 6. Evidence-Based Management (EBM) Architecture
Evidence-Based Management (EBM) is an empirical approach that helps organizations continuously improve customer outcomes, organizational capabilities, and business results by measuring value delivery and capability to deliver value rather than vanity activity metrics.

### 6.1 The EBM Goal Hierarchy (Navigating Complexity)
Because complex environments prevent linear predictive planning, EBM structures navigation using a nested goal and hypothesis loop:
1. **Strategic Goal:** A big, audacious, aspirational goal (often multi-year) that defines the ultimate direction of the organization (e.g., "Eliminate preventable hospital readmissions").
2. **Intermediate Goals:** Achievable milestones on the path to the Strategic Goal whose attainment indicates progress toward the Strategic Goal.
3. **Immediate Tactical Goals:** Near-term objectives (analogous to **Sprint Goals** or **Product Goals**) that guide current execution and experimentation.
4. **Starting State:** Where the organization is right now relative to the Strategic Goal, measured via baseline Key Value Measures (KVMs).

### 6.2 The EBM Experiment Loop
To move from the Starting State toward an Intermediate Goal, teams execute rapid empirical loops:
1. **Forming a Hypothesis:** Based on experience and data, formulate a specific hypothesis about how an action will move a target Key Value Measure (KVM).
2. **Running Experiments:** Make small, fast changes (Increments) designed to test the hypothesis and gather empirical evidence.
3. **Inspecting Results:** Measure the actual change in KVMs resulting from the experiment.
4. **Adapting Goals or Approach:** Validate or invalidate the hypothesis; either persevere, pivot the solution, or recalibrate the Intermediate Goal.

---

## 7. The Four Key Value Areas (KVAs) & Key Value Measures (KVMs)
EBM evaluates organizational performance across two dimensions: **Market Value** (Current Value & Unrealized Value) and **Organizational Capability** (Ability to Innovate & Time-to-Market).

### 7.1 Current Value (CV) — *Market Value*
* **Core Question:** How much value does the product deliver to customers and stakeholders right now?
* **Strategic Focus:** Maximizing realized value today while ensuring sustained customer satisfaction.
* **Standard Key Value Measures (KVMs):**
  * **Revenue per Employee:** Gross revenue divided by total employee count (indicator of competitive efficiency).
  * **Product Cost Ratio:** Total expenses and costs for the product(s)/system(s) compared to realized revenue.
  * **Employee Satisfaction:** Sentiment, engagement, and psychological safety of the people building and supporting the product.
  * **Customer Satisfaction:** Net Promoter Score (NPS), Customer Satisfaction Score (CSAT), Customer Effort Score (CES), and churn/retention rates.
  * **Customer Usage Index:** Actual feature adoption, active usage frequency, and workflow completion rates (exposing unused "shelfware" features).

### 7.2 Unrealized Value (UV) — *Market Value*
* **Core Question:** How much additional potential value could the organization realize if it met all potential customer needs?
* **Strategic Focus:** Identifying market gaps, underserved segments, and new opportunities to justify future investment.
* **Standard Key Value Measures (KVMs):**
  * **Market Share:** The relative percentage of the target market controlled by the product.
  * **Customer or User Satisfaction Gap:** The gap between a customer’s desired experience/outcome and their current experience (e.g., Opportunity Score in Outcome-Driven Innovation).
  * **Desired Customer Experience or Satisfaction:** Measures indicating what customers wish they could achieve that current solutions fail to deliver.

### 7.3 Ability to Innovate (A2I) — *Organizational Capability*
* **Core Question:** What prevents the organization from delivering new value?
* **Strategic Focus:** Maximizing capacity spent on new value creation while eliminating technical debt, operational toil, and organizational friction.
* **Standard Key Value Measures (KVMs):**
  * **Feature Usage Index:** Percentage of features actually used by customers (high unused features increase maintenance drag and reduce A2I).
  * **Innovation Rate:** Percentage of effort/budget spent on new product capabilities vs. maintaining existing systems ("lights-on" maintenance).
  * **Defect Trends:** Change in open defect counts and escaped production defects over time.
  * **On-Product Index:** Percentage of time Developers actually spend working on the product without context-switching across multiple initiatives.
  * **Installed Version Index:** Number of distinct product versions currently supported in production (version fragmentation drains engineering capacity).
  * **Technical Debt:** Accumulating code, architectural, or infrastructure shortcuts that impede future change.
  * **Production Incident Trends & Active Product Branches:** Frequency of production outages and long-lived unmerged code branches.

### 7.4 Time-to-Market (T2M) — *Organizational Capability*
* **Core Question:** How quickly can the organization learn from new experiments and deliver new value to customers?
* **Strategic Focus:** Minimizing feedback loop latency and eliminating wait states across the end-to-end delivery pipeline.
* **Standard Key Value Measures (KVMs):**
  * **Build and Integration Frequency:** How often code changes are integrated, built, and validated in automated pipelines.
  * **Release Frequency:** How often usable Increments are deployed to production users.
  * **Release Stabilization Period:** Time spent fixing bugs and hardening code between feature completion and production release (target: zero).
  * **Mean Time to Repair (MTTR):** Average elapsed time required to restore service following a production incident or failure.
  * **Cycle Time & Lead Time:** Total elapsed time from starting work (Cycle Time) or ideation/request (Lead Time) until value reaches the customer.
  * **Lead Time for Changes & Deployment Frequency:** Core DORA delivery speed indicators.
  * **Time-to-Learn:** Total elapsed time from conceiving an idea/hypothesis, building an experiment, releasing it, and measuring user behavior change.

---

## 8. Synthesis: Integrating Scrum Mechanics with EBM Governance

| Scrum Element | EBM Integration & Principal Operational Standard |
| :--- | :--- |
| **Product Goal** | Acts as an **Intermediate Goal** in EBM. Must be framed around measurable shifts in **Current Value (CV)** or **Unrealized Value (UV)** rather than a list of delivered features. |
| **Product Backlog Ordering** | Driven by EBM hypotheses. Product Owners prioritize items expected to yield the highest positive movement in target **KVMs** per unit of effort, balancing CV/UV growth with A2I/T2M investments. |
| **Sprint Goal** | Functions as an **Immediate Tactical Goal** and the core hypothesis of the Sprint experiment. |
| **Definition of Done (DoD)** | Protects **Ability to Innovate (A2I)** and **Time-to-Market (T2M)** by preventing technical debt accumulation and eliminating Release Stabilization Periods. |
| **Sprint Review** | Inspects the **Increment** alongside live telemetry across the **Four KVAs**. Stakeholders evaluate empirical customer impact rather than merely reviewing completed tickets. |
| **Sprint Retrospective** | Directly targets bottlenecks in **Ability to Innovate (A2I)** (e.g., context switching, technical debt, tooling friction) and **Time-to-Market (T2M)** (e.g., Cycle Time, build frequency). |

---

## 9. Principal Anti-Patterns to Detect & Reject
1. **Vanity Output Tracking:** Measuring Scrum Team performance by Story Points completed, velocity trends, or utilization rates instead of EBM Key Value Measures (CV, UV, A2I, T2M).
2. **Sprint Goal Omission:** Running Sprints as arbitrary two-week buckets of unrelated tickets without a unifying Sprint Goal, destroying focus and empirical hypothesis testing.
3. **Compromised Definition of Done:** Deferring testing, security validation, or integration to future "hardening sprints," which inflates Release Stabilization Period and degrades Ability to Innovate.
4. **Committee Product Ownership:** Splitting Product Owner accountability across multiple managers or requiring external approval boards to reorder the Product Backlog, violating single-person accountability and slowing Time-to-Market.
5. **Status-Report Sprint Reviews:** Conducting Sprint Reviews as one-way slide presentations rather than collaborative working sessions inspecting working Increments and live EBM telemetry.
