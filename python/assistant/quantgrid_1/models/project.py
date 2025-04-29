from dial_xl.project import Project as BaseProject


class Project(BaseProject):
    original_name: str

    def __init__(self, original_name, *args, **kargs):
        BaseProject.__init__(self, *args, **kargs)

        self.original_name = original_name
