// Sound utility for video call ringtones
// Uses Web Audio API to generate tones programmatically (no external files needed)

type SoundType = 'incoming' | 'outgoing' | 'connected' | 'ended' | 'error'

class SoundManager {
  private static instance: SoundManager
  private audioContext: AudioContext | null = null
  private currentOscillator: OscillatorNode | null = null
  private currentGain: GainNode | null = null
  private isPlaying = false
  private intervalId: NodeJS.Timeout | null = null

  private constructor() {}

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    const ctx = this.getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    
    // Envelope for smoother sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + duration - 0.05)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }

  // Incoming call ringtone - pleasant ascending pattern
  private playIncomingRingtone(): void {
    const pattern = [
      { freq: 440, duration: 0.15 },  // A4
      { freq: 554, duration: 0.15 },  // C#5
      { freq: 659, duration: 0.2 },   // E5
      { freq: 880, duration: 0.3 },   // A5
    ]
    
    let delay = 0
    pattern.forEach(({ freq, duration }) => {
      setTimeout(() => this.playTone(freq, duration, 'sine'), delay * 1000)
      delay += duration + 0.05
    })
  }

  // Outgoing call - ringing tone (like a phone)
  private playOutgoingRingtone(): void {
    // Standard ringback tone pattern: 440Hz + 480Hz for 2s, 4s silence
    const ctx = this.getAudioContext()
    
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.type = 'sine'
    osc2.type = 'sine'
    osc1.frequency.setValueAtTime(440, ctx.currentTime)
    osc2.frequency.setValueAtTime(480, ctx.currentTime)

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)

    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 1.5)
    osc2.stop(ctx.currentTime + 1.5)
  }

  // Connected sound - short confirmation beep
  private playConnectedSound(): void {
    this.playTone(880, 0.1, 'sine')
    setTimeout(() => this.playTone(1100, 0.15, 'sine'), 120)
  }

  // Ended sound - descending tone
  private playEndedSound(): void {
    this.playTone(600, 0.15, 'sine')
    setTimeout(() => this.playTone(400, 0.2, 'sine'), 180)
  }

  // Error sound - low warning tone
  private playErrorSound(): void {
    this.playTone(200, 0.15, 'square')
    setTimeout(() => this.playTone(150, 0.2, 'square'), 200)
  }

  public play(type: SoundType): void {
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume()
    }

    switch (type) {
      case 'incoming':
        this.playIncomingRingtone()
        break
      case 'outgoing':
        this.playOutgoingRingtone()
        break
      case 'connected':
        this.playConnectedSound()
        break
      case 'ended':
        this.playEndedSound()
        break
      case 'error':
        this.playErrorSound()
        break
    }
  }

  // Play ringtone in a loop (for incoming/outgoing calls)
  public startLoop(type: 'incoming' | 'outgoing'): void {
    if (this.isPlaying) return
    
    this.isPlaying = true
    this.play(type)
    
    // Repeat every 3 seconds for incoming, 4 seconds for outgoing
    const interval = type === 'incoming' ? 3000 : 4000
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.play(type)
      }
    }, interval)
  }

  public stopLoop(): void {
    this.isPlaying = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  public playOnce(type: SoundType): void {
    this.play(type)
  }
}

export const soundManager = SoundManager.getInstance()
export default soundManager
