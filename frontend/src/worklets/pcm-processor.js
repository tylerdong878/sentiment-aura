class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    // inputs is [ [ Float32Array channel0, channel1, ... ] ]
    const input = inputs[0];
    if (input && input[0] && input[0].length) {
      // Send mono channel 0 to main thread
      this.port.postMessage(input[0]);
    }
    // Keep processor alive
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);


