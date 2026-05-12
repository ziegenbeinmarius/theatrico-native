import ExpoModulesCore
import Speech
import AVFoundation

public class NativeSpeechModule: Module {
  private var audioEngine = AVAudioEngine()
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var recognizer: SFSpeechRecognizer?
  private var sessionStartTime: Date?
  // SFSpeechRecognizer enforces a ~60s per-task limit; reset at 50s to stay within it.
  private let sessionResetInterval: TimeInterval = 50
  private var resetTimer: Timer?
  private var currentLanguage: String = "en-US"
  private var currentContextHint: String = ""
  private var isRecognizing = false

  public func definition() -> ModuleDefinition {
    Name("NativeSpeech")

    Events("onResult", "onError")

    AsyncFunction("requestPermissionsAsync") { () -> Bool in
      return await withCheckedContinuation { continuation in
        SFSpeechRecognizer.requestAuthorization { status in
          AVCaptureDevice.requestAccess(for: .audio) { micGranted in
            continuation.resume(returning: status == .authorized && micGranted)
          }
        }
      }
    }

    AsyncFunction("startRecognition") { (language: String, contextHint: String) in
      self.currentLanguage = language.isEmpty ? "en-US" : language
      self.currentContextHint = contextHint
      try await self.startSession()
    }

    AsyncFunction("stopRecognition") {
      self.stopSession()
    }
  }

  private func startSession() async throws {
    stopSession()

    let locale = Locale(identifier: currentLanguage)
    recognizer = SFSpeechRecognizer(locale: locale) ?? SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    guard let recognizer, recognizer.isAvailable else {
      throw NSError(domain: "NativeSpeech", code: 1, userInfo: [NSLocalizedDescriptionKey: "Speech recognizer unavailable for locale \(currentLanguage)"])
    }

    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true
    if !currentContextHint.isEmpty {
      request.contextualStrings = [currentContextHint]
    }
    recognitionRequest = request

    recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self else { return }

      if let error {
        self.sendEvent("onError", ["code": "recognition_error", "message": error.localizedDescription])
        return
      }

      if let result {
        let confidence = result.bestTranscription.segments.last.map { Double($0.confidence) } ?? 0
        self.sendEvent("onResult", [
          "text": result.bestTranscription.formattedString,
          "isFinal": result.isFinal,
          "confidence": confidence,
        ])
      }
    }

    let inputNode = audioEngine.inputNode
    let format = inputNode.outputFormat(forBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      self?.recognitionRequest?.append(buffer)
    }

    audioEngine.prepare()
    try audioEngine.start()

    isRecognizing = true
    sessionStartTime = Date()

    // Schedule auto-reset to avoid the ~60s session limit
    resetTimer = Timer.scheduledTimer(withTimeInterval: sessionResetInterval, repeats: true) { [weak self] _ in
      self?.resetRecognitionTask()
    }
  }

  private func resetRecognitionTask() {
    guard isRecognizing else { return }

    // End current task and start a new one without stopping audio engine
    recognitionTask?.finish()
    recognitionTask = nil
    recognitionRequest?.endAudio()

    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true
    if !currentContextHint.isEmpty {
      request.contextualStrings = [currentContextHint]
    }
    recognitionRequest = request

    guard let recognizer else { return }
    recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self else { return }

      if let error {
        self.sendEvent("onError", ["code": "recognition_error", "message": error.localizedDescription])
        return
      }

      if let result {
        let confidence = result.bestTranscription.segments.last.map { Double($0.confidence) } ?? 0
        self.sendEvent("onResult", [
          "text": result.bestTranscription.formattedString,
          "isFinal": result.isFinal,
          "confidence": confidence,
        ])
      }
    }
  }

  private func stopSession() {
    resetTimer?.invalidate()
    resetTimer = nil
    isRecognizing = false

    recognitionTask?.cancel()
    recognitionTask = nil
    recognitionRequest?.endAudio()
    recognitionRequest = nil

    if audioEngine.isRunning {
      audioEngine.stop()
      audioEngine.inputNode.removeTap(onBus: 0)
    }

    recognizer = nil
    sessionStartTime = nil
  }
}
