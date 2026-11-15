---
title: "The Official Scrum Guide (2020) — Architectural & Empirical Specification"
author: "Ken Schwaber & Jeff Sutherland (Canonical Specification Synthesis)"
target_agents: ["scrum-master-agent", "product-owner-agent", "enterprise-agile-coach-agent", "delivery-management-agent", "product-manager-agent"]
domain: "agile-delivery-and-empiricism"
version: "2020-Canonical-RAG-v1"
---

# The Official Scrum Guide (2020): End-to-End Architectural Specification

## 1. Purpose and Definition of Scrum
* **Purpose of the Scrum Guide:** Scrum was developed in the early 1990s by Ken Schwaber and Jeff Sutherland. The 2020 Scrum Guide provides the canonical, non-prescriptive framework definition that enables people, teams, and organizations to generate value through adaptive solutions for complex problems.
* **Core Definition:** Scrum is a lightweight framework that requires a Scrum Master to foster an environment where:
  1. A **Product Owner** orders the work for a complex problem into a **Product Backlog**.
  2. The **Scrum Team** turns a selection of the work into an **Increment** of value during a **Sprint**.
  3. The **Scrum Team and its stakeholders** inspect the results and adjust for the next Sprint.
  4. **Repeat.**
* **Framework Intentionality:** Scrum is purposefully incomplete, defining only the parts required to implement Scrum theory. Rather than providing detailed instructions, the rules of Scrum guide relationships and interactions. Various processes, techniques, and methods can be employed within the framework.
* **Immutability Rule:** The Scrum framework, as outlined in the 2020 Guide, is immutable. While implementing only parts of Scrum is possible, the result is not Scrum. Scrum exists only in its entirety and functions well as a container for other techniques, methodologies, and practices.

---

## 2. Scrum Theory: Empiricism and Lean Thinking
Scrum is founded on **empiricism** and **lean thinking**:
* **Empiricism:** Asserts that knowledge comes from experience and making decisions based on what is observed. Scrum employs an iterative, incremental approach to optimize predictability and control risk.
* **Lean Thinking:** Reduces waste and focuses on the essentials.

### The Three Pillars of Empiricism
Every Scrum event is a formal opportunity to inspect and adapt Scrum artifacts. These events are specifically designed to enable critical transparency. Failure to operate any events as prescribed results in lost opportunities to inspect and adapt.

| Pillar | Operational Definition | Systemic Failure Mode When Violated |
| :--- | :--- | :--- |
| **Transparency** | The emergent process and work must be visible to those performing the work as well as those receiving the work. Important decisions are based on the perceived state of its three formal artifacts. | Artifacts with low transparency lead to decisions that diminish value and increase risk. Inspection without transparency is misleading and wasteful. |
| **Inspection** | The Scrum artifacts and the progress toward agreed goals must be inspected frequently and diligently to detect potentially undesirable variances or problems. | Inspection without adaptation is considered pointless. Scrum events are designed to provoke change, not serve as passive status check-ins. |
| **Adaptation** | If any aspects of a process deviate outside acceptable limits or if the resulting product is unacceptable, the process being applied or the materials being produced must be adjusted as soon as possible to minimize further deviation. | Adaptation becomes more difficult when the people involved are not empowered or self-managing. A Scrum Team is expected to adapt the moment it learns anything new through inspection. |

---

## 3. The Five Scrum Values
Successful use of Scrum depends on people becoming more proficient in living five core values. These values give direction to the Scrum Team regarding their work, actions, and behavior:

1. **Commitment:** The Scrum Team commits to achieving its goals and to supporting each other. (Note: Commitment is to the *goals* and *professionalism*, not to an immutable scope checklist).
2. **Focus:** Their primary focus is on the work of the Sprint to make the best possible progress toward these goals.
3. **Openness:** The Scrum Team and its stakeholders are open about the work and the challenges.
4. **Respect:** Scrum Team members respect each other to be capable, independent people, and are respected as such by the people with whom they work.
5. **Courage:** The Scrum Team members have the courage to do the right thing and to work on tough problems.

---

## 4. The Scrum Team & Accountabilities
The fundamental unit of Scrum is a small team of people, a **Scrum Team**. The Scrum Team consists of one **Scrum Master**, one **Product Owner**, and **Developers**.

### Structural Characteristics
* **No Sub-Teams or Hierarchies:** Within a Scrum Team, there are no sub-teams or hierarchies. It is a cohesive unit of professionals focused on one objective at a time, the **Product Goal**.
* **Cross-Functional:** Members have all the skills necessary to create value each Sprint.
* **Self-Managing:** They internally decide who does what, when, and how. (Updated in 2020 from "self-organizing" to emphasize internal autonomy over execution).
* **Optimal Sizing:** Small enough to remain nimble and large enough to complete significant work within a Sprint, typically **10 or fewer people**. Smaller teams communicate better and are more productive. If Scrum Teams become too large, they should consider reorganizing into multiple cohesive Scrum Teams, each focused on the same product (sharing the same Product Goal, Product Backlog, and Product Owner).
* **Shared Accountability:** The entire Scrum Team is accountable for creating a valuable, useful Increment every Sprint.

### 4.1 Developers
Developers are the people in the Scrum Team that are committed to creating any aspect of a usable Increment each Sprint. The specific skills needed by the Developers are often broad and will vary with the domain of work (e.g., engineering, UX, QA, data, operations, domain specialists).
* **Core Accountabilities:**
  * Creating a plan for the Sprint, the **Sprint Backlog**.
  * Instilling quality by adhering to a **Definition of Done**.
  * Adapting their plan each day toward the **Sprint Goal**.
  * Holding each other accountable as professionals.

### 4.2 Product Owner
The Product Owner is accountable for maximizing the value of the product resulting from the work of the Scrum Team. How this is done may vary widely across organizations, Scrum Teams, and individuals.
* **Core Accountabilities (Effective Product Backlog Management):**
  * Developing and explicitly communicating the **Product Goal**.
  * Creating and clearly communicating **Product Backlog items**.
  * Ordering **Product Backlog items**.
  * Ensuring that the **Product Backlog** is transparent, visible, and understood.
* **Delegation & Authority Rules:** The Product Owner may do the above work or may delegate the responsibility to others. Regardless, the Product Owner remains accountable. For Product Owners to succeed, the entire organization must respect their decisions. These decisions are visible in the content and ordering of the Product Backlog, and through the inspectable Increment at the Sprint Review.
* **Single-Person Rule:** The Product Owner is **one person, not a committee**. The Product Owner may represent the needs of many stakeholders in the Product Backlog. Those wanting to change the Product Backlog can do so by trying to convince the Product Owner.

### 4.3 Scrum Master
The Scrum Master is accountable for establishing Scrum as defined in the Scrum Guide. They do this by helping everyone understand Scrum theory and practice, both within the Scrum Team and the organization. The Scrum Master is accountable for the Scrum Team’s effectiveness by enabling the Scrum Team to improve its practices within the Scrum framework. Scrum Masters are **true leaders who serve** the Scrum Team and the larger organization.

* **Service to the Scrum Team:**
  * Coaching the team members in self-management and cross-functionality.
  * Helping the Scrum Team focus on creating high-value Increments that meet the Definition of Done.
  * Causing the removal of impediments to the Scrum Team’s progress.
  * Ensuring that all Scrum events take place and are positive, productive, and kept within the timebox.
* **Service to the Product Owner:**
  * Helping find techniques for effective Product Goal definition and Product Backlog management.
  * Helping the Scrum Team understand the need for clear and concise Product Backlog items.
  * Helping establish empirical product planning for a complex environment.
  * Facilitating stakeholder collaboration as requested or needed.
* **Service to the Organization:**
  * Leading, training, and coaching the organization in its Scrum adoption.
  * Planning and advising Scrum implementations within the organization.
  * Helping employees and stakeholders understand and enact an empirical approach for complex work.
  * Removing barriers between stakeholders and Scrum Teams.

---

## 5. Scrum Events & Timeboxes
The **Sprint** is a container for all other events. Each event in Scrum is a formal opportunity to inspect and adapt Scrum artifacts. Optimally, all events are held at the same time and place to reduce complexity.

| Event | Maximum Timebox (for 1-Month Sprint) | Mandatory Attendees | Primary Inspection Target | Primary Adaptation Output |
| :--- | :--- | :--- | :--- | :--- |
| **The Sprint** | 1 calendar month or less | Entire Scrum Team | Product Goal, Value, Risk, Complexity | Usable, releasable Increment(s) |
| **Sprint Planning** | 8 hours (shorter for shorter Sprints) | Entire Scrum Team (plus invited domain advisors) | Product Backlog, Capacity, Past Performance, DoD | Sprint Goal, Selected PBIs, Delivery Plan (Sprint Backlog) |
| **Daily Scrum** | 15 minutes (daily, same time/place) | Developers (PO/SM attend if working on Sprint Backlog items) | Progress toward the Sprint Goal | Adapted Sprint Backlog / actionable daily plan |
| **Sprint Review** | 4 hours (shorter for shorter Sprints) | Scrum Team & Key Stakeholders | Outcome of the Sprint (Increment) & Product Backlog | Revised Product Backlog & next probable adaptations |
| **Sprint Retrospective** | 3 hours (shorter for shorter Sprints) | Entire Scrum Team | Last Sprint regarding individuals, interactions, processes, tools, DoD | Most impactful process/quality improvements (may enter Sprint Backlog) |

### 5.1 The Sprint
Sprints are the heartbeat of Scrum, where ideas are turned into value. They are fixed length events of one month or less to create consistency. A new Sprint starts immediately after the conclusion of the previous Sprint.
* **Core Rules During a Sprint:**
  * No changes are made that would endanger the **Sprint Goal**.
  * Quality does not decrease (Definition of Done is never compromised).
  * The **Product Backlog** is refined as needed.
  * Scope may be clarified and renegotiated with the Product Owner as more is learned.
* **Predictability & Horizon:** Sprints enable predictability by ensuring inspection and adaptation of progress toward a Product Goal at least every calendar month. When a Sprint’s horizon is too long the Sprint Goal may become invalid, complexity may rise, and risk may increase. Shorter Sprints can be employed to generate more learning cycles and limit risk of cost and effort to a smaller time frame.
* **Sprint Cancellation:** A Sprint could be cancelled if the Sprint Goal becomes obsolete. **Only the Product Owner has the authority to cancel the Sprint.**

### 5.2 Sprint Planning
Sprint Planning initiates the Sprint by laying out the work to be performed for the Sprint. This resulting plan is created by the collaborative work of the entire Scrum Team. The Scrum Team may also invite other people to attend Sprint Planning to provide advice. Sprint Planning addresses three specific topics:
1. **Topic One: Why is this Sprint valuable?**
   * The Product Owner proposes how the product could increase its value and utility in the current Sprint. The whole Scrum Team then collaborates to define a **Sprint Goal** that communicates why the Sprint is valuable to stakeholders. The Sprint Goal must be finalized prior to the end of Sprint Planning.
2. **Topic Two: What can be Done this Sprint?**
   * Through discussion with the Product Owner, the Developers select items from the Product Backlog to include in the current Sprint. The Scrum Team may refine these items during this process, which increases understanding and confidence. Selecting how much can be completed within a Sprint may be challenging; however, the more the Developers know about their past performance, their upcoming capacity, and their Definition of Done, the more confident they will be in their Sprint forecasts.
3. **Topic Three: How will the chosen work get done?**
   * For each selected Product Backlog item, the Developers plan the work necessary to create an Increment that meets the Definition of Done. This is often done by decomposing Product Backlog items into smaller work items of one day or less. How this is done is at the **sole discretion of the Developers**. No one else tells them how to turn Product Backlog items into Increments of value.

### 5.3 Daily Scrum
The purpose of the Daily Scrum is to inspect progress toward the Sprint Goal and adapt the Sprint Backlog as necessary, adjusting the upcoming planned work.
* **Participants:** The Daily Scrum is a 15-minute event for the **Developers** of the Scrum Team. If the Product Owner or Scrum Master are actively working on items in the Sprint Backlog, they participate as Developers.
* **Structure Autonomy:** The Developers can select whatever structure and techniques they want, as long as their Daily Scrum focuses on progress toward the Sprint Goal and produces an actionable plan for the next day of work. This creates focus and improves self-management. (The 2020 Guide explicitly removed the mandatory "three questions").
* **Operational Impact:** Daily Scrums improve communications, identify impediments, promote quick decision-making, and consequently eliminate the need for other meetings. The Daily Scrum is not the only time Developers are allowed to adjust their plan; they often meet throughout the day for more detailed discussions about adapting or re-planning the rest of the Sprint’s work.

### 5.4 Sprint Review
The purpose of the Sprint Review is to inspect the outcome of the Sprint and determine future adaptations. The Scrum Team presents the results of their work to key stakeholders and progress toward the Product Goal is discussed.
* **Working Session Dynamics:** During the event, the Scrum Team and stakeholders review what was accomplished in the Sprint and what has changed in their environment. Based on this information, attendees collaborate on what to do next. The Product Backlog may also be adjusted to meet new opportunities.
* **Anti-Presentation Rule:** The Sprint Review is a **working session** and the Scrum Team should avoid limiting it to a presentation. It is the second to last event of the Sprint and is timeboxed to a maximum of four hours for a one-month Sprint.

### 5.5 Sprint Retrospective
The purpose of the Sprint Retrospective is to plan ways to increase quality and effectiveness.
* **Inspection Scope:** The Scrum Team inspects how the last Sprint went with regards to individuals, interactions, processes, tools, and their **Definition of Done**. Inspected elements often vary with the domain of work. Assumptions that led them astray are identified and their origins explored. The Scrum Team discusses what went well during the Sprint, what problems it encountered, and how those problems were (or were not) solved.
* **Adaptation Output:** The Scrum Team identifies the most helpful changes to improve its effectiveness. The most impactful improvements are addressed as soon as possible. They may even be added to the Sprint Backlog for the next Sprint. The Sprint Retrospective concludes the Sprint.

---

## 6. Scrum Artifacts & Their Commitments
Scrum’s artifacts represent work or value. They are designed to maximize transparency of key information. Thus, everyone inspecting them has the same basis for adaptation. Each artifact contains a **commitment** (introduced in the 2020 Scrum Guide) to ensure it provides information that enhances transparency and focus against which progress can be measured:

| Scrum Artifact | Formal Commitment | Accountability | Transparency & Inspection Mechanism |
| :--- | :--- | :--- | :--- |
| **Product Backlog** | **Product Goal** | Product Owner | Ordered list of what is needed to improve the product; refined continuously for clarity and sizing. |
| **Sprint Backlog** | **Sprint Goal** | Developers | Real-time picture of work Developers plan to accomplish during the Sprint; updated throughout the Sprint. |
| **Increment** | **Definition of Done** | Scrum Team | Concrete stepping stone toward the Product Goal; verified against DoD before birth of Increment. |

### 6.1 Product Backlog & The Product Goal
* **Product Backlog:** An emergent, ordered list of what is needed to improve the product. It is the **single source of work** undertaken by the Scrum Team.
* **Product Backlog Refinement:** The act of breaking down and further defining Product Backlog items into smaller more precise items. This is an ongoing activity to add details, such as a description, order, and size. Attributes often vary with the domain of work. The Developers who will be doing the work are responsible for the **sizing**. The Product Owner may influence the Developers by helping them understand and select trade-offs.
* **Commitment — Product Goal:** Describes a future state of the product which can serve as a target for the Scrum Team to plan against. The Product Goal is in the Product Backlog. The rest of the Product Backlog emerges to define "what" will fulfill the Product Goal.
* **Product Definition:** A product is a vehicle to deliver value. It has a clear boundary, known stakeholders, well-defined users or customers. A product could be a service, a physical product, or something more abstract.
* **Single Focus Rule:** The Product Goal is the long-term objective for the Scrum Team. They must fulfill (or abandon) one objective before taking on the next.

### 6.2 Sprint Backlog & The Sprint Goal
* **Sprint Backlog:** Composed of the **Sprint Goal** (why), the set of **Product Backlog items** selected for the Sprint (what), as well as an **actionable plan** for delivering the Increment (how).
* **Ownership & Visibility:** The Sprint Backlog is a plan by and for the Developers. It is a highly visible, real-time picture of the work that the Developers plan to accomplish during the Sprint in order to achieve the Sprint Goal. Consequently, the Sprint Backlog is updated throughout the Sprint as more is learned. It should have enough detail that they can inspect their progress in the Daily Scrum.
* **Commitment — Sprint Goal:** The single objective for the Sprint. Although the Sprint Goal is a commitment by the Developers, it provides flexibility in terms of the exact work needed to achieve it. The Sprint Goal also creates coherence and focus, encouraging the Scrum Team to work together rather than on separate initiatives. The Sprint Goal is created during the Sprint Planning event and then added to the Sprint Backlog. As the Developers work during the Sprint, they keep the Sprint Goal in mind. If the work turns out to be different than they expected, they collaborate with the Product Owner to negotiate the scope of the Sprint Backlog within the Sprint without affecting the Sprint Goal.

### 6.3 Increment & The Definition of Done
* **Increment:** A concrete stepping stone toward the Product Goal. Each Increment is additive to all prior Increments and thoroughly verified, ensuring that all Increments work together. In order to provide value, the Increment must be usable.
* **Multiple Increments Rule:** Multiple Increments may be created within a Sprint. The sum of the Increments is presented at the Sprint Review thus supporting empiricism. However, an Increment may be delivered to stakeholders **prior to the end of the Sprint**. The Sprint Review should never be considered a gate to releasing value.
* **Commitment — Definition of Done (DoD):** A formal description of the state of the Increment when it meets the quality measures required for the product.
* **Birth of an Increment:** The moment a Product Backlog item meets the Definition of Done, an Increment is born. The Definition of Done creates transparency by providing everyone a shared understanding of what work was completed as part of the Increment. If a Product Backlog item does not meet the Definition of Done, it cannot be released or even presented at the Sprint Review. Instead, it returns to the Product Backlog for future consideration.
* **Organizational Standards Alignment:** If the Definition of Done for an Increment is part of the standards of the organization, all Scrum Teams must follow it as a minimum. If it is not an organizational standard, the Scrum Team must create a Definition of Done appropriate for the product. The Developers are required to conform to the Definition of Done. If there are multiple Scrum Teams working together on a product, they must mutually define and comply with the same Definition of Done.

---

## 7. Key 2020 Scrum Guide Structural Evolutions (2017 vs. 2020)
For principal consultants and coaches auditing legacy Scrum implementations, the 2020 specification introduced deliberate architectural shifts:

1. **Even Less Prescriptive:** Removed software-specific language (e.g., "testing", "system", "design", "requirement") so Scrum applies universally across domains, and removed the mandatory 3 Daily Scrum questions.
2. **One Team Focused on One Product:** Eliminated the concept of a separate "Development Team" inside the Scrum Team to prevent "us vs. them" tension between Product Owner and Developers. Now there is one Scrum Team with three accountabilities.
3. **Introduction of Artifact Commitments:** Explicitly bound each of the three artifacts to a measurable commitment (Product Backlog -> Product Goal; Sprint Backlog -> Sprint Goal; Increment -> Definition of Done) to anchor empiricism.
4. **Self-Managing Over Self-Organizing:** Emphasized that Scrum Teams choose *who*, *how*, and *what* to work on internally, elevating team autonomy.
5. **Three Sprint Planning Topics:** Added Topic One ("Why is this Sprint valuable?") to foreground value and the Sprint Goal before selecting backlog items.
6. **Overall Simplification of Language:** Reduced the guide to under 13 pages by eliminating redundant wording and complex phrasing for broader accessibility.

---

## 8. Principal Consultant Diagnostic & Anti-Pattern Matrix

| Observed Anti-Pattern | Violated Scrum Guide Rule | Principal Intervention |
| :--- | :--- | :--- |
| **"Sprint 0" or "Hardening/Release Sprints"** | Every Sprint must produce a usable, integrated Increment meeting the Definition of Done; there is no concept of non-value Sprints. | Eliminate staging Sprints; integrate architecture, testing, and deployment automation into the Definition of Done from Sprint 1. |
| **Product Owner by Committee / Proxy PO** | The Product Owner is one person with organizational authority over Product Backlog content and ordering. | Consolidate backlog authority into a single empowered Product Owner; move stakeholders to Sprint Reviews and refinement consultations. |
| **Daily Scrum as a Status Meeting to the SM** | The Daily Scrum is an internal planning event by and for the Developers to inspect progress toward the Sprint Goal. | Coach Developers to address each other around the Sprint Backlog board; Scrum Master steps back from facilitating status round-robins. |
| **Unfinished PBIs Carried Over Without Inspection** | Incomplete work does not meet the DoD, cannot be part of an Increment, and returns to the Product Backlog for re-ordering. | Return incomplete items to the Product Backlog; Product Owner decides whether they still represent the highest value for the next Sprint. |
| **Using Velocity as a Cross-Team KPI** | Sizing is internal to Developers for forecasting capacity; velocity is not an objective measure of value. | Replace velocity targets with Evidence-Based Management (EBM) value metrics, Sprint Goal attainment, and flow telemetry. |
