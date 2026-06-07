"""
weave_trace.py — the project's single W&B Weave surface (the WeaveHacks gate).

`op` decorates the loop/critic functions; `init_weave()` turns tracing on. Both degrade to
no-ops when `weave` isn't installed, `WEAVE_DISABLE` is set, or there are no W&B credentials —
so the loop, the critic, and the tests run unchanged offline.

Enable live tracing:  pip install weave  &&  wandb login   (or set WANDB_API_KEY)
Project name:         WEAVE_PROJECT env  (default "sia-social-loop").
"""

from __future__ import annotations

import os

try:
    import weave  # type: ignore
except Exception:  # pragma: no cover — weave is optional
    weave = None  # type: ignore

DEFAULT_PROJECT = "sia-social-loop"

if weave is not None:
    op = weave.op  # weave.op supports both @op and @op()
else:
    def op(fn=None, **_):  # dual-form identity decorator — usable as @op or @op()
        return (lambda f: f) if fn is None else fn

_initialized = False


def init_weave(project: str | None = None) -> bool:
    """Initialize Weave once; return True if tracing is active, else False (graceful).

    No-op (returns False) when `weave` is unavailable, `WEAVE_DISABLE` is set, or init fails
    (e.g. no `WANDB_API_KEY` / not logged in) — never crashes the run. Idempotent and safe to
    call from any entry point (the loop's `__main__`, `score_concept`, a demo, …).
    """
    global _initialized
    if _initialized:
        return True
    if weave is None or os.getenv("WEAVE_DISABLE"):
        return False
    name = project or os.getenv("WEAVE_PROJECT") or DEFAULT_PROJECT
    try:
        weave.init(name)
        _initialized = True
    except Exception as exc:  # pragma: no cover — depends on creds/network
        print(f"[weave] tracing disabled ({exc})")
    return _initialized


def is_active() -> bool:
    """True once Weave has been successfully initialized this process."""
    return _initialized
