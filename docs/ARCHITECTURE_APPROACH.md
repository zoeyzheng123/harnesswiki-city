# Architecture Approach: Hybrid Multi-Agent Generation Loop

This document outlines the architectural philosophy and execution strategy for the Harness Loop. It resolves the limitations of single-agent self-reflection by combining parallel creative search with sequential meta-learning.

## 1. The Core Philosophy: Why Multi-Agent?

A single, self-improving agent is sufficient for narrow tasks and linear optimization. However, generating viral short-form content is a **probabilistic search problem under uncertainty**. 

A single agent has four distinct weaknesses in this domain:
1.  **Weak Self-Evaluation:** Models tend to be overly generous toward their own outputs. Separating the generator from the judge provides objective, external friction.
2.  **Creative Convergence:** A single agent tends to fixate on its first framing. Parallel agents explore diverse creative hypotheses simultaneously.
3.  **Role Obfuscation:** Specialized roles (trend scout, generator, critic, meta-agent) operating on shared data contracts make the system inspectable and debuggable.
4.  **Sequential Slowness:** Parallel candidate generation allows the system to evaluate multiple distinct strategies in a single generation step, rapidly accelerating the "creative evolution" loop.

**The Hybrid Solution:** We employ a **Parallel Inner Loop** to explore multiple creative strategies concurrently, and a **Sequential Outer Loop** to distill winning patterns into system-wide policy updates.

---

## 2. System Architecture

The workflow moves from trend ingestion through parallel generation, objective evaluation, and finally meta-learning.

```mermaid
graph TD
    A[TrendContext] --> B[Trend Scout Agent]
    B --> C[Shared Creative Brief]
    
    subgraph Parallel Inner Loop (Generation)
        C --> D1[Pattern Interrupt Agent]
        C --> D2[Engagement Bait Agent]
        C --> D3[Audio-Anchor Agent]
        C --> D4[Hypnotic Loop Agent]
    end
    
    D1 --> E[Brand / Policy Critic<br/>(Auto-Fail Filter)]
    D2 --> E
    D3 --> E
    D4 --> E
    
    E --> F[Reward Critic Agent<br/>(ACOE Rubric Scoring)]
    
    F --> G[Winner Selection]
    G --> H[GenerationRecord]
    
    subgraph Sequential Outer Loop (Learning)
        H --> I[Meta-Agent]
        I --> J[HarnessState Update<br/>(Weights, Prompts, Policy)]
    end
    
    J -->|Drives Next Generation| C
```

---

## 3. The Parallel Inner Loop: Specialized Generators

Instead of asking one agent to write "a good script," we instantiate four specialized agents with distinct creative policies. These agents represent different algorithmic levers for short-form content.

| Agent Role | Optimization Target | ACOE Focus Area |
| :--- | :--- | :--- |
| **Pattern Interrupt Agent** | Optimizes for visual shock, heavy text overlays, and high-energy pacing. Uses the "But/So" script framework. | `hook_quality`, `visual_production` |
| **Engagement Bait Agent** | Focuses on polarizing questions, divisive takes, and forcing typed responses. | `engagement_bait` |
| **Audio-Anchor Agent** | Builds the script and visual pacing around specific beat drops and trending audio syncs. | `audio_alignment` |
| **Hypnotic Loop Agent** | Prioritizes visual continuity, minimal text, and seamless final-frame to first-frame matching. | `retention_and_loop` |

These agents independently consume the `TrendContext` and generate a `ContentConcept`.

---

## 4. The Evaluation Pipeline: The Critic

The evaluation pipeline applies the **ACOE-YT-SHORTS-v1.0** policy. It is a two-stage process that removes subjectivity.

### Stage 1: Brand / Policy Critic (The Bouncer)
This stage evaluates the four candidates strictly against the ACOE **Auto-Fail Conditions**.
*   *AF-01: Standing Start*
*   *AF-05: Brand Safety Violation* (Hate speech, explicit content)
*   *Result:* If a concept triggers an Auto-Fail, it is immediately discarded (Score = 0).

### Stage 2: Reward Critic (The Grader)
The surviving concepts are evaluated against the weighted ACOE categories (Hook Quality, Retention, Engagement, Visual Production, etc.).
*   *Output:* A detailed `RewardScore` including `category_breakdown` and `weighted_total`.
*   *Result:* The concept with the highest `weighted_total` is selected as the winner and enshrined in the `GenerationRecord`.

---

## 5. The Sequential Outer Loop: The Meta-Agent

This is where the system learns. The Meta-Agent analyzes the `GenerationRecord` (the winner, the losers, and the Critic's rationale) to update the `HarnessState` for the *next* generation.

**The Meta-Agent's Responsibilities:**
1.  **Analyze the Delta:** Why did the Engagement Bait agent win while the Hypnotic Loop agent lost? (e.g., "The winning concept successfully utilized a typed-response question.")
2.  **Update Element Weights:** Adjust generation biases (e.g., increase weight of `polarizing_question`, decrease weight of `seamless_loop`).
3.  **Refine Prompts:** Update the `script_prompt` shared by all agents. For example, if all agents failed the "Micro-Curiosity Gap" constraint, the Meta-Agent adds a strict rule: *"All payoff elements must be delayed until the final 15% of the video duration."*

**The Result:** Generation 2 begins with a smarter `HarnessState`. The four agents still pursue their specialized strategies, but they start from a higher, more sophisticated baseline.

---

## 6. Alignment with Constraints & Data Contracts

*   **13-15 Second Constraint:** The system strictly enforces a maximum 15-second duration across all agents. This aligns with generative video model capabilities (avoiding latent stitching) and forces optimization for >100% Average Percentage Viewed (APV) required for viral loops.
*   **Data Contract Integration:**
    *   `TrendContext`: The shared input.
    *   `ContentConcept[]`: The output of the parallel agents.
    *   `RewardScore[]`: The output of the Critic pipeline.
    *   `GenerationRecord`: The finalized row containing the winning concept and score.
    *   `HarnessState`: The mutable scaffold updated by the Meta-Agent.

---

## 7. The Demo Framing

This architecture allows for a highly visual, compelling demonstration of machine learning:

1.  **Generation 1:** Show four diverse concepts. The Critic ruthlessly rejects the boring or brand-unsafe ones. A flawed but engaging concept wins.
2.  **The Meta-Update:** Show the Meta-Agent explicitly identifying *why* it won (e.g., "Strong hook, but weak pacing") and updating the `HarnessState`.
3.  **Generation 5:** Show the new output. The agents are now producing razor-sharp, highly-optimized concepts that score 90+ on the ACOE rubric. The "creative evolution" is immediate and obvious.
