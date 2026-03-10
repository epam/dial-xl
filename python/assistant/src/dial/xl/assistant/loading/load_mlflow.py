import mlflow

from public import public

from dial.xl.assistant.config.mlflow_config import MLFlowConfig


@public
def load_mlflow(mlflow_config: MLFlowConfig) -> None:
    if not mlflow_config.enabled:
        mlflow.tracing.disable()
        return

    assert mlflow_config.url is not None
    mlflow.set_tracking_uri(mlflow_config.url)

    assert mlflow_config.experiment is not None
    mlflow.set_experiment(mlflow_config.experiment)

    mlflow.langchain.autolog()
    mlflow.openai.autolog()
