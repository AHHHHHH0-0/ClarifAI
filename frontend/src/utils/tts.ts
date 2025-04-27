export function speak(text: string): void {
  if (!window.speechSynthesis) {
    console.warn("SpeechSynthesis not supported in this browser");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  // You can set voice, rate, pitch if desired
  window.speechSynthesis.speak(utterance);
}
