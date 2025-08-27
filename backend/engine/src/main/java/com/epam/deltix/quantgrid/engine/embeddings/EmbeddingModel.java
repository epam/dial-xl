package com.epam.deltix.quantgrid.engine.embeddings;

import ai.djl.huggingface.tokenizers.Encoding;
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer;
import com.epam.deltix.quantgrid.engine.Util;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.intel.openvino.CompiledModel;
import org.intel.openvino.Core;
import org.intel.openvino.InferRequest;
import org.intel.openvino.Model;
import org.intel.openvino.Tensor;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;

/**
 * Source for bindings: https://github.com/kliamail/openvino_contrib/tree/releases/2025/1
 * OpenVINO version: 2025.1
 * Linux: https://storage.openvinotoolkit.org/repositories/openvino/packages/2025.1/linux/openvino_toolkit_ubuntu22_2025.1.0.18503.6fec06580ab_x86_64.tgz
 * Windows: https://storage.openvinotoolkit.org/repositories/openvino/packages/2025.1/windows/openvino_toolkit_windows_2025.1.0.18503.6fec06580ab_x86_64.zip
 * MacOS: https://storage.openvinotoolkit.org/repositories/openvino/packages/2025.1/macos/openvino_toolkit_macos_12_6_2025.1.0.18503.6fec06580ab_arm64.tgz
 */
@Slf4j
@RequiredArgsConstructor
public class EmbeddingModel {
    public static final int NUMBER_OF_DIMENSIONS = 384;
    public static final int BATCH_SIZE = 128;

    @Getter
    private final String name;
    private final CompiledModel model;
    private final HuggingFaceTokenizer tokenizer;

    public double[] predict(String[] inputs, Checker checker) {
        if (inputs.length == 0) {
            return new double[0];
        }

        String[] inputBatch = new String[BATCH_SIZE];
        double[] resultBatch = new double[inputBatch.length * NUMBER_OF_DIMENSIONS];
        double[] results = new double[inputs.length * NUMBER_OF_DIMENSIONS];
        int inputPosition = 0;
        int inputRemaining = inputs.length;
        int resultPosition = 0;
        while (inputRemaining >= inputBatch.length) {
            checker.check();
            System.arraycopy(inputs, inputPosition, inputBatch, 0, inputBatch.length);
            predict(inputBatch, resultBatch);
            System.arraycopy(resultBatch, 0, results, resultPosition, resultBatch.length);
            inputPosition += inputBatch.length;
            inputRemaining -= inputBatch.length;
            resultPosition += resultBatch.length;
        }
        if (inputRemaining > 0) {
            inputBatch = new String[inputRemaining];
            resultBatch = new double[inputBatch.length * NUMBER_OF_DIMENSIONS];
            System.arraycopy(inputs, inputPosition, inputBatch, 0, inputBatch.length);
            predict(inputBatch, resultBatch);
            System.arraycopy(resultBatch, 0, results, resultPosition, resultBatch.length);
        }

        return results;
    }

    private void predict(String[] inputs, double[] result) {
        Encoding[] encodings = tokenizer.batchEncode(inputs);
        Util.verify(encodings.length == inputs.length, "Unexpected number of encodings.");
        int length = encodings[0].getIds().length;
        long[] ids = new long[length * encodings.length];
        long[] attentionMask = new long[ids.length];
        for (int i = 0, position = 0; i < encodings.length; ++i) {
            Encoding encoding = encodings[i];
            Util.verify(encoding.getIds().length == length, "All inputs must have the same length.");
            System.arraycopy(encoding.getIds(), 0, ids, position, length);
            System.arraycopy(encoding.getAttentionMask(), 0, attentionMask, position, length);
            position += length;
        }
        int[] inShape = {encodings.length, length};
        InferRequest inferRequest = null;
        Tensor input = null;
        Tensor mask = null;
        Tensor output = null;
        try {
            input = new Tensor(inShape, ids);
            mask = new Tensor(inShape, attentionMask);
            inferRequest = model.create_infer_request();
            inferRequest.set_tensor("input_ids", input);
            inferRequest.set_tensor("attention_mask", mask);
            inferRequest.infer();

            output = inferRequest.get_tensor("sentence_embedding");
            int[] outShape = output.get_shape();
            Util.verify(outShape.length == 2, "Embeddings output shape must be 2D.");
            Util.verify(outShape[0] == encodings.length, "Embeddings output first dimension must match input length.");
            Util.verify(outShape[1] == NUMBER_OF_DIMENSIONS, "Unexpected embedding dimensions.");
            float[] data = output.data();
            Util.verify(data.length == result.length, "Unexpected result size.");
            for (int i = 0, position = 0; i < encodings.length; ++i) {
                normalize(data, result, position, position += NUMBER_OF_DIMENSIONS);
            }
        } finally {
            if (inferRequest != null) {
                inferRequest.release();
            }
            if (input != null) {
                input.release();
            }
            if (mask != null) {
                mask.release();
            }
            if (output != null) {
                output.release();
            }
        }
    }

    public static EmbeddingModel load(Path modelsFolder, String name, String executionModeHint) throws IOException {
        Core core = new Core();
        Path modelFolder = modelsFolder.resolve(name).toAbsolutePath();
        log.info("Loading embedding model {} from {}", name, modelFolder);
        Model model = core.read_model(modelFolder.resolve("openvino_model.xml").toString());
        HuggingFaceTokenizer tokenizer = HuggingFaceTokenizer.builder()
                .optTokenizerPath(modelFolder.resolve("tokenizer.json"))
                // Hardcoded setting for current models, should probably be read from tokenizer_config.json
                .optDoLowerCase(true)
                .build();
        CompiledModel compiledModel = core.compile_model(
                model,
                "CPU",
                // Control accuracy/performance: https://docs.openvino.ai/2025/openvino-workflow/running-inference/optimize-inference/precision-control.html
                Map.of("EXECUTION_MODE_HINT", executionModeHint));
        return new EmbeddingModel(name, compiledModel, tokenizer);
    }

    private static void normalize(float[] in, double[] out, int offset, int end) {
        double squareSum = 0.0;
        for (int i = offset; i < end; i++) {
            float value = in[i];
            squareSum += value * value;
        }

        double denom = Math.max(Math.sqrt(squareSum), 1e-12);

        for (int i = offset; i < end; i++) {
            out[i] = (float) (in[i] / denom);
        }
    }

    public interface Checker {
        void check();
    }
}
