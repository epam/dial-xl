class StateBox[T]:
    def __init__(self, initial: T, validated: bool):
        self._stored = initial
        self._validated = validated

    @property
    def validated(self) -> bool:
        return self._validated

    @property
    def stored(self) -> T:
        return self._stored

    def invalidate_with(self, item: T) -> T:
        self._stored = item
        self._validated = False

        return item

    def validate_with(self, item: T) -> T:
        self._stored = item
        self._validated = True

        return item
