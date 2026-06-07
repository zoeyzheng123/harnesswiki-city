# 3-Minute Demo Script

Owner of *what matters for the hackathon*. Rehearse against this, not the
codebase. Owned by Eng 4 (Demo Narrator). The beats follow the harness climbing
ACOE's tiers: generate → score → fix the ceiling → go viral.

## 0:00–0:20 — Problem

AI content tools generate assets, but they don't learn the operating system
behind a *viral* video. Nothing gets smarter between uploads.

## 0:20–0:50 — Show the City

This control room is our content-agent harness for AI YouTube Shorts dance
videos. Each district is a role: Trend Scout, Content Generator, Reward Critic,
Meta-Agent (see `docs/AGENT_ROLES.md`).

## 0:50–1:30 — Run the Loop

Trend + a rising track in. A dance Short is generated — peak motion in frame 1,
stark background, a seamless loop, comment bait on screen. The Reward Critic
scores it with **ACOE-YT-SHORTS-v2.0**: total **76 → Growing**, with a full
category breakdown. (One pass of `docs/HARNESS_LOOP.md`.)

## 1:30–2:10 — Improvement (the ceiling, then the climb)

The breakdown shows the ceiling: `engagement_bait` at 5/10 — the comment-bait
question was too easy to answer with an emoji. The meta-agent rewrites the harness
(raise `comment_bait_question` + `polarizing_angle`, demand a typed-answer
question). Next generation: `engagement_bait` jumps, the total crosses **85 →
Viral**. The score curve and element weights tell the whole story. (If a
generation trips an **auto-fail** — e.g. a static frame 1 — it's scored 0 and
regenerated, on screen.)

## 2:10–2:35 — Weave

Open the pre-saved trace links from `docs/WEAVE_TRACING.md`: the generation loop
and the ACOE critic, with `category_breakdown`, `harness_diff`, and the
living-memory `lesson` logged.

## 2:35–3:00 — Close

HarnessWiki City turns trend signals and a concrete reward policy into living
memory for a self-improving content team. Not one video — an operating system
that learns its way from Seed-Jail to Viral.
