# Deep-Dive Architecture: Wardley Mapping & Porter's Five Forces
## RAG Metadata & Retrieval Context
* **Target Agents:** Management Consultant Agent, Product Manager Agent, Enterprise Agile Coach Agent
* **Domain:** Corporate Strategy, Competitive Positioning, Value Chain Evolution & Build-vs-Buy Architecture
* **Primary Sources:** Simon Wardley (*Wardley Maps*), Michael E. Porter (*Competitive Strategy*, *Harvard Business Review*)

---

## Part 1: Wardley Mapping Architecture

### 1.1 Core Strategic Premise
Wardley Mapping is a situational awareness and strategic planning methodology that visualizes the **Value Chain** of a business capability against its **Evolutionary Stage**. Unlike static matrices, it models movement, inertia, and competitive gameplay across a landscape.

### 1.2 The Two Axes
1. **Y-Axis (Visibility / Value Chain):**
   * Anchored at the top by the **User** (customer, citizen, regulator, or internal consumer) and their **User Need**.
   * Descending vertically through the dependency chain of activities, practices, data, and infrastructure required to fulfill that need.
   * Proximity to the top equals higher direct visibility to the user; proximity to the bottom equals invisible foundational plumbing.
2. **X-Axis (Evolution — Four Distinct Stages):**
   * **Stage I: Genesis (Uncharted):** Novel, unique, poorly understood, high failure rate, rapid experimentation, high uncertainty.
   * **Stage II: Custom-Built (Emerging):** Bespoke solutions built to order, emerging understanding, divergent implementations, early ROI focus.
   * **Stage III: Product (+Rental) (Converging):** Increasingly standardized, feature differentiation, commercial off-the-shelf (COTS) or SaaS offerings, stable operational models.
   * **Stage IV: Commodity (+Utility) (Industrialized):** Standardized, ubiquitous, high-volume, low-margin, utility-based consumption (e.g., electricity, cloud compute, standard payment rails), operational efficiency focus.

### 1.3 Climatic Patterns (Forces Outside Your Control)
* **Everything Evolves:** Supply and demand competition forces every component rightward from Genesis toward Commodity over time.
* **Characteristics Change:** As a component evolves, its management style, risk profile, and financial model must shift (e.g., from chaotic exploration to Six Sigma/utility efficiency).
* **No One Size Fits All (Pioneers, Settlers, Town Planners):**
  * *Pioneers:* Thrive in Genesis/early Custom; discover new value through failure and exploration.
  * *Settlers:* Thrive in late Custom/Product; turn prototypes into repeatable, scalable products.
  * *Town Planners:* Thrive in Product/Commodity; industrialize into high-scale, ultra-low-cost utilities.
* **Inertia:** Past success creates organizational resistance to adopting newly commoditized utilities (e.g., legacy data centers resisting cloud migration).
* **Co-Evolution of Practice:** New technical capabilities demand new operational practices (e.g., cloud utility compute enabled DevOps and Continuous Delivery).

### 1.4 Strategic Gameplay & Doctrine
* **Doctrine (Universally Useful Principles):** Focus on user needs, remove bias and duplication, think small (modular), use appropriate methods (Agile in Genesis/Custom, Lean/COTS in Product, Six Sigma/Outsourcing in Commodity), and challenge assumptions.
* **Gameplay (Context-Specific Maneuvers):**
  * *Open Approaches (Open Source / Open APIs):* Accelerate the commoditization of a competitor's differentiating product layer to destroy their margin and capture the higher-order layer.
  * *ILC (Innovate-Leverage-Commoditize):* Expose a utility platform, monitor third-party ecosystem innovation on top of it, and commoditize the most successful patterns back into the core platform.
  * *Tower and Moat:* Accumulate patent/data/network-effect barriers around a Custom/Product component to delay competitor commoditization.

---

## Part 2: Porter's Five Forces Architecture

### 2.1 Core Strategic Premise
Michael Porter's Five Forces framework evaluates the **structural attractiveness and long-term profitability potential** of an industry by analyzing how economic value is divided among industry incumbents and external market participants.

### 2.2 The Five Competitive Forces
1. **Threat of New Entrants (Barriers to Entry):**
   * Economies of scale (supply-side) and network effects (demand-side).
   * Customer switching costs and capital requirements.
   * Incumbency advantages independent of size (proprietary tech, preferential access to raw materials/data, regulatory licenses).
   * Expected retaliation by established incumbents.
2. **Bargaining Power of Suppliers:**
   * Supplier concentration relative to the industry.
   * Absence of substitute inputs and high switching costs to change suppliers.
   * Differentiated supplier inputs (e.g., specialized semiconductor IP, proprietary foundation models).
   * Threat of forward integration by suppliers into the industry.
3. **Bargaining Power of Buyers:**
   * Buyer volume concentration and price sensitivity (especially when purchases represent a large fraction of buyer spend).
   * Undifferentiated / standardized industry products.
   * Low buyer switching costs and credible threat of backward integration.
4. **Threat of Substitute Products or Services:**
   * Alternative solutions performing the same or equivalent Job-to-be-Done via different technology or business models.
   * Driven by relative price-performance trade-off and low switching costs to the substitute.
5. **Rivalry Among Existing Competitors:**
   * Intensity driven by numerous or equally balanced competitors, slow industry growth, high fixed/storage costs, low product differentiation, and high strategic exit barriers.
   * Competing solely on price destroys industry-wide profit pools; competing on non-price dimensions (features, service, brand) expands total value.

### 2.3 Porter's Generic Strategies
* **Cost Leadership:** Achieving the lowest industry cost structure through scale, automation, and operational discipline while maintaining parity on quality.
* **Differentiation:** Creating unique attributes valued by buyers that command a sustainable price premium exceeding the extra cost of differentiation.
* **Focus (Cost Focus or Differentiation Focus):** Serving a narrow market segment or niche significantly better or cheaper than broad-market competitors.
* *Strategic Warning:* Being "Stuck in the Middle" without a clear generic strategy guarantees below-average industry returns.

---

## Part 3: Principal Consultant Synthesis (Combining Both Models)
1. **Map Industry Structure Before Execution:** Use **Porter's Five Forces** to diagnose where profit pools reside and where supplier/buyer power erodes margins.
2. **Trace Value Chain Evolution:** Build a **Wardley Map** of the firm's internal capabilities supporting that market position.
3. **Eliminate Build-vs-Buy Mismatches:** Never custom-build components located in **Product** or **Commodity** stages—buy SaaS or consume cloud utilities. Concentrate engineering R&D strictly on **Genesis** and **Custom-Built** nodes that reinforce differentiation or weaken supplier/buyer power.
