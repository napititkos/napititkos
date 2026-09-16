'use client';
export async function fireConfetti() {
  const confettiModule = await import('canvas-confetti');
  const confetti = confettiModule.default;
  confetti({
    particleCount: 80,
    spread: 65,
    origin: { y: 0.6 },
    scalar: 0.9,
    ticks: 160,
  });
}
