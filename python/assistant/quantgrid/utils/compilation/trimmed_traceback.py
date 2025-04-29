def with_trimmed_traceback[E: Exception](exc: E, frames: int = 1) -> E:
    for _ in range(frames):
        if exc.__traceback__ is None:
            break

        exc.__traceback__ = exc.__traceback__.tb_next

    return exc
