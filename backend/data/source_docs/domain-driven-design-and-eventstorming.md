---
module_id: domain-driven-design-and-eventstorming
domain: architecture-and-domain-modeling
target_roles: [business-analyst-agent, platform-engineering-agent, devops-engineer-agent, product-owner-agent, delivery-management-agent]
frameworks: [Domain-Driven Design (Eric Evans), Implementing DDD (Vaughn Vernon), EventStorming (Alberto Brandolini), Context Mapping, CQRS & Event Sourcing]
rag_chunk_strategy: split-by-h2
---

# Framework Architecture: Domain-Driven Design (DDD) & EventStorming

## 1. Strategic Mandate & Core Philosophy
Domain-Driven Design (DDD) aligns software architecture, data models, and team boundaries directly with the core business domain. Rather than letting technical database schemas dictate business logic, DDD places domain complexity and a shared **Ubiquitous Language** at the center of engineering and business analysis.

* **Core Principle:** Strategic DDD partitions large, complex enterprises into cohesive **Bounded Contexts** with explicit integration contracts; Tactical DDD structures the internal domain model inside each Bounded Context to protect business invariants.
* **Socio-Technical Alignment:** Bounded Contexts serve as the primary architectural input for **Team Topologies** (one Stream-Aligned Team owns one or more cohesive Bounded Contexts, never splitting a single Bounded Context across multiple teams).

## 2. Strategic Design: Subdomains, Ubiquitous Language & Bounded Contexts

### Subdomain Classification (Investment & Architecture Strategy)
Every enterprise domain decomposes into three distinct types of subdomains, dictating where to invest custom engineering vs. buying SaaS:

| Subdomain Type | Strategic Differentiation | Engineering & Sourcing Strategy | Example (E-Commerce) |
| :--- | :--- | :--- | :--- |
| **Core Domain** | Primary source of competitive advantage; directly generates revenue or differentiation. | **Build In-House** with top principal talent; invest heavily in rich tactical DDD modeling and continuous innovation. | Dynamic Pricing Engine, Personalized Recommendation Algorithm. |
| **Supporting Subdomain** | Necessary for business operations and custom to the business, but not a market differentiator. | **Build Simply** (CRUD / Transaction Script) or customize lightweight frameworks; avoid over-engineering. | Vendor Onboarding Portal, Custom Catalog Tagging Workflow. |
| **Generic Subdomain** | Solved problems identical across industries; zero competitive differentiation. | **Buy SaaS / Adopt Open Source**; treat as a utility/commodity (aligned with Wardley Mapping). | Identity & Access Management (Auth0/Okta), Payment Processing (Stripe), General Ledger. |

### Ubiquitous Language (UL)
* **Definition:** A rigorous, shared vocabulary co-created by Domain Experts (Business Analysts, Product Owners) and Developers. Every noun, verb, and business rule in the UL maps 1:1 to class names, method signatures, API endpoints, database tables, and BDD acceptance criteria.
* **Context-Scoped Precision:** A term like *"Account"* or *"Order"* has a precise, unambiguous meaning **inside** a single Bounded Context, and may intentionally hold a different definition in an adjacent Bounded Context (e.g., *Order* in Sales Context vs. *Shipment* in Fulfillment Context).

### Bounded Contexts
* **Definition:** An explicit semantic, linguistic, and architectural boundary within which a particular Domain Model and Ubiquitous Language apply consistently.
* **Boundary Indicators:** Changes in terminology, conflicting business rules for the same entity, distinct transactional consistency needs, or separate regulatory/data-retention lifecycles.

## 3. Context Mapping: Integration Patterns Between Bounded Contexts
When two Bounded Contexts must collaborate, define their technical and organizational relationship explicitly using **Context Mapping Patterns**:

1. **Partnership:** Two teams/contexts succeed or fail together; they coordinate planning and synchronize API evolutions jointly.
2. **Shared Kernel:** Two contexts share a strictly bounded subset of domain code/schema (e.g., a shared financial currency library). Changes require joint approval; keep Shared Kernels minimal to avoid tight coupling.
3. **Customer-Supplier (Upstream / Downstream):** The Upstream team (Supplier) provides capabilities to the Downstream team (Customer). Upstream plans roadmaps accounting for Downstream needs, backed by automated consumer-driven contract tests (e.g., Pact).
4. **Conformist:** Downstream blindly adopts Upstream’s domain model and API schema without translation because Upstream has no incentive to accommodate Downstream (e.g., integrating with a rigid government tax API).
5. **Anti-Corruption Layer (ACL):** Downstream builds an explicit translation/adapter layer that converts Upstream’s external models into Downstream’s pristine Ubiquitous Language, protecting Downstream from external schema changes or legacy pollution.
6. **Open Host Service (OHS) & Published Language (PL):** Upstream exposes a well-documented, versioned public API protocol (**OHS**) using a standardized interchange schema (**PL**, such as OpenAPI, AsyncAPI, Avro, or Protobuf) to serve many Downstream consumers cleanly.
7. **Separate Ways:** Integration cost exceeds business value; two contexts decouple completely and solve their needs independently.

## 4. Tactical Design: Building Blocks Inside a Bounded Context
Apply rich tactical DDD patterns strictly inside **Core Domains** where complex business invariants must be enforced:

* **Entity:** An object defined by a continuous, immutable **Identity** across time and state transitions (e.g., `CustomerId`, `PolicyNumber`), rather than its attributes.
* **Value Object:** An immutable, side-effect-free object defined solely by its attributes with no identity (e.g., `Money(amount, currency)`, `DateRange`, `GPSCoordinate`). Replace primitive obsession (`string`, `float`) with self-validating Value Objects.
* **Aggregate & Aggregate Root:**
  * A transactional consistency boundary grouping related Entities and Value Objects.
  * **Aggregate Root:** The single entry-point Entity through which all external state mutations must pass. External objects may only hold references to the Aggregate Root’s global ID, never to internal child entities.
  * **Design Rules (Vaughn Vernon):** Model small Aggregates; enforce true business invariants within a single ACID transaction inside the Aggregate; update other Aggregates asynchronously via **Domain Events** (eventual consistency).
* **Domain Event:** An immutable record of a significant business fact that has already occurred in the domain, named in past tense (e.g., `InvoicePaid`, `LoanApplicationRejected`, `InventoryReserved`).
* **Domain Service:** Stateless operations expressing domain logic that naturally spans multiple Aggregates or does not belong to a single Entity/Value Object.
* **Repository:** An abstraction providing collection-like persistence semantics (`findById()`, `save()`) exclusively for **Aggregate Roots**, decoupling the domain layer from database infrastructure.
* **Application Service:** Thin orchestration layer that handles transaction management, security authorization, loading Aggregates via Repositories, invoking Domain methods, and publishing Domain Events—containing **zero business rules**.

## 5. End-to-End EventStorming Facilitation Protocol
EventStorming (invented by Alberto Brandolini) is a rapid, collaborative workshop technique bringing Business Analysts, Product Owners, Domain Experts, and Engineers together to model complex business processes visually.

### Color-Coded Notation Grammar (Strict Standard)
| Sticky Note Color | Domain Concept | Naming & Modeling Rule |
| :--- | :--- | :--- |
| **Orange** | **Domain Event** | Past-tense verb phrase representing a business fact (*"PaymentAuthorized"*, *"OrderCancelled"*). Arranged chronologically left-to-right. |
| **Blue** | **Command** | Imperative action triggered by an actor or policy (*"AuthorizePayment"*, *"CancelOrder"*). Placed immediately before the resulting Domain Event. |
| **Yellow (Small)** | **Actor / Persona** | Specific human or system role executing a Command (*"Claims Adjuster"*, *"Authenticated Buyer"*). |
| **Lilac / Purple** | **Policy / Reaction** | Automated business rule or reactive process (*"Whenever `PaymentAuthorized`, trigger `ReserveInventory`"*). Connects Events to subsequent Commands. |
| **Yellow (Large)** | **Aggregate** | The domain entity/state machine receiving the Command and emitting the Domain Event (*"ShoppingCart"*, *"InsuranceClaim"*). |
| **Green** | **Read Model / View** | Data projection or UI screen required by an Actor to make an informed decision before issuing a Command (*"Available Inventory Dashboard"*). |
| **Pink / Red** | **Hotspot / Risk** | Unresolved ambiguity, conflicting business rule, compliance bottleneck, or missing requirement flagged for immediate resolution. |
| **Grey / White** | **External System** | Third-party API, legacy mainframe, or external Bounded Context interacting with the flow (*"Stripe Payment Gateway"*). |

### Three Progressive Levels of EventStorming
1. **Level 1: Big Picture EventStorming (Enterprise / Programme Scope)**
   * **Goal:** Map an entire business line or value stream end-to-end in 2–4 hours.
   * **Steps:** Chaotic Exploration (dump all Orange Domain Events) -> Enforce the Timeline (chronological ordering + parallel branches) -> Reverse Narrative Walkthrough (validate flow end-to-end) -> Capture Pink Hotspots -> Identify Pivotal Events (major state transitions) -> Draw **Bounded Context** boundaries around cohesive clusters.
2. **Level 2: Process Modeling EventStorming (Business Analyst & PO Scope)**
   * **Goal:** Specify exact business rules, actor decisions, and automation workflows for a specific Bounded Context.
   * **Steps:** Apply the full grammar (`Actor` + `Read Model` -> `Command` -> `Aggregate` -> `Domain Event` -> `Policy` -> next `Command`) to eliminate every Pink Hotspot and produce concrete BDD scenarios.
3. **Level 3: Software Design EventStorming (Engineering & Architecture Scope)**
   * **Goal:** Translate validated Process Models directly into Aggregate boundaries, CQRS command/query handlers, Event-Driven microservice contracts (AsyncAPI), and database schemas.

## 6. Architectural Extensions: CQRS & Event Sourcing
* **CQRS (Command Query Responsibility Segregation):** Separate the write model (optimized for enforcing complex transactional invariants via Aggregates) from the read model (denormalized, fast query projections tailored to specific UI views and reporting).
* **Event Sourcing:** Persist the state of an Aggregate not as a mutable current-state row, but as an immutable, append-only sequence of **Domain Events**. Current state is derived by replaying events, providing complete auditability, temporal queries ("state as of Tuesday at 14:00"), and effortless event-driven integration. *Use selectively for Core Domains requiring high auditability or complex temporal workflows.*

## 7. Anti-Patterns Checklist for Agent Self-Audit
* **Anemic Domain Model:** Entities reduced to dumb getter/setter data bags while all business rules leak into bloated procedural Service classes.
* **God Aggregates:** Designing massive Aggregates (e.g., a `Customer` aggregate containing all `Orders`, `Invoices`, and `SupportTickets`) causing severe database lock contention and memory bloat.
* **CRUD-Driven Event Naming:** Naming Domain Events after technical database operations (`OrderUpdated`, `UserTableRowInserted`) instead of meaningful business facts (`ShippingAddressCorrected`, `CustomerTierUpgraded`).
* **Distributed Monolith via Synchronous Chaining:** Calling 5 microservices synchronously via REST to fulfill a single user request instead of choreographing asynchronous Domain Events across Bounded Contexts.
