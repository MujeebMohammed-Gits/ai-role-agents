---
module_id: product-management-frameworks-kano-rice-moscow-jtbd
target_agents:
  - Product Manager Agent
  - Product Owner Agent
  - Business Analyst Agent
  - User Research Agent
domain: product-strategy-and-prioritization
chunking_strategy: split-by-h2-prepend-title
---

# Product Management Frameworks: Jobs-to-be-Done (JTBD), Kano Model, RICE Scoring, and MoSCoW Prioritization

## 1. Architectural Synthesis & Decision-Making Hierarchy
Product prioritization fails when teams apply tactical scoring formulas (like RICE or MoSCoW) before establishing strategic customer demand (JTBD) and non-linear satisfaction dynamics (Kano). At a principal product management level, these four frameworks form a sequential, end-to-end decision pipeline:

1. **Demand Discovery & Problem Framing (Jobs-to-be-Done / JTBD):** Defines *why* customers hire or fire a product, establishing functional, emotional, and social outcome metrics independent of current technical solutions.
2. **Value Categorization & Non-Linearity (The Kano Model):** Classifies candidate capabilities by how their presence or absence impacts customer satisfaction, preventing over-investment in diminishing-return features or neglect of baseline expectations.
3. **Portfolio & Roadmap Ranking (RICE Scoring):** Quantifies relative economic and reach-adjusted opportunity across validated discovery initiatives using explicit confidence penalization.
4. **Timebox & Release Scope Governance (MoSCoW Prioritization):** Negotiates scope boundaries within fixed delivery commitments (such as a release window, regulatory deadline, or Sprint Goal) while protecting architectural and quality integrity.

---

## 2. Jobs-to-be-Done (JTBD) & Outcome-Driven Innovation (ODI)

### Core Theoretical Premise
Formulated by Clayton Christensen (Harvard Business School) and operationalized quantitatively by Tony Ulwick (Strategyn / Outcome-Driven Innovation), **Jobs-to-be-Done** posits that customers do not buy products or features; they "hire" solutions to make progress in a specific struggling circumstance. Markets are defined around the **Job Executor** and the **Core Functional Job**, not around product categories or demographic segments.

### The Three Dimensions of a Job
Every customer job encompasses three distinct value dimensions that must be captured during discovery:
* **Functional Dimension:** The practical, objective task the user is trying to accomplish (e.g., *"reconcile multi-currency vendor invoices before month-end close"*).
* **Emotional Dimension:** How the user wants to feel—or avoid feeling—while executing the job (e.g., *"feel confident that audit discrepancies will not trigger compliance penalties"*).
* **Social Dimension:** How the user wants to be perceived by peers, leadership, or external stakeholders (e.g., *"be recognized as a proactive controller who modernizes financial operations"*).

### The Universal Job Map (8-Step Execution Lifecycle)
To uncover underserved pain points end-to-end, decompose the Core Functional Job across Ulwick’s eight universal execution stages rather than focusing solely on the moment of software interaction:
1. **Define:** Determine objectives, plan the approach, and assess required resources.
2. **Locate:** Gather necessary inputs, data, tools, or permissions.
3. **Prepare:** Set up the environment, configure parameters, and organize inputs.
4. **Confirm:** Verify readiness and validate that prerequisites are met before execution.
5. **Execute:** Perform the primary value-creating action.
6. **Monitor:** Track progress, output quality, and anomalies during execution.
7. **Modify:** Adjust parameters, resolve exceptions, or recover from errors.
8. **Conclude:** Finalize outputs, store records, and close out the workflow.

### JTBD Syntax & Desired Outcome Statements
* **Job Story Syntax (Alan Klement / Intercom):**
  > `When [specific struggling situation/context], I want to [motivation/progress], so I can [expected outcome].`
* **Desired Outcome Statement Syntax (Ulwick ODI — Solution-Agnostic):**
  > `[Direction of improvement: Minimize / Increase] + [Metric: time / likelihood / number] + [Object of control] + [Contextual clarifier].`
  > *Example:* *"Minimize the time it takes to identify duplicate line items when importing CSV batch invoices."*

### The Forces of Progress (Switch Dynamics)
When evaluating switching friction (Bob Moesta / Chris Spiek), map the four behavioral forces governing adoption:
* **Forces Driving Change:**
  1. **Push of the Situation:** Acute frustration or failure with the current workflow.
  2. **Magnetism of the New Solution:** Perceived appeal and promised progress of the new product.
* **Forces Resisting Change:**
  3. **Anxiety of the New Solution:** Fear of switching costs, learning curves, migration risk, or failure.
  4. **Habit of the Present:** Organizational inertia, muscle memory, and sunk-cost attachment to existing tools.
* **Switching Rule:** Adoption only occurs when $(Push + Magnetism) > (Anxiety + Habit)$. Product onboarding must actively reduce *Anxiety* rather than merely amplifying *Magnetism*.

### Opportunity Score Formula (Quantitative ODI)
Survey representative Job Executors on each Desired Outcome statement using 1–5 Likert scales for **Importance** and **Satisfaction**:
$$	ext{Opportunity Score} = 	ext{Importance} + \max(	ext{Importance} - 	ext{Satisfaction},\ 0)$$
* **Score > 15:** Extremely underserved outcome; primary target for differentiated innovation.
* **Score 10–15:** Appropriately served or moderately underserved; target selectively.
* **Score < 10:** Overserved outcome; candidate for cost reduction, simplification, or commoditization.

---

## 3. The Kano Model of Customer Satisfaction

### Core Theoretical Premise
Developed by Professor Noriaki Kano (Tokyo University of Science, 1984), the **Kano Model** rejects the linear assumption that improving every product attribute proportionally increases customer satisfaction. Instead, attributes map across two orthogonal axes:
* **Horizontal Axis (Investment / Execution):** Degree of implementation or performance (from *Absent / Poorly Executed* to *Fully Implemented / Best-in-Class*).
* **Vertical Axis (Customer Sentiment):** Emotional response (from *Extreme Dissatisfaction / Frustration* to *Neutral* to *Extreme Satisfaction / Delight*).

### The Five Kano Attribute Categories
1. **Must-Be (Threshold / Basic) Quality:**
   * *Behavior:* Taken for granted when fulfilled (caps out at *Neutral* satisfaction); causes severe dissatisfaction when absent or broken.
   * *Examples:* Data encryption at rest, sub-second page responsiveness, accurate financial calculations, SSO authentication in enterprise SaaS.
   * *Strategic Action:* Fulfill to an acceptable industry threshold, then stop over-investing. Additional engineering spend yields zero incremental delight.
2. **One-Dimensional (Performance / Linear) Quality:**
   * *Behavior:* Satisfaction increases linearly with execution quality; dissatisfaction increases linearly with poor execution. These are explicit specifications customers compare directly across competitors.
   * *Examples:* Storage capacity per dollar, query execution speed, battery life, API rate limits.
   * *Strategic Action:* Compete aggressively where unit economics permit; benchmark directly against market alternatives.
3. **Attractive (Excitement / Delighter) Quality:**
   * *Behavior:* Unexpected capabilities that generate disproportionate delight when present, without causing dissatisfaction when absent (because customers did not know to ask for them).
   * *Examples:* Zero-config automated anomaly detection, instant one-click rollback, intelligent predictive drafting.
   * *Strategic Action:* Primary source of competitive differentiation and pricing power.
4. **Indifferent Quality:**
   * *Behavior:* Neither presence nor absence meaningfully moves customer satisfaction.
   * *Strategic Action:* Eliminate from the backlog immediately; represents pure engineering waste.
5. **Reverse Quality:**
   * *Behavior:* High degrees of implementation actively *cause* dissatisfaction for specific user segments (e.g., intrusive AI pop-ups, mandatory multi-step wizards for power users).
   * *Strategic Action:* Remove, make strictly opt-in, or segment away from affected cohorts.

### Temporal Decay & Commoditization Law
Kano classifications are dynamic, not static. Over time, competitive imitation and rising customer expectations cause attributes to decay downward:
$$	ext{Attractive (Delighter)} \longrightarrow 	ext{One-Dimensional (Performance)} \longrightarrow 	ext{Must-Be (Threshold)}$$
*(e.g., smartphone touchscreens or cloud auto-save began as Delighters, became Performance differentiators, and are now mandatory Must-Be table stakes).*

### Empirical Kano Classification Protocol (Paired Questionnaire)
Never guess Kano categories internally; classify via paired customer survey questions for every candidate feature:
* **Functional Question:** *"If [Feature X] is present/works well, how do you feel?"*
* **Dysfunctional Question:** *"If [Feature X] is absent/does not work well, how do you feel?"*
* **Standard 5-Point Response Scale:**
  1. `I like it that way`
  2. `I expect it to be that way`
  3. `I am neutral`
  4. `I can tolerate it that way`
  5. `I dislike it that way`

#### Kano Evaluation Matrix
| Functional (Present) \ Dysfunctional (Absent) | 1. Like | 2. Expect | 3. Neutral | 4. Tolerate | 5. Dislike |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Like** | Questionable (Q) | **Attractive (A)** | **Attractive (A)** | **Attractive (A)** | **One-Dimensional (O)** |
| **2. Expect** | Reverse (R) | Indifferent (I) | Indifferent (I) | Indifferent (I) | **Must-Be (M)** |
| **3. Neutral** | Reverse (R) | Indifferent (I) | Indifferent (I) | Indifferent (I) | **Must-Be (M)** |
| **4. Tolerate** | Reverse (R) | Indifferent (I) | Indifferent (I) | Indifferent (I) | **Must-Be (M)** |
| **5. Dislike** | Reverse (R) | Reverse (R) | Reverse (R) | Reverse (R) | Questionable (Q) |

* **Prioritization Order:** $	ext{Must-Be (M)} > 	ext{One-Dimensional (O)} > 	ext{Attractive (A)} > 	ext{Indifferent (I)}$.

---

## 4. RICE Prioritization Framework

### Core Theoretical Premise
Developed at Intercom (Sean McBride), **RICE** is a quantitative scoring model designed to compare disparate product initiatives on an apples-to-apples basis while systematically penalizing unvalidated assumptions and high-effort initiatives.

### Mathematical Formula
$$	ext{RICE Score} = rac{	ext{Reach} 	imes 	ext{Impact} 	imes 	ext{Confidence}}{	ext{Effort}}$$

### Component Definitions & Calibration Standards
1. **Reach ($R$):**
   * *Definition:* Empirical estimate of how many distinct users, accounts, or transactions will experience the initiative within a fixed time period (e.g., per quarter).
   * *Measurement Rule:* Must be grounded in historical product telemetry (e.g., *"2,400 active workspace admins per quarter"*), never vague adjectives like "many users."
2. **Impact ($I$):**
   * *Definition:* Expected degree of behavioral or economic change per reached user toward a target key result (e.g., conversion, activation, retention).
   * *Standardized Discrete Scale (prevents arbitrary decimal gaming):*
     * `3.0` = Massive impact (transformational lift in core KPI)
     * `2.0` = High impact
     * `1.0` = Medium impact
     * `0.5` = Low impact
     * `0.25` = Minimal impact
3. **Confidence ($C$):**
   * *Definition:* Evidentiary certainty backing the Reach, Impact, and Effort estimates, expressed as a percentage.
   * *Standardized Evidence Tiers:*
     * `100%` (High Confidence): Backed by quantitative behavioral data, live A/B test results, and engineering spike validation.
     * `80%` (Medium Confidence): Backed by qualitative user research (interviews/usability tests) and partial analytics, with rough engineering sizing.
     * `50%` (Low Confidence): Primarily intuition, stakeholder request, or unvalidated hypothesis ("moonshot").
     * `< 50%`: Insufficient evidence to enter delivery; route to Continuous Discovery for assumption testing first.
4. **Effort ($E$):**
   * *Definition:* Total cross-functional capacity required (Product, Design, Engineering, QA) measured in **Person-Months** (or standardized team-weeks), with a minimum floor of `0.5` to prevent division-by-near-zero inflation.

### Governance & Calibration Rules
* **Normalize Time Horizons:** Keep the Reach time window identical across all scored items (e.g., 90 days).
* **Separate Discovery from Delivery:** Low-confidence items (`50%`) should not be discarded if Reach and Impact are massive; instead, score a lightweight **Discovery Spike** (low Effort) to raise Confidence before full build commitment.
* **Non-Functional & Tech Debt Adjustment:** RICE systematically under-scores foundational reliability, security, and technical debt items because their immediate user-facing "Impact" looks indirect. Pair RICE with explicit capacity allocation buckets (e.g., 70% Feature/Growth, 20% Tech Debt/Reliability, 10% Compliance/Must-Be) or Cost of Delay (WSJF).

---

## 5. MoSCoW Prioritization Method

### Core Theoretical Premise
Created by Dai Clegg (Oracle, 1994) and standardized within **DSDM (Dynamic Systems Development Method)** and the **Agile Business Consortium**, **MoSCoW** is a timebox-driven scope negotiation framework. Unlike RICE, MoSCoW does *not* rank items on a continuous numeric scale; it establishes explicit contractual/delivery commitments within a fixed time, cost, and quality envelope.

### The Four Priority Categories & Effort Guardrails
1. **Must Have ($M$ — Minimum Usable Subset):**
   * *Definition:* Non-negotiable requirements without which the release is illegal, unsafe, non-functional, or commercially unviable. If even one *Must Have* is missed, the release cannot ship.
   * *Capacity Guardrail:* **Maximum 60% of total planned effort** within the timebox. Exceeding 60% destroys contingency buffer and guarantees missed deadlines or compromised quality.
2. **Should Have ($S$ — Important but Not Vital):**
   * *Definition:* High-value capabilities that are painful to omit, but for which a temporary workaround exists (e.g., manual admin operation, existing secondary flow). The release remains viable without them.
   * *Capacity Guardrail:* **Approximately 20% of total planned effort.**
3. **Could Have ($C$ — Desirable / Contingency Buffer):**
   * *Definition:* Convenience enhancements or polish items that improve user experience at low cost, explicitly designated as the first scope items to be dropped if *Must Have* items encounter unforeseen technical complexity.
   * *Capacity Guardrail:* **Approximately 20% of total planned effort.**
4. **Won't Have This Time ($W$ — Explicit Out-of-Scope):**
   * *Definition:* Capabilities explicitly agreed upon by stakeholders as excluded from the current release timebox. Recording items in *Won't Have* prevents scope creep and eliminates repeated stakeholder debates during execution.

### Operational Execution Rules
* **The "Why" Interrogation Test:** Challenge every stakeholder who labels every item a *Must Have* by asking: *"If this single requirement is not ready on launch day, will we cancel the entire release?"* If the answer is "No," downgrade it to *Should Have* or *Could Have*.
* **Fixed Quality & Time, Variable Scope:** Never sacrifice Definition of Done (testing, security, observability) to squeeze *Should Have* or *Could Have* items into a release.

---

## 6. Comparative Synthesis & Anti-Patterns

### Framework Comparison Matrix
| Attribute | Jobs-to-be-Done (JTBD) | Kano Model | RICE Scoring | MoSCoW Method |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Question** | *What progress is the user trying to make?* | *How does this attribute affect satisfaction?* | *Which initiative yields the highest validated return per unit effort?* | *What must ship within this fixed timebox?* |
| **Lifecycle Phase** | Strategic Discovery & Positioning | Concept Validation & Feature Definition | Roadmap & Backlog Prioritization | Release Planning & Sprint Scope Negotiation |
| **Output Type** | Job Maps & Opportunity Scores | Categorical (`M`, `O`, `A`, `I`, `R`) | Continuous Numerical Ratio | Discrete Commitment Buckets (`M`, `S`, `C`, `W`) |
| **Primary Strength** | Exposes root customer motivation; solution-agnostic | Prevents over-building Must-Bes; identifies Delighters | Penalizes guesswork via Confidence multiplier | Protects delivery predictability via 60/20/20 buffer |
| **Primary Blind Spot** | Does not estimate engineering effort or timeboxes | Ignores technical cost and commercial business viability | Under-values foundational tech debt & compliance | Prone to "everything is a Must Have" inflation |

### Principal-Level Anti-Patterns to Reject
1. **RICE Precision Theater:** Treating a RICE score of `412.5` vs. `398.0` as statistically significant when input estimates have $\pm 30\%$ variance. Use RICE to separate top-decile opportunities from bottom-half noise, then apply strategic judgment.
2. **Feature-Framing in JTBD:** Writing *"When I am on the dashboard, I want to click an export button so I can download a CSV"*—this describes UI mechanics, not an underlying customer job.
3. **Permanent Delighter Delusion:** Assuming a Kano *Attractive* feature built two years ago still differentiates the product today without re-validating for market commoditization.
4. **95% Must-Have MoSCoW Plans:** Committing >60% of capacity to *Must Haves*, turning MoSCoW into a waterfall fixed-scope death march with zero contingency.
