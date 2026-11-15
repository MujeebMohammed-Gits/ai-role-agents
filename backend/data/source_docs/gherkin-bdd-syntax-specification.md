# Gherkin BDD (Given/When/Then) Syntax Specification
---
**RAG Metadata:**
* **Document ID:** `spec-gherkin-bdd-syntax-v1`
* **Target Agents:** Business Analyst Agent, Product Owner Agent, Scrum Master Agent, DevOps Engineer Agent, Site Reliability Engineer Agent
* **Domain:** Behaviour-Driven Development (BDD), Executable Specifications, Automated Acceptance Testing, Ubiquitous Language
* **Standards & Sources:** Cucumber Gherkin Reference Specification, Dan North (BDD), Gojko Adzic (Specification by Example), Matt Wynne (Example Mapping & The Cucumber Book)
---

## 1. Foundational Architecture & Purpose of Gherkin
**Gherkin** is a domain-specific, business-readable, line-oriented language created for **Behaviour-Driven Development (BDD)**. It serves a dual purpose:
1. **Living Documentation:** Acts as an unambiguous, plain-language specification of system behaviour co-created by the "Three Amigos" (Business/Product, Development, and Quality Engineering).
2. **Executable Automated Tests:** Parses directly into automated acceptance test suites (via Cucumber, SpecFlow, Reqnroll, Behave, Karate, or Playwright-BDD) without requiring business stakeholders to read imperative programming code.

### Core BDD Axioms
* **Outside-In Development:** Define external observable behaviour before designing internal software architecture.
* **Specification by Example (Gojko Adzic):** Replace abstract, ambiguous requirements with concrete, falsifiable boundary examples.
* **Declarative Over Imperative:** Describe *what* the system must accomplish in the business domain's **Ubiquitous Language**, never *how* a user clicks UI elements or queries database tables.

---

## 2. Structural Hierarchy & Lexical Grammar
A Gherkin document is saved with the `.feature` extension using UTF-8 encoding. Whitespace (spaces or tabs) is used for indentation, and line endings delimit statements.

```text
Feature File (.feature)
 ├── [Optional] @Tags
 ├── Feature: <Title & Business Narrative>
 │    ├── [Optional] Background: <Shared Preconditions>
 │    ├── [Optional] Rule: <Business Rule Grouping (Gherkin v6+)>
 │    │    ├── Scenario: <Concrete Example>
 │    │    │    ├── Given <Initial Context / Precondition>
 │    │    │    ├── When <Single Action / Domain Event>
 │    │    │    └── Then <Observable Outcome / Postcondition>
 │    │    └── Scenario Outline: <Parameterised Template>
 │    │         ├── Given / When / Then <with <parameter> placeholders>
 │    │         └── Examples: <Data Table of Boundary Cases>
```

---

## 3. Primary & Secondary Keywords Specification

### 3.1 Primary Structural Keywords
| Keyword | Cardinality | Formal Semantics & Usage Rules |
| :--- | :--- | :--- |
| **`Feature:`** | Exactly 1 per `.feature` file | Must be the first non-comment, non-tag primary keyword. Followed by a concise title and an optional multi-line free-text description (e.g., *In order to / As a / I want* narrative or business context) that is ignored by the test parser. |
| **`Rule:`** | 0 to Many per `Feature` | Introduced in Gherkin v6 to align with **Example Mapping**. Groups related `Scenario` and `Scenario Outline` blocks under a single explicit business constraint or policy. |
| **`Background:`** | 0 or 1 per `Feature` (or `Rule`) | Contains `Given` steps representing common setup preconditions executed *before every single scenario* in that scope. Keep strictly under 3–4 concise lines. |
| **`Scenario:`** (or `Example:`) | 1 to Many per `Feature`/`Rule` | Represents a single concrete business example illustrating a specific behaviour or edge case. Every scenario must be **100% independent** and stateless relative to other scenarios. |
| **`Scenario Outline:`** (or `Scenario Template:`) | 0 to Many per `Feature`/`Rule` | Parameterises a scenario template using `<angle_bracket>` placeholders. Must be accompanied by one or more `Examples:` tables; the parser generates one distinct test execution per table row. |
| **`Examples:`** (or `Scenarios:`) | 1 to Many per `Scenario Outline` | Defines a pipe-delimited (`|`) data matrix underneath a `Scenario Outline`. The first row specifies parameter headers; subsequent rows supply test inputs and expected outputs. Multiple `Examples:` blocks can be tagged separately (e.g., `@happy-path`, `@boundary-errors`). |

### 3.2 Step Keywords (The Given-When-Then Triad)
From a parser execution perspective, `Given`, `When`, `Then`, `And`, and `But` are functionally identical step matchers, but semantically they enforce strict **Arrange-Act-Assert** discipline:

1. **`Given` (Context / Arrange):**
   * Establishes the known initial state of the system before the user or external actor interacts with it.
   * Written in **past tense** or **present state** (e.g., *"Given an active corporate account with a £5,000 credit limit"*).
   * Must never perform UI navigation or trigger the primary business action under test.
2. **`When` (Action / Act):**
   * Describes the single key business event, command, or user action that triggers state transition.
   * Written in **present tense** (e.g., *"When the account holder submits a payment transfer of £5,200"*).
   * **Strict Cardinality Rule:** A well-formed scenario has **one logical `When`**. Multiple `When` blocks indicate multiple behaviours bundled together that must be split into separate scenarios.
3. **`Then` (Outcome / Assert):**
   * Asserts the observable business outcome, state mutation, emitted domain event, or error message.
   * Written in **present/future modal tense** using *"should"* or present indicative (e.g., *"Then the transfer is rejected with reason 'CREDIT_LIMIT_EXCEEDED'"*).
   * Must verify business-observable results, not internal private database column IDs or transient CSS classes.
4. **`And` / `But` (Conjunctions):**
   * Used to chain multiple preconditions (`Given ... And ...`), compound assertions (`Then ... And ... But ...`), or negative exclusions without repeating the parent keyword.
5. **`*` (Bullet Step):**
   * Replaces `Given`/`When`/`Then` with an asterisk (`*`) when expressing unordered lists of preconditions or assertions where sequential keyword repetition harms readability.

---

## 4. Advanced Data Structures: Data Tables, Doc Strings & Tags

### 4.1 Step Data Tables (Multi-Row Tabular Arguments)
Attached directly beneath a single step using pipe delimiters (`|`) to pass structured records, key-value configurations, or expected collection states without repeating steps:

```gherkin
  Given the following customer portfolio holdings exist:
    | ticker | asset_class | quantity | unit_price_gbp |
    | VUSA   | Equity ETF  | 150      | 82.40          |
    | GILTS  | Fixed Income| 500      | 10.15          |
```
* **Formatting Rules:** Pipes must be aligned for human readability. Escaping literal pipes requires `\|`, newlines require `\n`, and backslashes require `\\`.

### 4.2 Doc Strings (Multi-Line Payload Arguments)
Delimited by triple double-quotes (`"""`) or triple backticks (```` ``` ````) directly beneath a step. Used for large text blocks, JSON/XML API payloads, Markdown templates, or SQL/regulatory clauses, with optional media-type annotations:

```gherkin
  When the payment gateway posts the webhook payload:
    """json
    {
      "event_id": "evt_982341",
      "type": "settlement.failed",
      "amount_minor": 45000,
      "currency": "GBP"
    }
    """
```

### 4.3 Tags (`@tag`) & Execution Filtering
Tags are `@`-prefixed annotations placed directly above `Feature`, `Rule`, `Scenario`, `Scenario Outline`, or `Examples` blocks.
* **Inheritance:** Tags declared at the `Feature` level inherit down to all child `Rule` and `Scenario` elements. Tags on a `Scenario Outline` apply to all its `Examples` tables, while tags on a specific `Examples` table apply only to that table's rows.
* **Boolean Tag Expressions:** CI/CD pipelines filter test suites using logical operators:
  * `cucumber --tags "@smoke and not @wip"`
  * `cucumber --tags "(@regulatory or @payments) and not @slow"`
* **Standard Enterprise Tag Taxonomy:**
  * **Lifecycle:** `@wip` (Work in Progress), `@draft`, `@manual`, `@deprecated`
  * **Pipeline Tier:** `@smoke`, `@regression`, `@contract`, `@e2e`
  * **Domain & Compliance:** `@pci-dss`, `@gdpr`, `@audit-trail`, `@iso20022`

### 4.4 Comments & Internationalisation (`# language:`)
* **Comments:** Any line beginning with `#` (after optional leading whitespace) is a comment. Inline comments at the end of a step line are **not** valid in Gherkin and will be parsed as part of the step string.
* **Localisation:** Gherkin supports 70+ spoken languages. Placing `# language: fr` or `# language: de` on **Line 1** of the `.feature` file instructs the lexer to parse localized keywords (e.g., `Fonctionnalité:`, `Scénario:`, `Étant donné`, `Quand`, `Alors`).

---

## 5. Principal-Level Quality Standards: Declarative vs. Imperative

### 5.1 Anti-Pattern: Imperative UI-Coupled Gherkin (Reject)
Imperative scenarios couple specifications to brittle DOM/UI mechanics, destroy domain clarity, and break whenever a button label or CSS selector changes:

```gherkin
# ANTI-PATTERN: Imperative, UI-coupled, brittle, unreadable by business stakeholders
Scenario: User tries to transfer more than balance
  Given I open Chrome and navigate to "https://bank.example.com/login"
  And I type "alice@example.com" into the "#email-input" field
  And I type "P@ssw0rd123" into the "#password-input" field
  And I click the "#submit-btn" button
  When I click on the "Transfers" tab in the top navbar
  And I select "Current Account (GB29...)" from the "#from-account" dropdown
  And I enter "1500.00" into "#amount-field"
  And I click "Confirm Transfer"
  Then I should see a red banner with class ".alert-danger" saying "Insufficient funds"
```

### 5.2 Gold Standard: Declarative Domain-Centric Gherkin (Enforce)
Declarative scenarios express pure business intent using **Ubiquitous Language**, delegating UI/API interaction mechanics exclusively to the Step Definition / Screenplay automation layer:

```gherkin
# language: en
@payments @risk-controls @iso20022
Feature: Outbound Faster Payments Overdraft & Balance Enforcement
  As a Retail Banking Risk Officer
  I want outbound transfers exceeding available cleared funds to be blocked
  So that customers do not incur unauthorized overdraft exposure

  Background:
    Given retail customer "Alice" holds an active current account with cleared balance £1,000.00
    And the account has no arranged overdraft facility

  Rule: Outbound transfers must not exceed available cleared funds

    Scenario: Block transfer exceeding cleared balance
      When Alice initiates a Faster Payment of £1,500.00 to an external payee
      Then the payment instruction is rejected with error code "INSUFFICIENT_FUNDS"
      And Alice's current account cleared balance remains £1,000.00
      And an immutable risk audit event is recorded for the declined instruction

    Scenario Outline: Boundary evaluation around available cleared balance
      Given Alice has pending outbound holds totalling <pending_holds>
      When Alice initiates a Faster Payment of <transfer_amount> to an external payee
      Then the payment instruction status is "<expected_status>"
      And the resulting available balance is <resulting_balance>

      @happy-path
      Examples: Valid transfers within available balance
        | pending_holds | transfer_amount | expected_status | resulting_balance |
        | £0.00         | £1,000.00       | ACCEPTED        | £0.00             |
        | £200.00       | £800.00         | ACCEPTED        | £0.00             |

      @boundary-errors
      Examples: Invalid transfers exceeding available balance
        | pending_holds | transfer_amount | expected_status | resulting_balance |
        | £0.00         | £1,000.01       | REJECTED        | £1,000.00         |
        | £200.00       | £800.01         | REJECTED        | £800.00           |
```

---

## 6. Three Amigos & Example Mapping Integration Protocol
Gherkin files must never be written in isolation by a single Business Analyst or QA Engineer. Enforce the **Example Mapping (Matt Wynne)** pre-refinement protocol:

1. **Yellow Card (Story):** Place the User Story or Product Backlog Item at the top.
2. **Blue Cards (Rules):** Extract every distinct business rule or acceptance constraint. Each Blue Card maps directly to a Gherkin `Rule:` block.
3. **Green Cards (Examples):** Under each Blue Card, write concrete real-world examples (happy path, boundary conditions, null/empty states, concurrency collisions). Each Green Card maps directly to a Gherkin `Scenario:` or row in an `Examples:` table.
4. **Red Cards (Questions/Assumptions):** Capture unresolved ambiguities on Red Cards. If a story accumulates excessive Red Cards, halt refinement and return it to the Product Owner before writing Gherkin.
5. **25-Minute Rule:** If an Example Mapping session exceeds 25 minutes or produces >6 Blue Cards, slice the story vertically using **SPIDR** before authoring `.feature` files.

---

## 7. Gherkin Authoring Checklist & Anti-Patterns to Reject

### Pre-Commit Quality Gates (CI Linter Rules via `gherkin-lint`)
* **Single `When` Per Scenario:** Reject scenarios with interleaved `Given -> When -> Then -> When -> Then` chains (testing multi-step user journeys as a single monolithic scenario instead of atomic behavioural specifications).
* **No First-Person Pronouns (`I` / `My`):** Prefer third-person role nouns (*"Given a verified merchant..."*, *"When the compliance officer approves..."*) over *"Given I am logged in"* so actor permissions and personas remain explicit.
* **No Magic Numbers:** Every numeric value in a `When` or `Then` step must trace clearly to a `Given` setup step or domain rule (e.g., explain *why* £1,000.01 fails by establishing the £1,000.00 balance in `Given`).
* **Zero Implementation Leakage:** Ban SQL queries, HTTP status codes (unless writing an explicit REST API contract feature), XPath/CSS selectors, and internal microservice names from business feature files.
* **Test Data Isolation:** Never rely on pre-seeded shared staging databases; each scenario must provision its own deterministic state in `Given` and clean up or isolate transactions automatically.
