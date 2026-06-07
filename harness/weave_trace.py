"""
weave_trace.py — the project's single W&B Weave surface (the WeaveHacks gate).

`op` decorates the loop/critic functions; `init_weave()` turns tracing on. Both degrade to
no-ops when `weave` isn't installed, `WEAVE_DISABLE` is set, or there are no W&B credentials —
so the loop, the critic, and the tests run unchanged offline.

Enable live tracing:  pip install weave  &&  wandb login   (or set WANDB_API_KEY)
Project name:         WEAVE_PROJECT env  (default "sia-social-loop").
"""

from __future__ import annotations

import functools
import os

if os.getenv("WEAVE_DISABLE"):
    weave = None  # type: ignore
else:
    try:
        import weave  # type: ignore
    except Exception:  # pragma: no cover — weave is optional
        weave = None  # type: ignore

DEFAULT_PROJECT = "sia-social-loop"

_initialized = False


def op(fn=None, **op_kwargs):
    """Offline-safe dual-form Weave decorator, usable as ``@op`` or ``@op()``.

    Importing Weave's decorator directly can start client work before
    ``init_weave`` has established that tracing is usable. This wrapper only
    enters the traced callable after successful initialization; otherwise it
    executes the original function without contacting W&B.
    """
    if fn is None:
        return lambda wrapped: op(wrapped, **op_kwargs)
    if weave is None or os.getenv("WEAVE_DISABLE"):
        return fn

    traced = weave.op(fn, **op_kwargs)

    @functools.wraps(fn)
    def wrapped(*args, **kwargs):
        if os.getenv("WEAVE_DISABLE"):
            return fn(*args, **kwargs)
        if not _initialized:
            init_weave()
        if not _initialized:
            return fn(*args, **kwargs)
        return traced(*args, **kwargs)

    return wrapped


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
